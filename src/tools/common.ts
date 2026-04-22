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

import { z } from 'zod';
import { defineTool, type ToolFactory } from './tool.js';

const close = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_close',
    title: 'Close browser',
    description: 'Close the page',
    inputSchema: z.object({}),
    type: 'readOnly',
  },

  handle: async context => {
    await context.close();
    return {
      code: [`await page.close()`],
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

// Destructive equivalent of `browser_close`: when the MCP is connected to a
// remote browser over CDP (e.g. Cloudflare Browser Rendering), Playwright's
// `browser.close()` only drops the local WebSocket — the remote Chromium
// keeps running until its keep-alive timeout expires. `browser_terminate`
// sends the CDP `Browser.close` command so the remote session is released
// immediately. For non-CDP transports it behaves the same as `browser_close`.
const terminate = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_terminate',
    title: 'Terminate browser session',
    description: 'Close the browser and release any remote CDP-backed session so it does not idle on until its keep-alive expires. Use this instead of browser_close when you are connected to a remote browser (e.g. Cloudflare Browser Rendering) and want to free the session immediately.',
    inputSchema: z.object({}),
    type: 'readOnly',
  },

  handle: async context => {
    await context.terminate();
    return {
      code: [`await browser.close()`],
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const resize: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',
  schema: {
    name: 'browser_resize',
    title: 'Resize browser window',
    description: 'Resize the browser window',
    inputSchema: z.object({
      width: z.coerce.number().describe('Width of the browser window'),
      height: z.coerce.number().describe('Height of the browser window'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Resize browser window to ${params.width}x${params.height}`,
      `await page.setViewportSize({ width: ${params.width}, height: ${params.height} });`
    ];

    const action = async () => {
      await tab.page.setViewportSize({ width: params.width, height: params.height });
    };

    return {
      code,
      action,
      captureSnapshot,
      waitForNetwork: true
    };
  },
});

export default (captureSnapshot: boolean) => [
  close,
  terminate,
  resize(captureSnapshot)
];
