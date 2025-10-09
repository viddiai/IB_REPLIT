import SourceTable from '../SourceTable';

export default function SourceTableExample() {
  const leadSourceData = [
    { source: 'Bytbil', count: 145 },
    { source: 'Blocket', count: 89 },
    { source: 'Manuell', count: 34 },
  ];

  return (
    <div className="p-6">
      <SourceTable
        title="Lead-källor"
        data={leadSourceData}
        columns={[
          { key: 'source', header: 'Källa' },
          { key: 'count', header: 'Antal' },
        ]}
      />
    </div>
  );
}
