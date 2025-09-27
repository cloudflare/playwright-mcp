import { McpAgent } from 'agents/mcp';
import { env } from 'cloudflare:workers';

import type { Browser, BrowserContext, BrowserEndpoint } from '@cloudflare/playwright';

import playwright, { endpointURLString } from '@cloudflare/playwright';
import type { Config, ToolCapability } from '../../config.js';

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { BrowserContextFactory, ClientInfo } from '../../src/browserContextFactory.js';
import { FullConfig, resolveConfig } from '../../src/config.js';
import { BrowserServerBackend } from '../../src/browserServerBackend.js';
import { packageJSON } from './package.js';
import { createServer } from '../../src/mcp/server.js';

type Options = {
  clientInfo?: ClientInfo;
  capabilities?: ToolCapability[];
};

export async function createConnection(userConfig: Config = {}, factory: BrowserContextFactory): Promise<Server> {
  const config = await resolveConfig(userConfig);
  return createServer('Playwright', packageJSON.version, new BrowserServerBackend(config, factory), false);
}

export class BrapiContextFactory implements BrowserContextFactory {
  readonly config: FullConfig;
  protected _browserPromise: Promise<Browser> | undefined;

  constructor(config: FullConfig) {
    this.config = config;
  }

  protected async _obtainBrowser(): Promise<Browser> {
    if (this._browserPromise)
      return this._browserPromise;
    this._browserPromise = this._doObtainBrowser();
    void this._browserPromise.then(browser => {
      browser.on('disconnected', () => {
        this._browserPromise = undefined;
      });
    }).catch(() => {
      this._browserPromise = undefined;
    });
    return this._browserPromise;
  }

  async createContext() {
    const browser = await this._obtainBrowser();
    const browserContext = await this._doCreateContext(browser);
    return { browserContext: browserContext as any, close: () => this._closeBrowserContext(browserContext, browser) };
  }

  protected async _doObtainBrowser(): Promise<Browser> {
    return playwright.chromium.connectOverCDP(this.config.browser.cdpEndpoint!);
  }

  protected async _doCreateContext(browser: Browser): Promise<BrowserContext> {
    return this.config.browser.isolated ? await browser.newContext() : browser.contexts()[0];
  }

  private async _closeBrowserContext(browserContext: BrowserContext, browser: Browser) {
    if (browser.contexts().length === 1)
      this._browserPromise = undefined;
    await browserContext.close().catch(() => {});
    if (browser.contexts().length === 0) {
      await browser.close().catch(() => {});
    }
  }
}

export function createMcpAgent(endpoint: BrowserEndpoint, options?: Options): typeof McpAgent<typeof env, {}, {}> {
  const cdpEndpoint = typeof endpoint === 'string'
    ? endpoint
    : endpoint instanceof URL
      ? endpoint.toString()
      : endpointURLString(endpoint);

  const contextFactory = new BrapiContextFactory({
    capabilities: ['core', 'core-tabs', 'core-install', 'vision', 'pdf'],
    browser: {
      browserName: 'chromium',
      cdpEndpoint,
      launchOptions: {},
      contextOptions: {},
    },
    network: {
      allowedOrigins: undefined,
      blockedOrigins: undefined,
    },
    server: {},
    saveTrace: false,
    ...options,
  });
  const serverPromise = createConnection({}, contextFactory);

  return class PlaywrightMcpAgent extends McpAgent<typeof env, {}, {}> {
    server = serverPromise as Promise<Server>;

    async init() {
      // do nothing
    }
  };
}
