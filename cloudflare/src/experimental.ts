import { Browser, BrowserContext, BrowserEndpoint, endpointURLString } from '@cloudflare/playwright';
import type { ToolCapability } from '../../config';
import { Context } from '../../src/context.js';
import { FullConfig, resolveConfig } from '../../src/config.js';
import type { BrowserContextFactory, ClientInfo } from '../../src/browserContextFactory.js';
import type { Tool, ToolSet } from 'ai';
import { ToolsProvider } from '../experimental.js';
import { filteredTools } from '../../src/tools';
import { Response } from '../../src/response';
import { BrapiContextFactory } from '.';

class ToolsProviderImpl implements ToolsProvider {
  private _context: Context;
  private _tools: ToolSet;

  constructor(context: Context) {
    this._context = context;
  }

  tools(): ToolSet {
    if (!this._tools) {
      this._tools = Object.fromEntries(
          this._context.tools.map(tool => [
            tool.schema.name,
            {
              parameters: tool.schema.inputSchema,
              description: tool.schema.description,
              execute: async (rawArguments: any) => {
                const parsedArguments = tool.schema.inputSchema.parse(rawArguments || {});
                const context = this._context;
                const response = new Response(context, tool.schema.name, parsedArguments);
                context.setRunningTool(tool.schema.name);
                try {
                  await tool.handle(context, parsedArguments, response);
                  await response.finish();
                  context.sessionLog?.logResponse(response);
                } catch (error: any) {
                  response.addError(String(error));
                } finally {
                  context.setRunningTool(undefined);
                }
                return response.serialize();
              },
            } satisfies Tool,
          ])
      );
    }
    return this._tools;
  }

  async close() {
    await this._context.dispose();
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }
}

function isBrowser(browser: any): browser is Browser {
  return (
    typeof browser.newPage === 'function' &&
    typeof browser.newContext === 'function' &&
    // Fetcher may match the previous ones
    typeof browser[Symbol.asyncDispose] === 'function'
  );
}

function isBrowserContext(browserContext: any): browserContext is BrowserContext {
  return (
    typeof browserContext.newPage === 'function' &&
    typeof browserContext.newContext === 'undefined' &&
    // Fetcher may match the previous ones
    typeof browserContext[Symbol.asyncDispose] === 'function'
  );
}

export async function createToolsProvider(endpoint: BrowserEndpoint | Browser | BrowserContext, options?: { capabilities?: ToolCapability[], clientInfo: ClientInfo }): Promise<ToolsProvider> {
  let config: FullConfig;
  let browserContextFactory: BrowserContextFactory;

  if (isBrowser(endpoint)) {
    config = await resolveConfig({});
    browserContextFactory = {
      createContext: async () => {
        const browserContext = await endpoint.newContext();
        return { browserContext, close: () => browserContext.close() };
      },
    } as unknown as BrowserContextFactory;
  } else if (isBrowserContext(endpoint)) {
      config = await resolveConfig({});
      const browserContext = endpoint;
      browserContextFactory = {
        createContext: async () => {
          return { browserContext, close: () => {} };
        },
      } as unknown as BrowserContextFactory;
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
    browserContextFactory = new BrapiContextFactory(config);
  }

  const tools = filteredTools(config);
  const clientInfo = options?.clientInfo ?? { name: 'unknown', version: 'unknown' };

  const context = new Context({
    tools,
    config,
    browserContextFactory,
    clientInfo,
    sessionLog: undefined,
  });
  return new ToolsProviderImpl(context);
}
