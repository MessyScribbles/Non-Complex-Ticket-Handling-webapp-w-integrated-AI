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
  MessageSquareText
} from "lucide-react";

interface SidebarProps {
  userType: "customer" | "admin";
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  userName: string; // ADDED
}

const customerMenuItems = [
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "tickets", label: "Support Tickets", icon: Ticket },
  { id: "knowledge", label: "ALIAS Base", icon: BookOpen }, // RENAMED
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

const Sidebar = ({ userType, activeView, onViewChange, onLogout, userName }: SidebarProps) => { // ADDED userName
  const menuItems = userType === "customer" ? customerMenuItems : adminMenuItems;

  return (
    // Outer classes managed by SheetContent, inner content should fill container
    <div className="flex flex-col h-full w-full overflow-y-auto"> 
      {/* Sidebar Header - Blue background/White text */}
      <div className="p-6 border-b border-border bg-primary text-primary-foreground">
        <h2 className="text-xl font-bold mb-2">
          {`Hey, ${userName}`} {/* MODIFIED: Personalized greeting */}
        </h2>
        <p className="text-sm opacity-70">
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
                activeView === item.id && "shadow-card text-primary-foreground",
                "transition-all duration-200 ease-in-out",
                "hover:bg-accent hover:text-accent-foreground",
                "hover:shadow-lg hover:shadow-cyan-400/50"
              )}
              onClick={() => {
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