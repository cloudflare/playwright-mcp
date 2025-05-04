import { FormEvent, useState, useRef, useEffect } from 'react';
import { Mode, Instruction } from '../types';
import './CommandInput.css';
import './shared.css';

interface CommandInputProps {
  loading: boolean;
  placeholder?: string;
  buttonLabel?: string;
  instruction?: Instruction;
  onSubmit: (data: Instruction) => void;
}

export function CommandInput({
  loading,
  placeholder = 'Enter your command here...',
  buttonLabel = 'Execute',
  instruction = { mode: 'act', command: '' },
  onSubmit
}: CommandInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [mode, setMode] = useState<Mode>('act');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCommand(instruction.command);
    setMode(instruction.mode);
  }, [instruction]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setIsOpen(false);

    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setIsOpen(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ mode, command });
  };

  return (
    <form onSubmit={handleSubmit} className='command-input-group'>
      <div className='mode-dropdown' ref={dropdownRef}>
        <button
          type='button'
          className='mode-dropdown-button'
          onClick={() => setIsOpen(!isOpen)}
        >
          {mode === 'act' ? 'Act' : 'Extract'}
          <span className='dropdown-caret'>▼</span>
        </button>
        <div className={`mode-dropdown-menu ${isOpen ? 'show' : ''}`}>
          <button
            type='button'
            className='mode-dropdown-item'
            onClick={() => handleModeChange('act')}
          >
            Act
          </button>
          <button
            type='button'
            className='mode-dropdown-item'
            onClick={() => handleModeChange('extract')}
          >
            Extract
          </button>
        </div>
      </div>
      <input
        type='text'
        className='command-input'
        value={command}
        onChange={e => setCommand(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
      />
      <button type='submit' className={`command-submit ${loading ? 'loading' : ''}`} disabled={loading}>
        {loading ? (
          <span className='spinner'></span>
        ) : buttonLabel}
      </button>
    </form>
  );
}
