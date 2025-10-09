import { useState } from "react";
import LeadCard from "@/components/LeadCard";
import FilterBar from "@/components/FilterBar";
import StatusTabs from "@/components/StatusTabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function LeadsList() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  // TODO: remove mock data
  const mockLeads = [
    {
      id: "1",
      vehicleTitle: "Adria Altea 542 DT - 2023",
      contactName: "Erik Andersson",
      contactEmail: "erik.andersson@example.com",
      contactPhone: "070-123 45 67",
      source: "BYTBIL" as const,
      location: "Falkenberg",
      status: "NY_INTRESSEANMALAN" as const,
      createdAt: "2024-01-15",
      nextStep: "Kontakta kund inom 24h",
    },
    {
      id: "2",
      vehicleTitle: "Kabe Royal 560 XL - 2022",
      contactName: "Anna Svensson",
      contactEmail: "anna.s@example.com",
      source: "BLOCKET" as const,
      location: "Göteborg",
      status: "KUND_KONTAKTAD" as const,
      createdAt: "2024-01-14",
      assignedTo: "Lisa Karlsson",
      vehicleLink: "https://example.com",
    },
    {
      id: "3",
      vehicleTitle: "Hobby Prestige 720 - 2021",
      contactName: "Johan Berg",
      contactPhone: "073-987 65 43",
      source: "MANUELL" as const,
      location: "Trollhättan",
      status: "VUNNEN" as const,
      createdAt: "2024-01-10",
      assignedTo: "Per Johansson",
    },
    {
      id: "4",
      vehicleTitle: "Dethleffs Globebus T7 - 2023",
      contactName: "Maria Nilsson",
      contactEmail: "maria.n@example.com",
      contactPhone: "072-456 78 90",
      source: "BYTBIL" as const,
      location: "Falkenberg",
      status: "NY_INTRESSEANMALAN" as const,
      createdAt: "2024-01-13",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mina Leads</h1>
          <p className="text-muted-foreground mt-1">Hantera dina tilldelade leads</p>
        </div>
        <Button className="gap-2" data-testid="button-create-lead">
          <Plus className="w-4 h-4" />
          Skapa lead
        </Button>
      </div>

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

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
      />

      <div className="space-y-4">
        {mockLeads.map((lead) => (
          <LeadCard
            key={lead.id}
            {...lead}
            onViewDetails={() => console.log("View details:", lead.id)}
            onAssign={() => console.log("Assign lead:", lead.id)}
          />
        ))}
      </div>
    </div>
  );
}
