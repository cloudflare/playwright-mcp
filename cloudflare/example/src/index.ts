import { env } from 'cloudflare:workers';

import { createMcpAgent } from '@cloudflare/playwright-mcp';
import { createToolsProvider } from '@cloudflare/playwright-mcp/experimental';
import { generateText } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';

export const PlaywrightMCP = createMcpAgent(env.BROWSER);

async function handleAi(env: Env, searchParams: URLSearchParams) {
  const workersai = createWorkersAI({ binding: env.AI });
  const toolsProvider = await createToolsProvider(env.BROWSER);
  const prompt = searchParams.get('q') || 'navigate to https://news.ycombinator.com/ and list the top 5 stories';
  const content = await generateText({
    // @ts-expect-error
    model: workersai(searchParams.get('model') ?? '@cf/meta/llama-4-scout-17b-16e-instruct'),
    tools: toolsProvider.tools(),
    maxSteps: 5,
    prompt,
  });
  return new Response([
    `You asked: ${prompt}`,
    '',
    content.text
  ].join('\n'), {
    headers: { 'Content-Type': 'text/plain' },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const { pathname, searchParams }  = new URL(request.url);

    switch (pathname) {
      case '/sse':
      case '/sse/message':
        return await PlaywrightMCP.serveSSE('/sse').fetch(request, env, ctx);
      case '/mcp':
        return await PlaywrightMCP.serve('/mcp').fetch(request, env, ctx);
      case '/ai':
        return await handleAi(env, searchParams);
      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};
