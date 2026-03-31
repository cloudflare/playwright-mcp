import { env } from 'cloudflare:workers';

import { createMcpAgent } from '@cloudflare/playwright-mcp';

export const PlaywrightMCP = createMcpAgent(env.BROWSER);

// ---------------------------------------------------------------------------
// Screenshot download store
// ---------------------------------------------------------------------------
// When MCP screenshot tools return base64 image data over SSE, the data is
// extracted into this in-memory store and replaced with a download URL.
// This allows clients that cannot handle inline images (CLI tools, TUI apps)
// to download screenshots via a simple HTTP GET.
const IMAGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const imageStore = new Map<string, { data: string; mimeType: string; created: number }>();

function cleanExpiredImages() {
  const now = Date.now();
  for (const [key, entry] of imageStore) {
    if (now - entry.created > IMAGE_TTL_MS) {
      imageStore.delete(key);
    }
  }
}

function generateHash(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// SSE stream interceptor with keepalive
// ---------------------------------------------------------------------------
// Wraps the SSE ReadableStream, parsing each event. When a JSON-RPC response
// contains image content (from browser_take_screenshot), extracts the base64
// data into imageStore and replaces it with a download URL.
//
// Also injects SSE keepalive comments (`: keepalive`) every 15 s to prevent
// Cloudflare's proxy layer from dropping idle SSE connections (~60-90 s).
// The returned `done` promise should be passed to `ctx.waitUntil()` so the
// Worker execution context stays alive long enough for the timer to fire.
// ---------------------------------------------------------------------------
const SSE_KEEPALIVE_INTERVAL_MS = 15_000;

function createImageInterceptingStream(
  body: ReadableStream<Uint8Array>,
  baseUrl: string,
): { stream: ReadableStream<Uint8Array>; done: Promise<void> } {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const keepaliveBytes = encoder.encode(': keepalive\n\n');
  let buffer = '';
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  let resolveDone: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });

  function cleanup() {
    cancelled = true;
    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
    resolveDone();
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      reader = body.getReader();

      // SSE comments (`:` prefix) are ignored by all compliant clients.
      keepaliveTimer = setInterval(() => {
        if (!cancelled) {
          try {
            controller.enqueue(keepaliveBytes);
          } catch {
            cleanup();
          }
        }
      }, SSE_KEEPALIVE_INTERVAL_MS);

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let delimIdx: number;
            while ((delimIdx = buffer.indexOf('\n\n')) !== -1) {
              const rawEvent = buffer.slice(0, delimIdx + 2);
              buffer = buffer.slice(delimIdx + 2);

              const intercepted = interceptImageEvent(rawEvent, baseUrl);
              controller.enqueue(encoder.encode(intercepted));
            }
          }

          if (buffer.length > 0) {
            controller.enqueue(encoder.encode(buffer));
            buffer = '';
          }
          controller.close();
        } catch (err) {
          if (!cancelled) controller.error(err);
        } finally {
          cleanup();
        }
      })();
    },

    cancel() {
      cleanup();
      reader?.cancel().catch(() => {});
    },
  });

  return { stream, done };
}

function interceptImageEvent(rawEvent: string, baseUrl: string): string {
  if (!rawEvent.startsWith('event: message\n')) {
    return rawEvent;
  }

  const dataPrefix = 'data: ';
  const lines = rawEvent.split('\n');
  const dataLineIdx = lines.findIndex(l => l.startsWith(dataPrefix));
  if (dataLineIdx === -1) return rawEvent;

  const jsonStr = lines[dataLineIdx].slice(dataPrefix.length);
  let msg: any;
  try {
    msg = JSON.parse(jsonStr);
  } catch {
    return rawEvent;
  }

  // JSON-RPC responses with result.content containing image items
  if (!msg?.result?.content || !Array.isArray(msg.result.content)) {
    return rawEvent;
  }

  let modified = false;
  const downloadUrls: string[] = [];

  for (let i = 0; i < msg.result.content.length; i++) {
    const item = msg.result.content[i];
    if (item.type === 'image' && item.data && item.mimeType) {
      cleanExpiredImages();
      const hash = generateHash();
      imageStore.set(hash, {
        data: item.data,
        mimeType: item.mimeType,
        created: Date.now(),
      });

      const downloadUrl = `${baseUrl}/download/${hash}`;
      downloadUrls.push(downloadUrl);

      // Replace large base64 data with a download URL reference
      msg.result.content[i] = {
        type: 'text',
        text: `[Screenshot captured - download: ${downloadUrl}]`,
      };
      modified = true;
    }
  }

  if (modified && downloadUrls.length > 0) {
    const urlList = downloadUrls.map((u, i) =>
      downloadUrls.length === 1
        ? `\n\nScreenshot download URL: ${u}`
        : `\n\nScreenshot ${i + 1} download URL: ${u}`
    ).join('');

    for (let i = msg.result.content.length - 1; i >= 0; i--) {
      if (msg.result.content[i].type === 'text' && !msg.result.content[i].text.startsWith('[Screenshot captured')) {
        msg.result.content[i].text += urlList;
        break;
      }
    }
  }

  if (!modified) return rawEvent;

  lines[dataLineIdx] = dataPrefix + JSON.stringify(msg);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
// Optional Bearer token authentication. Set the MCP_AUTH_TOKEN secret via
// `wrangler secret put MCP_AUTH_TOKEN` to enable. If not set, all routes
// are publicly accessible (matching the upstream default behavior).
// ---------------------------------------------------------------------------
function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Bearer' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Worker fetch handler
// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Optional auth: if MCP_AUTH_TOKEN is configured, require Bearer token
    if (env.MCP_AUTH_TOKEN) {
      const authHeader = request.headers.get('Authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token || !timingSafeEqual(token, env.MCP_AUTH_TOKEN)) {
        return unauthorized();
      }
    }

    const url = new URL(request.url);
    const { pathname } = url;
    const baseUrl = `${url.protocol}//${url.host}`;

    // /download/<hash> — one-time download of a captured screenshot
    if (pathname.startsWith('/download/')) {
      const hash = pathname.slice('/download/'.length);
      if (!hash) {
        return new Response(JSON.stringify({ error: 'Missing hash' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }

      cleanExpiredImages();
      const entry = imageStore.get(hash);
      if (!entry) {
        return new Response(JSON.stringify({ error: 'Screenshot not found or expired' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }

      // Decode base64 to binary
      const binaryStr = atob(entry.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // One-time download: remove after serving
      imageStore.delete(hash);

      const ext = entry.mimeType === 'image/jpeg' ? 'jpg' : 'png';
      return new Response(bytes, {
        headers: {
          'content-type': entry.mimeType,
          'content-disposition': `attachment; filename="screenshot.${ext}"`,
        },
      });
    }

    switch (pathname) {
      case '/sse':
      case '/sse/message': {
        // Wrap the SSE stream to intercept screenshot images and make
        // them downloadable via /download/<hash>
        const sseResponse = await PlaywrightMCP.serveSSE('/sse').fetch(request, env, ctx);

        // Only wrap GET /sse (the long-lived SSE stream), not POST /sse/message
        if (request.method !== 'GET' || !sseResponse.body) return sseResponse;

        const { stream: interceptedBody, done } = createImageInterceptingStream(sseResponse.body, baseUrl);

        // Keep the Worker execution context alive so keepalive timers
        // continue to fire for the lifetime of the SSE connection.
        ctx.waitUntil(done);

        return new Response(interceptedBody, {
          status: sseResponse.status,
          statusText: sseResponse.statusText,
          headers: sseResponse.headers,
        });
      }
      case '/mcp':
        return PlaywrightMCP.serve('/mcp').fetch(request, env, ctx);
      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};
