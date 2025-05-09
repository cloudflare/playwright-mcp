import './Tabs.css';

export interface Tab {
  id: string;
  label: string;
  align?: 'left' | 'right';
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  const leftTabs = tabs.filter(tab => tab.align !== 'right');
  const rightTabs = tabs.filter(tab => tab.align === 'right').reverse();

  return (
    <div className='view-tabs'>
      <div className='tabs-left'>
        {leftTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className='tabs-right'>
        {rightTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
