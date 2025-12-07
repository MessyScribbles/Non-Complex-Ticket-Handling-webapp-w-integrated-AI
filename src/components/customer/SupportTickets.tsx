// src/components/customer/SupportTickets.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase'; // Import 'auth' to get current user
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  createdAt: any;
  liveChatId?: string;
}

interface SupportTicketsProps {
  onNavigateToView: (view: string) => void;
  MenuButton: React.ReactElement; // ADDED INTERFACE
}

const SupportTickets = ({ onNavigateToView, MenuButton }: SupportTicketsProps) => { // MODIFIED SIGNATURE
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null); // NEW: State for current user UID
  const { toast } = useToast();

  // NEW: Listen for auth state changes to get current user UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []); // Run only once on mount

  useEffect(() => {
    if (!APP_ID) {
      setError("Firebase Project ID (APP_ID) is not defined. Cannot fetch tickets.");
      setLoading(false);
      return;
    }

    // Only fetch tickets if currentUserUid is available, or if it's the initial load
    // The query can be refined here to only fetch tickets for the current user if desired,
    // but the current onSnapshot is fine for real-time updates for *all* tickets,
    // and we'll filter for redirection.
    const ticketsCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/support_tickets`);
    const q = query(ticketsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets: Ticket[] = [];
      snapshot.forEach(doc => {
        fetchedTickets.push({ id: doc.id, ...doc.data() } as Ticket);
      });
      setTickets(fetchedTickets);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets. Please check console for details.");
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load support tickets.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [APP_ID, toast]); // Re-run when APP_ID changes

  // NEW: Effect to automatically redirect to live chat if a relevant ticket status changes
  useEffect(() => {
    if (!currentUserUid || !tickets.length) {
      return; // Do nothing if user is not logged in or no tickets are loaded
    }

    const myTicketInProgress = tickets.find(
      (ticket) =>
        ticket.customerId === currentUserUid &&
        ticket.status === 'in-progress' &&
        ticket.liveChatId // Ensure liveChatId exists
    );

    if (myTicketInProgress) {
      // Check if the current view is NOT already the live chat for this ticket
      // This prevents infinite re-redirections if the user is already there
      const targetPath = `live-chat/${myTicketInProgress.liveChatId}`;
      if (!window.location.pathname.includes(targetPath)) {
        toast({
          title: "Live Chat Ready!",
          description: `Your ticket #${myTicketInProgress.id} is now in live chat. Redirecting...`,
          variant: "info"
        });
        onNavigateToView(targetPath);
      }
    }
  }, [tickets, currentUserUid, onNavigateToView, toast]); // Re-run when tickets or currentUserUid changes

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "in-progress":
        return <AlertCircle className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "in-progress":
        return "info";
      case "resolved":
        return "success";
      default:
        return "warning";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "warning";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading tickets...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">Error: {error}</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Blue Header with Menu Button */}
      <div className="p-6 border-b border-border bg-primary"> {/* MODIFIED */}
        <div className="flex items-center justify-start gap-4"> {/* MODIFIED */}
          {MenuButton} {/* ADDED */}
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground mb-2">Support Tickets</h1> {/* MODIFIED */}
            <p className="text-primary-foreground opacity-80"> {/* MODIFIED */}
              Track and manage your support requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="p-6 shadow-card hover:shadow-elegant transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary"> {/* MODIFIED for lively UX */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {ticket.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground text-sm mb-3">
                    {ticket.description}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <Badge variant={getStatusColor(ticket.status) as any} className="gap-1">
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </Badge>
                  <Badge variant={getPriorityColor(ticket.priority) as any} className="ml-2">
                    {ticket.priority} priority
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Ticket #{ticket.id}</span>
                <span>Created: {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
              </div>
              {/* This button is still useful for manual joining if auto-redirect fails or user navigates away */}
              {ticket.status === 'in-progress' && ticket.liveChatId && (
                <div className="mt-4 pt-4 border-t border-border">
                  {/* Use onNavigateToView to switch to live-chat view */}
                  <Button variant="info" onClick={() => onNavigateToView(`live-chat/${ticket.liveChatId}`)}>
                    <MessageSquare className="h-4 w-4 mr-2" /> Join Live Chat
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;