import { Example } from '../types';
import './ExamplePicker.css';

interface ExamplePickerProps {
  onSelectExample: (example: Example | undefined) => void;
  examples: readonly Example[];
}

export function ExamplePicker({ onSelectExample, examples }: ExamplePickerProps) {
  return (
    <div className='help-message'>
      <p>Need help getting started?</p>
      <select
        className='example-select'
        onChange={e => onSelectExample(examples.find(ex => ex.id === e.target.value))}
        value=''
      >
        <option value=''>Choose an example...</option>
        {examples.map(example => (
          <option key={example.id} value={example.id}>
            {example.title}
          </option>
        ))}
      </select>
    </div>
  );
}
