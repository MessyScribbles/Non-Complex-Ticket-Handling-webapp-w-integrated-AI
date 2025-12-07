// src/components/admin/TicketManagement.tsx
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Eye, Edit, Trash2, MessageSquare, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from "react-router-dom";

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

interface TicketManagementProps {
  onNavigateToView: (view: string) => void;
  MenuButton: React.ReactElement; // ADDED: MenuButton prop for sidebar access
}

const TicketManagement = ({ onNavigateToView, MenuButton }: TicketManagementProps) => { // MODIFIED: Receiving MenuButton
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditingTicket, setCurrentEditingTicket] = useState<Ticket | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState<Ticket['status']>('pending');
  const [editedPriority, setEditedPriority] = useState<Ticket['priority']>('medium');

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!APP_ID) {
      setError("Firebase Project ID (APP_ID) is not defined. Cannot fetch tickets.");
      setLoading(false);
      return;
    }

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
  }, [APP_ID, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "in-progress": return <Activity className="w-4 h-4" />;
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

  const handleEditClick = (ticket: Ticket) => {
    setCurrentEditingTicket(ticket);
    setEditedTitle(ticket.title);
    setEditedDescription(ticket.description);
    setEditedStatus(ticket.status);
    setEditedPriority(ticket.priority);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!currentEditingTicket || !APP_ID) return;

    try {
      const ticketRef = doc(db, `artifacts/${APP_ID}/public/data/support_tickets`, currentEditingTicket.id);
      await updateDoc(ticketRef, {
        title: editedTitle,
        description: editedDescription,
        status: editedStatus,
        priority: editedPriority,
      });
      toast({
        title: "Ticket Updated!",
        description: `Ticket #${currentEditingTicket.id} has been updated.`,
        variant: "success"
      });
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error("Error updating ticket (Save Edit):", err);
      toast({
        title: "Error",
        description: "Failed to update ticket.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!APP_ID) return;
    if (!confirm("Are you sure you want to delete this ticket? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, `artifacts/${APP_ID}/public/data/support_tickets`, ticketId));
      toast({
        title: "Ticket Deleted!",
        description: `Ticket #${ticketId} has been deleted.`,
        variant: "success"
      });
    } catch (err) {
      console.error("Error deleting ticket:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete ticket.",
        variant: "destructive"
      });
    }
  };

  const handleAcceptTicketAndStartChat = async (ticket: Ticket) => {
    console.log("handleAcceptTicketAndStartChat called.");
    console.log("auth.currentUser:", auth.currentUser);
    console.log("auth.currentUser.uid:", auth.currentUser?.uid);

    if (!auth.currentUser || !APP_ID) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to accept tickets.",
        variant: "destructive"
      });
      console.error("Authentication check failed: auth.currentUser is null or APP_ID is missing.");
      return;
    }

    const liveChatQuery = query(collection(db, 'liveChats'), where('ticketId', '==', ticket.id));
    const liveChatSnapshot = await getDocs(liveChatQuery);

    let liveChatId = '';

    if (!liveChatSnapshot.empty) {
      liveChatId = liveChatSnapshot.docs[0].id;
      toast({
        title: "Chat Already Active",
        description: "A live chat for this ticket already exists. Joining existing chat.",
        variant: "info"
      });
    } else {
      try {
        const newLiveChatData = { // Define data to log
          ticketId: ticket.id,
          customerId: ticket.customerId,
          consultantId: auth.currentUser.uid, // Assign consultant
          status: 'open',
          createdAt: serverTimestamp(),
          startedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
        };
        // --- ADDED LOG FOR THE DATA BEING SENT ---
        console.log("TicketManagement: Attempting to create new live chat session with data:", newLiveChatData);
        // ------------------------------------------
        const newLiveChatRef = await addDoc(collection(db, 'liveChats'), newLiveChatData); // Use the data object
        liveChatId = newLiveChatRef.id;
        console.log("New live chat session created with ID:", liveChatId);
        toast({
          title: "Live Chat Created!",
          description: `Live chat started for Ticket #${ticket.id}.`,
          variant: "success"
        });
      } catch (chatErr) {
        console.error("Error creating live chat:", chatErr);
        toast({
          title: "Error",
          description: "Failed to start live chat. Check console for permissions.",
          variant: "destructive"
        });
        return;
      }
    }

    // NEW: Update the ticket document in Firestore with the new status and liveChatId
    try {
      const ticketRef = doc(db, `artifacts/${APP_ID}/public/data/support_tickets`, ticket.id);
      await updateDoc(ticketRef, {
        status: 'in-progress', // Set status to in-progress
        liveChatId: liveChatId, // Set the liveChatId on the ticket
      });
      console.log(`Ticket ${ticket.id} status updated to 'in-progress' with liveChatId: ${liveChatId}`);
      toast({
          title: "Ticket Accepted!",
          description: `Ticket #${ticket.id} is now in progress.`,
          variant: "success"
      });
    } catch (updateErr) {
        console.error("Error updating ticket status in Firestore:", updateErr);
        toast({
            title: "Error",
            description: "Failed to update ticket status in database.",
            variant: "destructive"
        });
        return; // Prevent navigation if DB update fails
    }

    // Now navigate to the live chat interface
    onNavigateToView(`live-chat/${liveChatId}`);
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
      {/* MODIFIED: Integrated MenuButton into the primary header */}
      <div className="p-6 border-b border-border bg-primary">
        <div className="flex items-center gap-4">
          {MenuButton} {/* ADDED MENU BUTTON */}
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground mb-2">Ticket Management</h1>
            <p className="text-primary-foreground opacity-80">
              View and manage all customer support tickets
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {tickets.length > 0 ? (
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>{ticket.customerName || ticket.customerEmail || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(ticket.status) as any} className="gap-1">
                        {getStatusIcon(ticket.status)} {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(ticket.priority) as any}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {ticket.status === 'pending' && (
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => handleAcceptTicketAndStartChat(ticket)}>
                          Accept & Chat
                        </Button>
                      )}
                      {ticket.status === 'in-progress' && ticket.liveChatId && (
                        <Button variant="info" size="sm" className="mr-2" onClick={() => onNavigateToView(`live-chat/${ticket.liveChatId}`)}>
                          <MessageSquare className="h-4 w-4 mr-1" /> Join Chat
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(ticket)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTicket(ticket.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No tickets found</h3>
            <p className="text-muted-foreground">Tickets created by users will appear here.</p>
          </div>
        )}
      </div>

      {/* Edit Ticket Dialog */}
      {currentEditingTicket && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Ticket #{currentEditingTicket.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select id="edit-status" value={editedStatus} onChange={(e) => setEditedStatus(e.target.value as Ticket['status'])}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background">
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <select id="edit-priority" value={editedPriority} onChange={(e) => setEditedPriority(e.target.value as Ticket['priority'])}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TicketManagement;