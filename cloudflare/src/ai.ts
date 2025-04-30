import { endpointURLString } from '@cloudflare/playwright';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import zodToJsonSchema, { JsonSchema7Type } from 'zod-to-json-schema';
import { snapshotTools } from '../../src';
import { Context } from '../../src/context';
import type { ExtractResult, ModelKey, PlaywrightAIConfig, Schema, PlaywrightAIState } from '../ai';

function extractSnapshot(snapshotMarkdown: string) {
  return /```yaml([\s\S]*)```/m.exec(snapshotMarkdown)?.[1].trim() ?? snapshotMarkdown;
}

class PlaywrightAI {
  private _config: PlaywrightAIConfig;
  private _ai: Ai;
  private _model: ModelKey;
  private _context: Context;
  private _tools: AiTextGenerationToolInput[] = [];
  private _fns: Record<string, (args: any) => Promise<string>> = {};
  private _messages: RoleScopedChatInput[] = [
    { role: 'system', content: 'You are a helpful assistant that can control a browser.' },
  ];

  constructor(config: PlaywrightAIConfig) {
    this._config = config;
    this._ai = typeof config.ai === 'string' ? env[config.ai] as Ai : config.ai;
    this._model = config.model ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    this._context = new Context(snapshotTools, {
      browserName: 'chromium',
      userDataDir: '/tmp',
      cdpEndpoint: endpointURLString(config.browser),
    });
    for (const tool of snapshotTools) {
      this._tools.push({
        type: 'function',
        function: {
          name: tool.schema.name,
          description: tool.schema.description,
          parameters: zodToJsonSchema(tool.schema.inputSchema) as any,
        },
      });
      this._fns[tool.schema.name] = async (params: any) => {
        if (this._config.verbose)
          console.log(`🔧 Running tool ${tool.schema.name}: ${JSON.stringify(params)}`);
        const results = await this._context.run(tool, params);
        return results.content.map(c => c.text).join('\n');
      };
    }
  }

  page() {
    return this._context.currentTabOrDie().page;
  }

  state(): PlaywrightAIState {
    const currentTab = this._context.tabs().length > 0 ? this._context.currentTabOrDie() : undefined;
    return {
      messages: [...this._messages],
      tabs: this._context.tabs().map(tab => ({
        url: tab.page.url(),
        snapshot: tab.hasSnapshot() ? extractSnapshot(tab.snapshotOrDie().text()) : undefined,
      })),
      currentTab: currentTab ? {
        url: currentTab.page.url(),
        snapshot: currentTab.hasSnapshot() ? extractSnapshot(currentTab.snapshotOrDie().text()) : undefined,
      } : undefined,
    };
  }

  async act(params: string | { action: string }): Promise<void> {
    params = typeof params === 'string' ? { action: params } : params;
    this._messages.push({ role: 'user', content: params.action });
    const { response, tool_calls } = await this._ai.run(this._model, {
      messages: this._messages,
      tools: this._tools,
      stream: false,
    }) as Exclude<AiTextGenerationOutput, ReadableStream>;

    this._messages = this._messages.filter(message => message.role !== 'tool');

    if (tool_calls) {
      for (const tool_call of tool_calls) {
        const results = await this._fns[tool_call.name]?.(tool_call.arguments);
        this._messages.push({ role: 'tool', content: results, name: tool_call.name });
      }
    }

    if (response)
      this._messages.push({ role: 'assistant', content: response });
  }

  async extract<T extends Schema>(params: { instruction: string, schema: T }): Promise<ExtractResult<T>>;
  async extract(params: string | { instruction: string, schema?: JsonSchema7Type }): Promise<any>;
  async extract(params: string | { instruction: string, schema?: Schema | JsonSchema7Type }): Promise<any> {
    params = typeof params === 'string' ? { instruction: params } : params;
    if (params.schema instanceof z.ZodType)
      params = { ...params, schema: zodToJsonSchema(params.schema as any) };

    const tab = this._context.currentTabOrDie();
    const snapshot = tab.snapshotOrDie().text();
    const messages = [
      { role: 'user', content: `Given the following context:\n\n${snapshot}\n\n${params.instruction}` },
    ];
    const { response } = await this._ai.run(this._model, {
      messages,
      stream: false,
      response_format: {
        type: 'json_schema',
        json_schema: params.schema ?? {},
      },
    }) as Exclude<AiTextGenerationOutput, ReadableStream>;
    if (this._config.verbose)
      console.log(`📦 Extracted response: ${JSON.stringify(response, null, 2)}`);
    return response;
  }

  async close(): Promise<void> {
    await this._context.close();
  }
}

export function createPlaywrightAI(config: PlaywrightAIConfig): PlaywrightAI {
  return new PlaywrightAI(config);
}
