// src/pages/TicketDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Ensure useNavigate is imported
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Calendar, MessageSquare } from "lucide-react";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// Removed TicketDetailProps interface as it no longer needs onNavigateToView prop
// interface TicketDetailProps {
//   onNavigateToView: (view: string) => void;
// }

// Update component signature to remove onNavigateToView prop
const TicketDetail: React.FC = () => { // Removed props from here
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !APP_ID) {
      setLoading(false);
      setError("Ticket ID or APP_ID is missing.");
      return;
    }

    const ticketRef = doc(db, `artifacts/${APP_ID}/public/data/support_tickets`, id);
    const unsubscribe = onSnapshot(ticketRef, (docSnap) => {
      if (docSnap.exists()) {
        setTicket({ id: docSnap.id, ...docSnap.data() } as Ticket);
      } else {
        setError("Ticket not found.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching ticket details:", err);
      setError("Failed to load ticket details.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, APP_ID]);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "in-progress": return <AlertCircle className="w-4 h-4" />;
      case "resolved": return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "warning";
      case "in-progress": return "info";
      case "resolved": return "success";
      default: return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      case "low": return "success";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading ticket details...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">{error}</h1>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          &larr; Back to Support Tickets
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Ticket Details</h1>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card className="p-6 shadow-card">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <CardTitle className="text-xl font-semibold text-foreground mb-2">
                  {ticket.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  Ticket #{ticket.id}
                </CardDescription>
              </div>
              <div className="text-right space-y-2">
                <Badge variant={getStatusColor(ticket.status) as any} className="gap-1">
                  {getStatusIcon(ticket.status)} {ticket.status}
                </Badge>
                <Badge variant={getPriorityColor(ticket.priority) as any} className="ml-2">
                  {ticket.priority} priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground leading-relaxed mb-4">
              {ticket.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Created: {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'} at {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
            </div>
            {ticket.status === 'in-progress' && ticket.liveChatId && (
              <div className="mt-6 pt-4 border-t border-border">
                {/* Use navigate directly for live chat route */}
                <Button variant="info" onClick={() => navigate(`/live-chat/${ticket.liveChatId}`)}>
                  <MessageSquare className="h-4 w-4 mr-2" /> Join Live Chat
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 p-6 shadow-card">
          <CardTitle className="text-lg font-semibold mb-4">Ticket History / Updates</CardTitle>
          <CardContent className="p-0">
            <p className="text-muted-foreground">Updates and comments on this ticket will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketDetail;