import { Agent, unstable_callable as callable, Connection, ConnectionContext } from 'agents';
import { createPlaywrightAI, type PlaywrightAI, type PlaywrightAIState } from '@cloudflare/playwright-mcp/ai';
import { JsonSchema7Type } from 'zod-to-json-schema';

export class PlaywrightAIAgent extends Agent<Env, PlaywrightAIState> {
  initialState = {
    messages: [],
    tabs: [],
  };

  private _ai!: PlaywrightAI;

  onStart(): void | Promise<void> {
    this._ai = createPlaywrightAI({
      ai: this.env.AI,
      browser: this.env.BROWSER,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      verbose: true,
    });
  }

  @callable()
  async act(params: string | { action: string }): Promise<void> {
    await this._ai.act(params);
    this.setState(this._ai.state());
  }

  @callable()
  extract(params: string | { instruction: string, schema?: JsonSchema7Type }): Promise<any> {
    return this._ai.extract(params);
  }

  @callable()
  async screenshot(): Promise<{ base64: string, mimeType: string }> {
    const buffer = await this._ai.page().screenshot();
    return {
      base64: buffer.toString('base64'),
      mimeType: 'image/png',
    };
  }

  async close(): Promise<void> {
    await this._ai.close();
    this._ai = undefined;
  }
}
