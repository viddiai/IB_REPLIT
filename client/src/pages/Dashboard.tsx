import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KpiCard from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  won: number;
  lost: number;
  winRate: number;
  avgTimeToFirstContact: number;
  avgTimeToClose: number;
  leadsBySource: Array<{ source: string; count: number }>;
  leadsByAnlaggning: Array<{ anlaggning: string; count: number }>;
}

export default function Dashboard() {
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [anlaggningFilter, setAnlaggningFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    // Note: Backend does not yet support filtering. Filter parameters are kept for future implementation.
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kunde inte hämta statistik</p>
      </div>
    );
  }

  const kpiData = [
    { title: "Totala leads", value: stats.totalLeads.toString(), subtitle: "Alla leads", trend: 0 },
    { title: "Konverteringsgrad", value: `${stats.winRate.toFixed(1)}%`, subtitle: "Win rate", trend: 0 },
    { title: "Genomsnittlig svarstid", value: `${stats.avgTimeToFirstContact.toFixed(1)}h`, subtitle: "Tid till första kontakt", trend: 0 },
    { title: "Genomsnittlig säljtid", value: `${stats.avgTimeToClose.toFixed(1)} dagar`, subtitle: "Tid till avslut", trend: 0 },
  ];

  const statusDistribution = [
    { status: "Ny intresseanmälan", count: stats.newLeads },
    { status: "Kund kontaktad", count: stats.contacted },
    { status: "Vunnen", count: stats.won },
    { status: "Förlorad", count: stats.lost },
  ].filter(item => item.count > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">KPI & Statistik</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2" 
          onClick={() => setShowFilters(!showFilters)}
          data-testid="button-toggle-filters"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? "Dölj filter" : "Visa filter"}
        </Button>
      </div>

      {showFilters && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Filtrera statistik</h3>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Filtrering implementeras i nästa version
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seller-filter">Säljare</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger id="seller-filter" data-testid="select-seller-filter">
                  <SelectValue placeholder="Alla säljare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla säljare</SelectItem>
                  {users
                    .filter((u) => u.role === "SALJARE")
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anlaggning-filter">Anläggning</Label>
              <Select value={anlaggningFilter} onValueChange={setAnlaggningFilter}>
                <SelectTrigger id="anlaggning-filter" data-testid="select-anlaggning-filter">
                  <SelectValue placeholder="Alla anläggningar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla anläggningar</SelectItem>
                  <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                  <SelectItem value="Göteborg">Göteborg</SelectItem>
                  <SelectItem value="Trollhättan">Trollhättan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Från datum</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Till datum</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Lead-källor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.leadsBySource}>
              <defs>
                <linearGradient id="sourceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis 
                dataKey="source" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="count" fill="url(#sourceGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Anläggningsfördelning</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.leadsByAnlaggning}>
              <defs>
                <linearGradient id="anlaggningGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis 
                dataKey="anlaggning" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="count" fill="url(#anlaggningGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Statusfördelning</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusDistribution}>
              <defs>
                <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis 
                dataKey="status" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar dataKey="count" fill="url(#statusGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 flex flex-col justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-primary">{stats.totalLeads}</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Totalt antal leads</p>
              <p className="text-xs text-muted-foreground mt-1">I systemet</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
