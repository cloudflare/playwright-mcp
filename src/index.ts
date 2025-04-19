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

import { createServerWithTools } from './server';
import * as snapshot from './tools/snapshot';
import * as common from './tools/common';
import * as screenshot from './tools/screenshot';
import { console } from './resources/console';

import type { Tool } from './tools/tool';
import type { Resource } from './resources/resource';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { LaunchOptions } from '@cloudflare/playwright';
import { BrowserWorker } from '@cloudflare/playwright';
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const commonTools: Tool[] = [
  common.pressKey,
  common.wait,
  common.pdf,
  common.close,
];

const snapshotTools: Tool[] = [
  common.navigate(true),
  common.goBack(true),
  common.goForward(true),
  common.chooseFile(true),
  snapshot.snapshot,
  snapshot.click,
  snapshot.hover,
  snapshot.type,
  snapshot.selectOption,
  snapshot.screenshot,
  ...commonTools,
];

const screenshotTools: Tool[] = [
  common.navigate(false),
  common.goBack(false),
  common.goForward(false),
  common.chooseFile(false),
  screenshot.screenshot,
  screenshot.moveMouse,
  screenshot.click,
  screenshot.drag,
  screenshot.type,
  ...commonTools,
];

const resources: Resource[] = [
  console,
];

type Options = {
  userDataDir?: string;
  launchOptions?: LaunchOptions;
  vision?: boolean;
};

const packageJSON = require('../package.json');

export function createServer(endpoint: BrowserWorker, options?: Options): Server {
  const tools = options?.vision ? screenshotTools : snapshotTools;
  return createServerWithTools(endpoint, {
    name: 'Playwright',
    version: packageJSON.version,
    tools,
    resources,
    userDataDir: options?.userDataDir ?? '',
    launchOptions: options?.launchOptions,
  });
}

export function createMcpAgent(endpoint: BrowserWorker, options?: Options): typeof McpAgent<Env, {}, {}> {
  return class PlaywrightMcpAgent extends McpAgent<Env, {}, {}> {
    // we can use a Server instead of a McpServer here
    // but we need to force it
    server = createServer(this.env.BROWSER, options) as unknown as McpServer;

    async init() {
      // do nothing
    }
  };
}
