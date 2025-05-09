import { Example } from '../types';

export default {
  id: 'todos',
  title: 'Todos',
  instructions: [
    { mode: 'act', command: 'Go to demo.playwright.dev/todomvc' },
    { mode: 'act', command: 'Create todo item using a comedy movie reference' },
    { mode: 'act', command: 'Another one in parrot style' },
    { mode: 'act', command: 'Another one in yoda style' },
    { mode: 'act', command: 'Mark the parrot one as completed' },
    { mode: 'extract', command: 'Extract todo items' }
  ]
} satisfies Example;
