/**
 * Intercept MCP SSE responses and upload screenshots/PDFs to R2.
 */

import type { R2Bucket } from '@cloudflare/workers-types';

type R2Config = {
  bucket: R2Bucket;
  keyPrefix?: string;
  publicUrlBase?: string;
  returnMode?: 'url' | 'url+inline' | 'inline';
};

function generateArtifactFilename(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${baseName}-${timestamp}.${extension}`;
}

/**
 * Wrap MCP response to intercept and process artifacts via R2.
 */
export async function interceptMcpResponse(
  response: Response,
  r2Config: R2Config
): Promise<Response> {
  if (!response.body)
    return response;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  void (async () => {
    try {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const json = JSON.parse(data);

              // Check if this is a tool call result with image content
              if (json.result?.content)
                json.result.content = await processContent(json.result.content, r2Config);

              await writer.write(encoder.encode(`data: ${JSON.stringify(json)}\n`));
            } catch {
              // Not JSON or parse error, pass through
              await writer.write(encoder.encode(line + '\n'));
            }
          } else {
            await writer.write(encoder.encode(line + '\n'));
          }
        }
      }

      // Finalize decoder to flush any incomplete UTF-8 sequences
      buffer += decoder.decode();

      if (buffer)
        await writer.write(encoder.encode(buffer + '\n'));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[R2 Middleware] Error:', error);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: response.headers,
    status: response.status,
  });
}

async function processContent(content: any[], r2Config: R2Config): Promise<any[]> {
  const returnMode = r2Config.returnMode ?? 'url';
  const newContent: any[] = [];

  for (const item of content) {
    if (item.type === 'image') {
      // If returnMode is 'inline', skip R2 upload and just pass through the image
      if (returnMode === 'inline') {
        newContent.push(item);
        continue;
      }

      try {
        // Upload to R2 - decode base64 to Uint8Array
        const binaryString = atob(item.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
          bytes[i] = binaryString.charCodeAt(i);

        const extension = item.mimeType === 'image/png' ? 'png' : 'jpeg';
        const filename = generateArtifactFilename('screenshot', extension);

        const prefix = r2Config.keyPrefix ?? '';
        const key = `${prefix}${filename}`;

        await r2Config.bucket.put(key, bytes, {
          httpMetadata: { contentType: item.mimeType },
        });

        const url = r2Config.publicUrlBase
          ? `${r2Config.publicUrlBase.replace(/\/$/, '')}/${key}`
          : `R2 key: ${key}`;

        // Add URL to content
        newContent.push({
          type: 'text',
          text: url,
        });

        // Include inline image if returnMode is 'url+inline'
        if (returnMode === 'url+inline')
          newContent.push(item);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[R2] Upload failed:', error);
        // On error, include the original image
        newContent.push(item);
      }
    } else {
      // Pass through non-image content
      newContent.push(item);
    }
  }

  return newContent;
}
