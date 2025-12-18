#!/usr/bin/env node
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { env } from 'cloudflare:workers';
import { McpAgent } from 'agents/mcp';
import { BrowserEndpoint } from '@cloudflare/playwright';
import { Config } from '../config.js';
import type { R2Bucket } from '@cloudflare/workers-types';

type ToolCapability = 'core' | 'tabs' | 'pdf' | 'history' | 'wait' | 'files';

type Options = Config & {
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
    /**
     * Configure artifact storage to upload screenshots/PDFs to R2.
     */
    artifacts?: {
        bucket?: R2Bucket;
        keyPrefix?: string;
        publicUrlBase?: string;
        returnMode?: 'url' | 'url+inline' | 'inline';
    };
};

type R2MiddlewareConfig = {
  bucket: R2Bucket;
  keyPrefix?: string;
  publicUrlBase?: string;
  returnMode?: 'url' | 'url+inline' | 'inline';
};

export declare function createMcpAgent(endpoint: BrowserEndpoint, options?: Options): typeof McpAgent<typeof env, {}, {}>;
export declare function interceptMcpResponse(response: Response, r2Config: R2MiddlewareConfig): Promise<Response>;
export {};
