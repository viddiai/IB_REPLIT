import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import logoPath from "@assets/logo2_1760052846978.webp";

const forgotPasswordSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Ett fel uppstod");
      }
      return result;
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "E-post skickat",
        description: "Om e-postadressen finns i systemet har ett återställningsmail skickats",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Ett fel uppstod",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    forgotPasswordMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <img src={logoPath} alt="Fritidscenter" className="h-16" />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">E-post skickat</CardTitle>
              <CardDescription className="text-center">
                Om e-postadressen finns i systemet har vi skickat ett återställningsmail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Kontrollera din inkorg och följ instruktionerna i e-postmeddelandet för att återställa ditt lösenord.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tillbaka till inloggning
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <img src={logoPath} alt="Fritidscenter" className="h-16" />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Glömt lösenord</CardTitle>
            <CardDescription className="text-center">
              Ange din e-postadress så skickar vi en återställningslänk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-postadress</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="din@email.se"
                            className="pl-9"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Skickar..." : "Skicka återställningslänk"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline" data-testid="link-back-to-login">
                <ArrowLeft className="w-3 h-3 inline mr-1" />
                Tillbaka till inloggning
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
