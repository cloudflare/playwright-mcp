export type Mode = 'act' | 'extract';

export type Instruction = {
  mode: Mode;
  command: string;
};

export type Example = {
  id: string;
  title: string;
  instructions: ReadonlyArray<Instruction>;
};
