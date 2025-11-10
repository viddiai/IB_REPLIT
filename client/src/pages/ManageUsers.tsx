import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, Edit, Clock, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { User, SellerPool, UserManagementAuditLogWithNames } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserWithPools = User & { sellerPools: SellerPool[] };

const editUserSchema = z.object({
  firstName: z.string().min(1, "Förnamn krävs"),
  lastName: z.string().min(1, "Efternamn krävs"),
  email: z.string().email("Ogiltig e-postadress"),
  role: z.enum(["MANAGER", "SALJARE"]),
  anlaggning: z.enum(["Falkenberg", "Göteborg", "Trollhättan"]).nullable(),
  isActive: z.boolean(),
  emailOnLeadAssignment: z.boolean(),
});

export default function ManageUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserWithPools | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<UserWithPools[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: auditLogs = [] } = useQuery<UserManagementAuditLogWithNames[]>({
    queryKey: ["/api/admin/users", editingUser?.id, "audit"],
    enabled: !!editingUser?.id,
  });

  const editUserForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "SALJARE",
      anlaggning: null,
      isActive: true,
      emailOnLeadAssignment: true,
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editUserSchema>) => {
      return apiRequest("PATCH", `/api/admin/users/${editingUser?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", editingUser?.id, "audit"] });
      toast({
        title: "Användare uppdaterad",
        description: "Användarens inställningar har sparats.",
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte uppdatera användare. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: UserWithPools) => {
    setEditingUser(user);
    editUserForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      role: user.role,
      anlaggning: user.anlaggning,
      isActive: user.isActive,
      emailOnLeadAssignment: user.emailOnLeadAssignment,
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = (data: z.infer<typeof editUserSchema>) => {
    updateUserMutation.mutate(data);
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email;
  };

  const getFieldDisplayName = (field: string) => {
    const fieldNames: Record<string, string> = {
      firstName: "Förnamn",
      lastName: "Efternamn",
      email: "E-postadress",
      role: "Roll",
      anlaggning: "Anläggning",
      isActive: "Aktiv status",
      emailOnLeadAssignment: "E-postnotifikationer",
    };
    return fieldNames[field] || field;
  };

  const formatFieldValue = (field: string, value: string | null) => {
    if (value === null || value === "null") return "Ingen";
    if (field === "role") {
      return value === "MANAGER" ? "Manager" : "Säljare";
    }
    if (field === "isActive" || field === "emailOnLeadAssignment") {
      return value === "true" ? "Ja" : "Nej";
    }
    return value;
  };

  if (!user || user.role !== "MANAGER") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Åtkomst nekad</CardTitle>
            <CardDescription>Endast managers har åtkomst till denna sida</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Hantera användare</h1>
        <p className="text-muted-foreground mt-1">Visa och redigera inställningar för alla säljare</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Användarlista</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? "användare" : "användare"} registrerad{users.length === 1 ? "" : "e"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Anläggning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>E-post notif.</TableHead>
                  <TableHead>Tillgänglighet</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => {
                  const hasActivePools = userItem.sellerPools.some(pool => pool.isEnabled);
                  return (
                    <TableRow key={userItem.id}>
                      <TableCell className="font-medium" data-testid={`text-user-name-${userItem.id}`}>
                        {getUserDisplayName(userItem)}
                      </TableCell>
                      <TableCell data-testid={`text-user-email-${userItem.id}`}>{userItem.email}</TableCell>
                      <TableCell>
                        <Badge variant={userItem.role === "MANAGER" ? "default" : "outline"} data-testid={`badge-user-role-${userItem.id}`}>
                          {userItem.role === "MANAGER" ? "Manager" : "Säljare"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-user-facility-${userItem.id}`}>
                        {userItem.anlaggning || <span className="text-muted-foreground">Ingen</span>}
                      </TableCell>
                      <TableCell>
                        {userItem.isActive ? (
                          <Badge variant="default" className="bg-green-600" data-testid={`badge-user-active-${userItem.id}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600" data-testid={`badge-user-inactive-${userItem.id}`}>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inaktiv
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {userItem.emailOnLeadAssignment ? (
                          <Badge variant="outline" className="text-green-600 border-green-600" data-testid={`badge-user-email-on-${userItem.id}`}>
                            På
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600" data-testid={`badge-user-email-off-${userItem.id}`}>
                            Av
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {userItem.sellerPools.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Inga pooler</span>
                        ) : hasActivePools ? (
                          <div className="flex flex-wrap gap-1">
                            {userItem.sellerPools
                              .filter(pool => pool.isEnabled)
                              .map(pool => (
                                <Badge key={pool.id} variant="default" className="bg-green-600 text-xs" data-testid={`badge-pool-${pool.id}`}>
                                  {pool.anlaggning}
                                </Badge>
                              ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Alla inaktiva</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(userItem)}
                          data-testid={`button-edit-user-${userItem.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Redigera
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera användare</DialogTitle>
            <DialogDescription>
              Uppdatera användarinformation för {editingUser ? getUserDisplayName(editingUser) : ""}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings" data-testid="tab-user-settings">Inställningar</TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-user-audit">Ändringshistorik</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <Form {...editUserForm}>
                <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={editUserForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Förnamn</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editUserForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Efternamn</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editUserForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-postadress</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-edit-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={editUserForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-role">
                                <SelectValue placeholder="Välj roll" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SALJARE">Säljare</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editUserForm.control}
                      name="anlaggning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anläggning</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "NONE" ? null : value)}
                            value={field.value || "NONE"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-facility">
                                <SelectValue placeholder="Välj anläggning" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">Ingen anläggning</SelectItem>
                              <SelectItem value="Falkenberg">Falkenberg</SelectItem>
                              <SelectItem value="Göteborg">Göteborg</SelectItem>
                              <SelectItem value="Trollhättan">Trollhättan</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Säljare ser bara leads från sin anläggning
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editUserForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Aktiv användare</FormLabel>
                          <FormDescription>
                            Inaktiva användare kan inte logga in i systemet
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editUserForm.control}
                    name="emailOnLeadAssignment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">E-postnotifikationer</FormLabel>
                          <FormDescription>
                            Få e-post när nya leads tilldelas
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-email-notifications"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setEditingUser(null);
                        editUserForm.reset();
                      }}
                      data-testid="button-cancel-edit"
                    >
                      Avbryt
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                      data-testid="button-save-edit"
                    >
                      {updateUserMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Spara ändringar
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4 mt-4">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Ingen ändringshistorik tillgänglig</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="font-medium">
                                {getFieldDisplayName(log.field)} ändrades
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(log.createdAt), {
                                  addSuffix: true,
                                  locale: sv,
                                })}
                              </p>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Från: </span>
                              <span className="font-medium">
                                {formatFieldValue(log.field, log.fromValue)}
                              </span>
                              <span className="text-muted-foreground mx-2">→</span>
                              <span className="font-medium">
                                {formatFieldValue(log.field, log.toValue)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Ändrad av: {log.changedByName}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
