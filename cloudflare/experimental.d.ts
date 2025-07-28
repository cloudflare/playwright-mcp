import { Browser, BrowserEndpoint } from '@cloudflare/playwright';
import { ToolSet } from 'ai';
import { ToolCapability } from './index.js';

/**
 * ToolsProvider interface for providing Playwright MCP tools.
 */
export interface ToolsProvider {
  /**
   * Returns a ToolSet containing all available tools mapped from the context
   * Each tool includes parameters, description, and execute function
   */
  tools(): ToolSet;

  /**
   * Closes the underlying browser context and cleans up resources
   */
  close(): Promise<void>;

  [Symbol.asyncDispose](): Promise<void>;
}

export declare function createToolsProvider(endpoint: BrowserEndpoint | Browser, options?: { vision?: boolean; capabilities?: ToolCapability[] }): Promise<ToolsProvider>;
