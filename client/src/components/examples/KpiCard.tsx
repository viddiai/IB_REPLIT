import KpiCard from '../KpiCard';

export default function KpiCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <KpiCard 
        title="Besökare (Unika)" 
        value="3" 
        subtitle="Från LinkedIn & Email"
        trend={200}
        trendLabel="Senaste 30 dagarna"
      />
      <KpiCard 
        title="Nya LinkedIn-kontakter" 
        value="145" 
        subtitle="Denna månad"
        trend={16.3}
      />
      <KpiCard 
        title="Lead-konverteringar" 
        value="234" 
        subtitle="Portalregistreringar"
        trend={-5.2}
      />
      <KpiCard 
        title="Bokade möten" 
        value="45" 
        subtitle="Via Bookings"
        trend={22.8}
      />
    </div>
  );
}
