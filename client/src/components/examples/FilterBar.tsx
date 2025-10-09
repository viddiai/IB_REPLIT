import FilterBar from '../FilterBar';
import { useState } from 'react';

export default function FilterBarExample() {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [location, setLocation] = useState('all');

  return (
    <div className="p-6">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        sourceFilter={source}
        onSourceChange={setSource}
        locationFilter={location}
        onLocationChange={setLocation}
      />
    </div>
  );
}
