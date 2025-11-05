import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StatusTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  counts?: {
    all?: number;
    new?: number;
    contacted?: number;
    quote?: number;
    won?: number;
    lost?: number;
  };
}

export default function StatusTabs({ activeTab, onTabChange, counts = {} }: StatusTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="all" data-testid="tab-all">
          Alla {counts.all !== undefined && `(${counts.all})`}
        </TabsTrigger>
        <TabsTrigger value="new" data-testid="tab-new">
          Nya {counts.new !== undefined && `(${counts.new})`}
        </TabsTrigger>
        <TabsTrigger value="contacted" data-testid="tab-contacted">
          Kontaktade {counts.contacted !== undefined && `(${counts.contacted})`}
        </TabsTrigger>
        <TabsTrigger value="quote" data-testid="tab-quote">
          Offert skickad {counts.quote !== undefined && `(${counts.quote})`}
        </TabsTrigger>
        <TabsTrigger value="won" data-testid="tab-won">
          Vunna {counts.won !== undefined && `(${counts.won})`}
        </TabsTrigger>
        <TabsTrigger value="lost" data-testid="tab-lost">
          Förlorade {counts.lost !== undefined && `(${counts.lost})`}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
