import { Home, LayoutDashboard, ListFilter, Settings, Car, LogOut, Users, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoPath from "@assets/logo2_1760052846978.webp";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Översikt",
    url: "/",
    icon: Home,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Leadslista",
    url: "/leads",
    icon: ListFilter,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Resurspool",
    url: "/seller-pools",
    icon: Users,
    roles: ["MANAGER"],
  },
  {
    title: "IMAP Test",
    url: "/test-imap",
    icon: Mail,
    roles: ["MANAGER"],
  },
  {
    title: "Meddelanden",
    url: "/messages",
    icon: MessageCircle,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Inställningar",
    url: "/settings",
    icon: Settings,
    roles: ["MANAGER", "SALJARE"],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  const visibleMenuItems = menuItems.filter((item) => 
    item.roles.includes(user?.role || "SALJARE")
  );

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "Användare";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          <img src={logoPath} alt="Fritidscenter" className="h-16 w-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.title === "Meddelanden" && unreadCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="ml-auto"
                          data-testid="badge-unread-messages"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
            <p className="text-xs text-muted-foreground">{user?.role || "SÄLJARE"}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Logga ut
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
