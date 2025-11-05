import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface AcceptanceBannerProps {
  leadId: string;
  assignedAt: Date | null;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

export default function AcceptanceBanner({
  leadId,
  assignedAt,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false
}: AcceptanceBannerProps) {
  const getTimeRemaining = () => {
    if (!assignedAt) return null;
    
    const now = new Date();
    const assigned = new Date(assignedAt);
    const twelveHoursLater = new Date(assigned.getTime() + 12 * 60 * 60 * 1000);
    const hoursRemaining = (twelveHoursLater.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursRemaining <= 0) {
      return { hours: 0, isUrgent: true, text: "Tiden har gått ut" };
    }
    
    const isUrgent = hoursRemaining <= 2;
    return {
      hours: Math.ceil(hoursRemaining),
      isUrgent,
      text: formatDistanceToNow(twelveHoursLater, { addSuffix: true, locale: sv })
    };
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Card 
      className={`p-6 border-l-4 ${
        timeRemaining?.isUrgent 
          ? 'border-l-destructive bg-destructive/5' 
          : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      }`}
      data-testid="banner-acceptance"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle 
            className={`w-6 h-6 ${
              timeRemaining?.isUrgent 
                ? 'text-destructive' 
                : 'text-yellow-600 dark:text-yellow-500'
            }`}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Detta lead väntar på din bekräftelse
          </h3>
          <p className="text-muted-foreground mb-1">
            Kan du ta detta lead?
          </p>
          {timeRemaining && (
            <p className={`text-sm font-medium ${
              timeRemaining.isUrgent 
                ? 'text-destructive' 
                : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {timeRemaining.hours > 0 
                ? `Bekräfta ${timeRemaining.text}` 
                : timeRemaining.text}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={onAccept}
            disabled={isAccepting || isDeclining}
            variant="default"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            data-testid="button-accept-lead"
          >
            {isAccepting ? (
              "Accepterar..."
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Ja, jag tar leadet
              </>
            )}
          </Button>
          <Button
            onClick={onDecline}
            disabled={isAccepting || isDeclining}
            variant="destructive"
            data-testid="button-decline-lead"
          >
            {isDeclining ? (
              "Nekar..."
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Nej, tilldela till annan
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
