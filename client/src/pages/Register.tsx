import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoPath from "@assets/logo2_1760052846978.webp";
import { Loader2 } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const [role, setRole] = useState("SALJARE");
  const [anlaggning, setAnlaggning] = useState("");

  useEffect(() => {
    if (user && (user as any).role && (user as any).anlaggning) {
      setLocation("/overview");
    }
  }, [user, setLocation]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { role: string; anlaggning?: string | null }) => {
      return apiRequest("PATCH", `/api/users/${(user as any)?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profil skapad",
        description: "Välkommen till Fritidscenter!",
      });
      setLocation("/overview");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte spara din profil. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const handleComplete = () => {
    updateProfileMutation.mutate({
      role,
      anlaggning: anlaggning || null,
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative">
          <header className="container mx-auto px-4 py-6 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <img src={logoPath} alt="Fritidscenter" className="h-12 w-auto" />
            </div>
          </header>

          <main className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Logga in först</CardTitle>
                  <CardDescription>
                    Du måste logga in med Replit Auth innan du kan registrera dig
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full" data-testid="button-login">
                    <a href="/api/login">Logga in</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      <div className="relative">
        <header className="container mx-auto px-4 py-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="Fritidscenter" className="h-12 w-auto" />
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Välkommen till Fritidscenter</CardTitle>
                <CardDescription>
                  Välj din roll och anläggning för att komma igång
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Roll</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role" data-testid="select-role">
                      <SelectValue placeholder="Välj roll" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALJARE">Säljare</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anlaggning">Anläggning (valfritt)</Label>
                  <Select value={anlaggning} onValueChange={setAnlaggning}>
                    <SelectTrigger id="anlaggning" data-testid="select-anlaggning">
                      <SelectValue placeholder="Välj anläggning" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Ingen anläggning</SelectItem>
                      <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                      <SelectItem value="Göteborg">Göteborg</SelectItem>
                      <SelectItem value="Trollhättan">Trollhättan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleComplete}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-complete-registration"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    "Slutför registrering"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
