import { Example } from '../types';

export default {
  id: 'wordle',
  title: 'Wordle',
  instructions: [
    { mode: 'act', command: `Go to wordle` },
    { mode: 'act', command: `If there's a "Accept all" button, click it` },
    { mode: 'act', command: `If there's a "Continue" button, click it` },
    { mode: 'act', command: `Click "Play" button` },
    { mode: 'act', command: `If there's a help modal, click "Close" button inside it` },
    { mode: 'act', command: `Type some random five letter english word` },
    { mode: 'act', command: `Take new snapshot` },
    { mode: 'extract', command: `Get letter results` }
  ]
} satisfies Example;
