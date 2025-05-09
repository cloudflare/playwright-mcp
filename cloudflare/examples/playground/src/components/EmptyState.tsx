import './EmptyState.css';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className='empty-state'>
      <img src='/sad_cloud.svg' alt='Empty state' className='empty-state-icon' />
      <p className='empty-state-message'>{message}</p>
    </div>
  );
}
