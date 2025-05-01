import { env } from 'cloudflare:workers';
import { McpAgent } from 'agents/mcp';
import { BrowserEndpoint } from '@cloudflare/playwright';

type ToolCapability = 'core' | 'tabs' | 'pdf' | 'history' | 'wait' | 'files';

type Options = {
    /**
     * Enable vision capabilities (e.g., visual automation or OCR).
     */
    vision?: boolean;
    /**
     * List of enabled tool capabilities. Possible values:
     *   - 'core': Core browser automation features.
     *   - 'tabs': Tab management features.
     *   - 'pdf': PDF generation and manipulation.
     *   - 'history': Browser history access.
     *   - 'wait': Wait and timing utilities.
     *   - 'files': File upload/download support.
     */
    capabilities?: ToolCapability[];
};
export declare function createMcpAgent(endpoint: BrowserEndpoint, options?: Options): typeof McpAgent<typeof env, {}, {}>;
export {};
