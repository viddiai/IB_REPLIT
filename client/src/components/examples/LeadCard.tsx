import LeadCard from '../LeadCard';

export default function LeadCardExample() {
  return (
    <div className="space-y-4 p-6 max-w-3xl">
      <LeadCard
        id="1"
        vehicleTitle="Adria Altea 542 DT - 2023"
        contactName="Erik Andersson"
        contactEmail="erik.andersson@example.com"
        contactPhone="070-123 45 67"
        source="BYTBIL"
        location="Falkenberg"
        status="NY_INTRESSEANMALAN"
        createdAt="2024-01-15"
        nextStep="Kontakta kund inom 24h"
        onViewDetails={() => console.log('View details clicked')}
        onAssign={() => console.log('Assign clicked')}
      />
      <LeadCard
        id="2"
        vehicleTitle="Kabe Royal 560 XL - 2022"
        contactName="Anna Svensson"
        contactEmail="anna.s@example.com"
        source="BLOCKET"
        location="Göteborg"
        status="KUND_KONTAKTAD"
        createdAt="2024-01-14"
        assignedTo="Lisa Karlsson"
        vehicleLink="https://example.com"
        onViewDetails={() => console.log('View details clicked')}
      />
      <LeadCard
        id="3"
        vehicleTitle="Hobby Prestige 720 - 2021"
        contactName="Johan Berg"
        contactPhone="073-987 65 43"
        source="MANUELL"
        location="Trollhättan"
        status="VUNNEN"
        createdAt="2024-01-10"
        assignedTo="Per Johansson"
        onViewDetails={() => console.log('View details clicked')}
      />
    </div>
  );
}
