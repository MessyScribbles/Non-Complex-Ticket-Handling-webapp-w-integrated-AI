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
import MeetingManagement from "@/components/admin/MeetingManagement"; // Import the new component
import PopulateFirestoreData from "@/components/PopulateFirestoreData";
import ProfileSettings from "@/components/ProfileSettings";
import LiveChatInterface from "@/components/LiveChatInterface"; // Make sure this import is correct

interface SupportPortalProps {
  userType: "customer" | "admin";
  onLogout: () => void;
}

const SupportPortal = ({ userType, onLogout }: SupportPortalProps) => {
  const [activeView, setActiveView] = useState(
    userType === "customer" ? "knowledge" : "dashboard"
  );

  const renderContent = () => {
    if (activeView === "profile") {
      return <ProfileSettings />;
    }

    // Explicitly handle live-chat view with ID extraction and validation
    if (activeView.startsWith("live-chat/")) {
      const parts = activeView.split('/');
      // Ensure that 'parts' has at least 2 elements (e.g., ["live-chat", "someId"])
      const liveChatId = parts.length > 1 ? parts[1] : null;

      if (liveChatId) {
        // Only render LiveChatInterface if a valid liveChatId is extracted
        return <LiveChatInterface liveChatId={liveChatId} onNavigateToView={setActiveView} />;
      } else {
        // Log an error or handle the case where liveChatId is missing from the path
        console.error("Live chat ID missing from activeView path:", activeView);
        // You might want to redirect to a default view or show an error message to the user
        // For example, redirect back to the tickets page for admin:
        // setActiveView('tickets'); // Or a general error page
        return <p>Error: Live chat session ID missing. Please go back to the tickets list to try again.</p>;
      }
    }

    if (userType === "customer") {
      switch (activeView) {
        case "chat":
          return <ChatInterface onNavigateToView={setActiveView} />;
        case "tickets":
          return <SupportTickets onNavigateToView={setActiveView} />;
        case "knowledge":
          return <KnowledgeBase />;
        case "meetings":
          return <Meetings />;
        case "announcements":
          return <Announcements />;
        default:
          return <KnowledgeBase />;
      }
    } else { // Admin Portal Views
      switch (activeView) {
        case "dashboard":
          return <Dashboard />;
        case "tickets":
          return <TicketManagement onNavigateToView={setActiveView} />;
        case "knowledge":
          return <KnowledgeBaseManagement />;
        case "announcements":
          return <AnnouncementManagement />;
        case "tasks":
          return <TaskManagement />;
        case "meetings": // Render MeetingManagement for admin's 'meetings' view
          return <MeetingManagement />;
        case "populate-data":
            return <PopulateFirestoreData />;
        default:
          return <Dashboard />;
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        userType={userType}
        activeView={activeView}
        onViewChange={setActiveView}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default SupportPortal;