import { env } from 'cloudflare:workers';

import { createMcpAgent } from '@cloudflare/playwright-mcp';

export const PlaywrightMCP = createMcpAgent(env.BROWSER);

export default PlaywrightMCP.mount('/sse');
