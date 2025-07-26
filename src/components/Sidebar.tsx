// src/components/Sidebar.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Ticket,
  BookOpen,
  Calendar,
  Megaphone,
  LayoutDashboard,
  Settings,
  CheckSquare,
  LogOut,
  Database,
  MessageSquareText // Keep MessageSquareText for LiveChatInterface header
} from "lucide-react";

interface SidebarProps {
  userType: "customer" | "admin";
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const customerMenuItems = [
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "tickets", label: "Support Tickets", icon: Ticket },
  // Removed the "Live Chat" link from the customer sidebar
  // { id: "live-chat", label: "Live Chat", icon: MessageSquareText },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "meetings", label: "Meetings", icon: Calendar },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "profile", label: "Profile", icon: Settings },
];

const adminMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tickets", label: "Ticket Management", icon: Ticket },
  { id: "knowledge", label: "Knowledge Base Management", icon: BookOpen },
  { id: "announcements", label: "Announcement Management", icon: Megaphone },
  { id: "tasks", label: "Task Management", icon: CheckSquare },
  { id: "meetings", label: "Meeting Management", icon: Calendar },
  { id: "profile", label: "Profile", icon: Settings },
  { id: "populate-data", label: "Populate Data (Dev)", icon: Database },
];

const Sidebar = ({ userType, activeView, onViewChange, onLogout }: SidebarProps) => {
  const menuItems = userType === "customer" ? customerMenuItems : adminMenuItems;

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col shadow-card">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {userType === "customer" ? "Support Portal" : "Admin Portal"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {userType === "customer" ? "Customer Portal" : "Consultant Portal"}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeView === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                activeView === item.id && "shadow-card",
                "transition-all duration-200 ease-in-out",
                "hover:bg-accent hover:text-accent-foreground",
                "hover:shadow-lg hover:shadow-cyan-400/50"
              )}
              onClick={() => {
                // No special handling for 'live-chat' in sidebar anymore
                onViewChange(item.id);
              }}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;