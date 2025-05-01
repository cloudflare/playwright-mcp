import { Instruction, Example } from '../types';
import './ExampleBlock.css';

interface ExampleBlockProps {
  example: Example;
  onClick: (instructions: ReadonlyArray<Instruction>) => void;
  onClose: () => void;
  runningInstruction?: Instruction;
  isPlayingAll?: boolean;
}

export function ExampleBlock({
  example,
  onClick,
  onClose,
  runningInstruction,
  isPlayingAll
}: ExampleBlockProps) {
  const isExampleLoading = (instruction: Instruction) => {
    return runningInstruction?.mode === instruction.mode &&
      runningInstruction?.command === instruction.command;
  };

  return (
    <div className='example-block'>
      <div className='header'>
        <div className='title-section'>
          <h3>{example.title}</h3>
        </div>
        <button className='close-button' onClick={onClose}>✕</button>
      </div>
      <button
        className='play-all-button'
        onClick={() => onClick(example.instructions)}
        disabled={isPlayingAll}
      >
        {isPlayingAll ? <span className='spinner' /> : '▶ Play All'}
      </button>
      <div className='example-list'>
        {example.instructions.map((instruction, index) => (
          <div
            key={index}
            className='example-item'
            onClick={() => onClick([instruction])}
          >
            <span className='example-mode'>{instruction.mode === 'extract' ? 'Extract' : 'Act'}</span>
            <span className='example-instruction'>{instruction.command}</span>
            <button
              className='play-button'
              disabled={isExampleLoading(instruction)}
            >
              {isExampleLoading(instruction) ? (
                <span className='spinner' />
              ) : '▶'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
