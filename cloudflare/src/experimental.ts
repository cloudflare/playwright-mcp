import { Browser, BrowserEndpoint, endpointURLString } from '@cloudflare/playwright';
import type { ToolCapability } from '../../config';
import { Context } from '../../src/context.js';
import { snapshotTools, visionTools } from '../../src/tools.js';
import { FullConfig, resolveConfig } from '../../src/config.js';
import { BrowserContextFactory, contextFactory } from '../../src/browserContextFactory.js';
import type { ToolSet } from 'ai';
import { ToolsProvider } from '../experimental.js';

class ToolsProviderImpl implements ToolsProvider {
  private context: Context;
  private _tools: ToolSet;

  constructor(context: Context) {
    this.context = context;
  }

  tools(): ToolSet {
    if (!this._tools) {
      this._tools = Object.fromEntries(
          this.context.tools.map(tool => [
            tool.schema.name,
            {
              parameters: tool.schema.inputSchema,
              description: tool.schema.description,
              execute: async (args: any) => {
                return await this.context.run(tool, args);
              },
            },
          ])
      );
    }
    return this._tools;
  }

  async close() {
    await this.context.close();
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }
}

function isBrowser(browser: BrowserEndpoint | Browser): browser is Browser {
  return (
    typeof (browser as Browser).newPage === 'function' &&
    typeof (browser as Browser).newContext === 'function' &&
    // Fetcher may match the previous ones
    typeof (browser as Browser)[Symbol.asyncDispose] === 'function'
  );
}

export async function createToolsProvider(endpoint: BrowserEndpoint | Browser, options?: { vision?: boolean, capabilities?: ToolCapability[] }): Promise<ToolsProvider> {
  const allTools = options?.vision ? visionTools : snapshotTools;
  const tools = options?.capabilities ? allTools.filter(tool => options.capabilities.includes(tool.capability)) : allTools;
  let config: FullConfig;
  let browserContextFactory: BrowserContextFactory;

  if (isBrowser(endpoint)) {
    config = await resolveConfig({});
    browserContextFactory = {
      createContext: async () => {
        const browserContext = await endpoint.newContext();
        return { browserContext, close: () => browserContext.close() };
      },
    } as BrowserContextFactory;
  } else {
    const cdpEndpoint = typeof endpoint === 'string'
      ? endpoint
      : endpoint instanceof URL
        ? endpoint.toString()
        : endpointURLString(endpoint);
    config = await resolveConfig({
      browser: {
        cdpEndpoint,
      },
    });
    browserContextFactory = contextFactory(config.browser);
  }

  const context = new Context(tools, config, browserContextFactory);
  return new ToolsProviderImpl(context);
}
