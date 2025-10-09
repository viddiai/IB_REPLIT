import StatusTabs from '../StatusTabs';
import { useState } from 'react';

export default function StatusTabsExample() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="p-6">
      <StatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          all: 234,
          new: 12,
          contacted: 89,
          won: 103,
          lost: 30,
        }}
      />
    </div>
  );
}
