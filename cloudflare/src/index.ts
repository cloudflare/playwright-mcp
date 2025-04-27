import { McpAgent } from 'agents/mcp';
import { env } from 'cloudflare:workers';

import type { BrowserEndpoint } from '@cloudflare/playwright';

import { endpointURLString } from '@cloudflare/playwright';
import { createServer } from '../../src';
import { ToolCapability } from '../../src/tools/tool';

type Options = {
  vision?: boolean;
  capabilities?: ToolCapability[];
};

export function createMcpAgent(endpoint: BrowserEndpoint, options?: Options): typeof McpAgent<typeof env, {}, {}> {
  const cdpEndpoint = typeof endpoint === 'string'
    ? endpoint
    : endpoint instanceof URL
      ? endpoint.toString()
      : endpointURLString(endpoint);

  const serverPromise = createServer({
    browser: 'chromium',
    userDataDir: '/playwright/user-data',
    headless: true,
    cdpEndpoint,
    capabilities: ['core', 'tabs', 'pdf', 'history', 'wait', 'files'],
    ...options,
  });

  return class PlaywrightMcpAgent extends McpAgent<typeof env, {}, {}> {
    server = serverPromise;

    async init() {
      // do nothing
    }
  };
}
