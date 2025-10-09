import KpiCard from "@/components/KpiCard";
import LeadChart from "@/components/LeadChart";
import SourceTable from "@/components/SourceTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function Dashboard() {
  // TODO: remove mock data
  const mockChartData = [
    { date: 'Dec 9', value: 0 },
    { date: 'Dec 10', value: 1 },
    { date: 'Dec 11', value: 2.25 },
    { date: 'Dec 12', value: 3 },
    { date: 'Dec 13', value: 2.15 },
    { date: 'Dec 14', value: 1 },
    { date: 'Dec 15', value: 2.2 },
    { date: 'Dec 16', value: 3 },
  ];

  const leadSourceData = [
    { source: 'Bytbil', count: 145 },
    { source: 'Blocket', count: 89 },
  ];

  const conversionData = [
    { source: 'Portalregistrering', count: 234 },
    { source: 'Demoförfrågan', count: 45 },
    { source: 'Kontaktformulär', count: 78 },
  ];

  const kpiData = [
    { title: "Totala leads", value: "234", subtitle: "Denna månad", trend: 12.4 },
    { title: "Konverteringsgrad", value: "24.3%", subtitle: "Genomsnitt alla kampanjer", trend: 3.2 },
    { title: "Genomsnittlig svarstid", value: "2.8h", subtitle: "Tid till första kontakt", trend: -15.6 },
    { title: "Aktiva säljare", value: "8", subtitle: "Per anläggning", trend: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">KPI & Realtidsrapportering</p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-date-filter">
          <Calendar className="w-4 h-4" />
          Senaste 30 dagarna
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadChart title="Besöksengagemang" data={mockChartData} />
        <Card className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full border-8 border-primary border-t-transparent animate-spin-slow flex items-center justify-center">
              <div className="text-4xl font-bold text-foreground">2</div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Aktiva användare</p>
            <p className="text-xs text-muted-foreground mt-1">Realtid</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceTable
          title="Lead-källor"
          data={leadSourceData}
          columns={[
            { key: 'source', header: 'Källa' },
            { key: 'count', header: 'Antal' },
          ]}
        />
        <SourceTable
          title="Konverteringsuppdelning"
          data={conversionData}
          columns={[
            { key: 'source', header: 'Källa' },
            { key: 'count', header: 'Antal' },
          ]}
        />
      </div>
    </div>
  );
}
