import './patch';
export { PlaywrightAIAgent } from './agents';
import { routeAgentRequest } from 'agents';

export default {
  async fetch(request: Request, env: Env) {
    return await routeAgentRequest(request, env) ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
