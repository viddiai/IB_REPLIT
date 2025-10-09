import LeadChart from '../LeadChart';

export default function LeadChartExample() {
  const mockData = [
    { date: 'Dec 9', value: 0 },
    { date: 'Dec 10', value: 1 },
    { date: 'Dec 11', value: 2.25 },
    { date: 'Dec 12', value: 3 },
    { date: 'Dec 13', value: 2.15 },
    { date: 'Dec 14', value: 1 },
    { date: 'Dec 15', value: 2.2 },
    { date: 'Dec 16', value: 3 },
  ];

  return (
    <div className="p-6">
      <LeadChart title="Besöksengagemang" data={mockData} />
    </div>
  );
}
