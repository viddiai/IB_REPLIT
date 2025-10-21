import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function TestImap() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/test-imap');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        results: []
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">IMAP Anslutningstest</h1>
          <p className="text-muted-foreground mt-2">
            Testa IMAP-anslutningen för alla anläggningar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Testa Anslutning</CardTitle>
            <CardDescription>
              Klicka på knappen för att testa IMAP-anslutningen till alla tre anläggningar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testConnection} 
              disabled={testing}
              data-testid="button-test-imap"
              className="gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testar anslutning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Testa IMAP Anslutning
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Testresultat</h2>
              <span className="text-sm text-muted-foreground">
                {new Date(results.timestamp).toLocaleString('sv-SE')}
              </span>
            </div>

            {results.error && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Fel vid test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{results.error}</p>
                </CardContent>
              </Card>
            )}

            {results.results && results.results.length > 0 && (
              <div className="space-y-4">
                {results.results.map((result: any, index: number) => (
                  <Card key={index} data-testid={`card-result-${result.facility}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          {result.facility}
                        </CardTitle>
                        <Badge 
                          variant={result.status === 'success' ? 'default' : 'destructive'}
                          data-testid={`badge-status-${result.facility}`}
                        >
                          {result.status === 'success' ? 'Ansluten' : 'Misslyckades'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Server:</span>
                          <p className="text-muted-foreground">{result.host}:{result.port}</p>
                        </div>
                        <div>
                          <span className="font-medium">Konfiguration:</span>
                          <p className="text-muted-foreground">
                            Användare: {result.userConfigured ? '✓' : '✗'} | 
                            Lösenord: {result.passwordConfigured ? '✓' : '✗'}
                          </p>
                        </div>
                      </div>
                      
                      {result.message && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Meddelande:</p>
                          <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                        </div>
                      )}
                      
                      {result.errorName && (
                        <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                          <p className="text-sm font-medium text-destructive">Feltyp:</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.errorName} {result.errorCode ? `(${result.errorCode})` : ''}
                          </p>
                        </div>
                      )}
                      
                      {result.errorStack && (
                        <details className="mt-3">
                          <summary className="text-sm font-medium cursor-pointer">Stack trace</summary>
                          <pre className="text-xs mt-2 p-3 bg-muted rounded-md overflow-x-auto">
                            {result.errorStack}
                          </pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
