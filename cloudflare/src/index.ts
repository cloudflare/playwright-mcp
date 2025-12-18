import { McpAgent } from 'agents/mcp';
import { env } from 'cloudflare:workers';

import type { BrowserEndpoint } from '@cloudflare/playwright';
import type { R2Bucket } from '@cloudflare/workers-types';

import { endpointURLString } from '@cloudflare/playwright';
import { createConnection } from '../../src/index.js';
import { Config, ToolCapability } from '../../config.js';

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

type Options = Config & {
  vision?: boolean;
  capabilities?: ToolCapability[];
  artifacts?: {
    bucket?: R2Bucket;
    keyPrefix?: string;
    publicUrlBase?: string;
    returnMode?: 'url' | 'url+inline' | 'inline';
  };
};

export function createMcpAgent(endpoint: BrowserEndpoint, options?: Options): typeof McpAgent<typeof env, {}, {}> {
  const cdpEndpoint = typeof endpoint === 'string'
    ? endpoint
    : endpoint instanceof URL
      ? endpoint.toString()
      : endpointURLString(endpoint);

  const config: Options = {
    capabilities: ['core', 'tabs', 'pdf', 'history', 'wait', 'files', 'testing'],
    browser: {
      cdpEndpoint,
    },
    ...options,
  };

  const connection = createConnection(config);

  return class PlaywrightMcpAgent extends McpAgent<typeof env, {}, {}> {
    server = connection.then(server => server.server as unknown as Server);

    async init() {
      // do nothing
    }
  };
}

export { interceptMcpResponse } from './r2-middleware.js';
