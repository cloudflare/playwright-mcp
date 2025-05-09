import { createPlaywrightAI } from '@cloudflare/playwright-mcp/ai';
import { expect } from '@cloudflare/playwright/test';
import { z } from 'zod';

export default {
  async fetch(request: Request, env: Env) {
    if (new URL(request.url).pathname !== '/')
      return new Response('Not found', { status: 404 });

    const pwai = createPlaywrightAI({
      browser: env.BROWSER,
      ai: env.AI,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      verbose: true,
    });

    try {
      await pwai.act('navigate to demo.playwright.dev/todomvc');
      await pwai.act('create a todo item');
      await pwai.act('create another todo item in parrot style');
      await pwai.act('create another todo item in yoda style');
      await pwai.act('Now click the checkbox of the parrot todo entry');
      const todos = await pwai.extract({
        instruction: 'get all todos',
        schema: z.array(
            z.object({
              text: z.string(),
              completed: z.boolean(),
            })
        ),
      });

      expect(todos).toMatchObject([
        { text: expect.any(String), completed: false },
        { text: expect.stringMatching(/cracker/i), completed: true },
        { text: expect.any(String), completed: false },
      ]);
    } catch (error) {
      console.warn('Error during Playwright AI execution:', error);
    }

    const img = await pwai.page().screenshot();
    await pwai.close();

    return new Response(img, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  }
};
