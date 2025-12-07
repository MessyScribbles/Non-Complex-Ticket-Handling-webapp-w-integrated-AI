// src/pages/SupportPortal.tsx
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ChatInterface } from "@/components/customer/ChatInterface";
import SupportTickets from "@/components/customer/SupportTickets";
import KnowledgeBase from "@/components/customer/KnowledgeBase";
import Meetings from "@/components/customer/Meetings";
import Announcements from "@/components/customer/Announcements";
import Dashboard from "@/components/admin/Dashboard";
import TicketManagement from "@/components/admin/TicketManagement";
import KnowledgeBaseManagement from "@/components/admin/KnowledgeBaseManagement";
import AnnouncementManagement from "@/components/admin/AnnouncementManagement";
import TaskManagement from "@/components/admin/TaskManagement";
import MeetingManagement from "@/components/admin/MeetingManagement";
import PopulateFirestoreData from "@/components/PopulateFirestoreData";
import ProfileSettings from "@/components/ProfileSettings";
import LiveChatInterface from "@/components/LiveChatInterface"; 
import { Menu } from "lucide-react"; 
import { Button } from "@/components/ui/button"; 
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; 

interface SupportPortalProps {
  userType: "customer" | "admin";
  onLogout: () => void;
  userName: string; // ADDED
}

const SupportPortal = ({ userType, onLogout, userName }: SupportPortalProps) => { // ADDED userName
  const [activeView, setActiveView] = useState(
    userType === "customer" ? "knowledge" : "dashboard"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  // NEW: Menu trigger element definition (passed to page components)
  const MenuButton = (
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" className="text-primary-foreground">
        <Menu className="w-6 h-6" />
      </Button>
    </SheetTrigger>
  );

  const renderContent = () => {
    // Explicitly handle live-chat view with ID extraction and validation
    if (activeView.startsWith("live-chat/")) {
      const parts = activeView.split('/');
      const liveChatId = parts.length > 1 ? parts[1] : null;

      if (liveChatId) {
        return <LiveChatInterface liveChatId={liveChatId} onNavigateToView={setActiveView} />;
      } else {
        console.error("Live chat ID missing from activeView path:", activeView);
        return <p>Error: Live chat session ID missing. Please go back to the tickets list to try again.</p>;
      }
    }
    
    if (activeView === "profile") {
      return <ProfileSettings MenuButton={MenuButton} />;
    }

    if (userType === "customer") {
      switch (activeView) {
        case "chat":
          return <ChatInterface onNavigateToView={setActiveView} MenuButton={MenuButton} />;
        case "tickets":
          return <SupportTickets onNavigateToView={setActiveView} MenuButton={MenuButton} />;
        case "knowledge":
          return <KnowledgeBase MenuButton={MenuButton} />;
        case "meetings":
          return <Meetings MenuButton={MenuButton} />;
        case "announcements":
          return <Announcements MenuButton={MenuButton} />;
        default:
          return <KnowledgeBase MenuButton={MenuButton} />;
      }
    } else { // Admin Portal Views
      switch (activeView) {
        case "dashboard":
          return <Dashboard MenuButton={MenuButton} />;
        case "tickets":
          return <TicketManagement onNavigateToView={setActiveView} MenuButton={MenuButton} />;
        case "knowledge":
          return <KnowledgeBaseManagement MenuButton={MenuButton} />;
        case "announcements":
          return <AnnouncementManagement MenuButton={MenuButton} />;
        case "tasks":
          return <TaskManagement MenuButton={MenuButton} />;
        case "meetings":
          return <MeetingManagement MenuButton={MenuButton} />;
        case "populate-data":
            return <PopulateFirestoreData />; // PopulateData is simple and does not need header/button
        default:
          return <Dashboard MenuButton={MenuButton} />;
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      
      {/* 1. OFF-CANVAS SIDEBAR SHEET */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r border-border h-screen flex flex-col shadow-card">
          <Sidebar
            userType={userType}
            activeView={activeView}
            onViewChange={(view) => {
              setActiveView(view);
              setIsSidebarOpen(false); // Close sidebar on navigation
            }}
            onLogout={onLogout}
            userName={userName} // ADDED
          />
        </SheetContent>

        {/* 2. MAIN CONTENT AREA - REMOVED CONFLICTING GLOBAL HEADER! */}
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </Sheet>
    </div>
  );
};

export default SupportPortal;