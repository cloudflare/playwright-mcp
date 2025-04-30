import { Page } from '@cloudflare/playwright';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { JsonSchema7Type } from 'zod-to-json-schema';

type KeysByValue<T, ValueType> = {
  [K in keyof T]: T[K] extends ValueType ? K : never;
}[keyof T];

type ModelKey = KeysByValue<AiModels, BaseAiTextGeneration>;

export type PlaywrightAIConfig = {
  ai: Ai | KeysByValue<typeof env, Ai>,
  browser: Fetcher | KeysByValue<typeof env, Fetcher>,
  model?: ModelKey,
  verbose?: boolean,
};

export type Schema = z.ZodTypeAny;
export type ExtractResult<T extends Schema> = z.infer<T>;

export type TabState = {
  url: string;
  snapshot?: string;
};

export type PlaywrightAIState = {
  messages: RoleScopedChatInput[];
  tabs: TabState[];
  currentTab?: TabState;
};

interface PlaywrightAI {
  state(): PlaywrightAIState;
  page(): Page;
  act(params: string | { action: string }): Promise<void>;
  extract<T extends Schema>(params: { instruction: string, schema: T }): Promise<ExtractResult<T>>;
  extract(params: string | { instruction: string, schema?: JsonSchema7Type }): Promise<any>;
  close(): Promise<void>;
}

export declare function createPlaywrightAI(config: PlaywrightAIConfig): PlaywrightAI;
