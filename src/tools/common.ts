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
import { defineTool, type ToolFactory } from './tool';

const wait: ToolFactory = captureSnapshot => defineTool({
  capability: 'wait',

  schema: {
    name: 'browser_wait',
    description: 'Wait for a specified time in seconds',
    inputSchema: z.object({
      time: z.coerce.number().describe('The time to wait in seconds'),
    }),
  },

  handle: async (context, params) => {
    await new Promise(f => setTimeout(f, Math.min(10000, params.time * 1000)));
    return {
      code: [`// Waited for ${params.time} seconds`],
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

const close = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_close',
    description: 'Close the page',
    inputSchema: z.object({}),
  },

  handle: async context => {
    await context.close();
    return {
      code: [`// Internal to close the page`],
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const resize: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',
  schema: {
    name: 'browser_resize',
    description: 'Resize the browser window',
    inputSchema: z.object({
      width: z.coerce.number().describe('Width of the browser window'),
      height: z.coerce.number().describe('Height of the browser window'),
    }),
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
  wait(captureSnapshot),
  resize(captureSnapshot)
];
