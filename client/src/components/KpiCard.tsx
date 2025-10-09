import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
}

export default function KpiCard({ title, value, subtitle, trend, trendLabel }: KpiCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="w-4 h-4" />;
    if (trend > 0) return <ArrowUp className="w-4 h-4" />;
    return <ArrowDown className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    if (trend > 0) return "text-green-600";
    return "text-red-600";
  };

  return (
    <Card className="p-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline justify-between">
          <h3 className="text-3xl font-bold text-foreground" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </h3>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`} data-testid={`kpi-trend-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        {trendLabel && (
          <p className="text-xs text-muted-foreground">{trendLabel}</p>
        )}
      </div>
    </Card>
  );
}
