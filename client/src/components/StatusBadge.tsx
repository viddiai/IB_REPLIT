import { Badge } from "@/components/ui/badge";

export type LeadStatus = 
  | "NY_INTRESSEANMALAN" 
  | "KUND_KONTAKTAD" 
  | "VUNNEN" 
  | "FORLORAD";

interface StatusBadgeProps {
  status: LeadStatus;
}

const statusConfig = {
  NY_INTRESSEANMALAN: {
    label: "Ny intresseanmälan",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  },
  KUND_KONTAKTAD: {
    label: "Kund kontaktad",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  VUNNEN: {
    label: "Vunnen / Affär",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  FORLORAD: {
    label: "Förlorad / Inte affär",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.className} border-0`}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      {config.label}
    </Badge>
  );
}
