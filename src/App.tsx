import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SupportPortal from "./pages/SupportPortal";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import KnowledgeBaseArticle from "./pages/KnowledgeBaseArticle";
import TicketDetail from "./pages/TicketDetail";
import MeetingDetail from "./pages/MeetingDetail";
import CreateAdminUserPage from "./pages/CreateAdminUserPage";
// Removed LiveChatInterface import as it's now rendered directly by SupportPortal
// import LiveChatInterface from "./components/LiveChatInterface";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const queryClient = new QueryClient();

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"customer" | "admin" | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserRole(userData.role as "customer" | "admin" || 'customer');
          } else {
            console.warn("User document not found for UID:", user.uid, ". Defaulting to 'customer' role.");
            setUserRole('customer');
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setUserRole('customer');
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen text-lg text-muted-foreground">
        Loading application...
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/create-admin" element={<CreateAdminUserPage />} />

            <Route
              path="/"
              element={
                currentUser && userRole ? (
                  // Ensure userType and onLogout are passed here
                  <SupportPortal userType={userRole} onLogout={handleLogout} />
                ) : (
                  <Index />
                )
              }
            />
            <Route path="/announcements/:id" element={<AnnouncementDetail />} />
            <Route path="/knowledge-base/:id" element={<KnowledgeBaseArticle />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/meetings/:id" element={<MeetingDetail />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;