// src/components/customer/ChatInterface.tsx

import React, { useState, useRef, useEffect } from 'react'; // Import React and hooks
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '@/lib/firebase'; // Import auth and db instances
import { Button } from '@/components/ui/button'; // Import Button component
import { Input } from '@/components/ui/input'; // Import Input component
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea component
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Import Avatar components
import { sendMessageToAI, GeminiMessage, AiResponse, AiTicketAction, createTicketConfirmed } from '@/lib/ai'; // Import AI functions and types
import { cn } from '@/lib/utils'; // Import cn utility
import { Bot, User, CornerDownLeft, LoaderCircle, History, Trash2, Edit, Download, XCircle, Star } from 'lucide-react'; // Import Lucide icons
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog'; // Import Dialog components
import { Label } from '@/components/ui/label'; // Import Label component
import { Card } from '@/components/ui/card'; // Import Card component
import { Textarea } from '@/components/ui/textarea'; // Import Textarea component
import { useToast } from '@/hooks/use-toast'; // Import useToast hook
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged from Firebase Auth

import { useNavigate } from 'react-router-dom'; // Import useNavigate hook


// Moved ChatMessage interface definition outside the component
interface ChatMessage {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: any; // Firestore Timestamp
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any; // Firestore Timestamp
  lastUpdated: any; // Firestore Timestamp
}

interface ChatInterfaceProps {
  onNavigateToView: (view: string) => void; // Prop for navigating within SupportPortal
}

export function ChatInterface({ onNavigateToView }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState('New Chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  // States for ticket creation dialog
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [ticketFormSubject, setTicketFormSubject] = useState('');
  const [ticketFormReason, setTicketFormReason] = useState('');
  const [ticketFormName, setTicketFormName] = useState('');
  const [ticketFormEmail, setTicketFormEmail] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // States for chat review dialog
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate hook

  // Listen for auth state changes to get current user UID, Email, and Display Name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user ? user.uid : null);
      setCurrentUserEmail(user ? user.email : null);
      setCurrentUserName(user ? user.displayName || user.email?.split('@')[0] || 'User' : null);
    });
    return () => unsubscribe();
  }, []);

  // Effect to manage initial session or create a new one
  useEffect(() => {
    if (!currentUserUid) {
      setCurrentSessionId(null);
      setMessages([]);
      setCurrentSessionTitle('New Chat');
      return;
    }

    if (!currentSessionId) {
      const createInitialSession = async () => {
        try {
          const newSessionRef = await addDoc(collection(db, 'chatSessions'), {
            userId: currentUserUid,
            title: 'Chat ' + new Date().toLocaleString(),
            createdAt: new Date(),
            lastUpdated: new Date(),
          });
          setCurrentSessionId(newSessionRef.id);
          setCurrentSessionTitle('Chat ' + new Date().toLocaleString());
          setMessages([]);
          toast({
            title: "New chat session started!",
            description: "Your conversation will be saved automatically.",
            variant: "success"
          });
        } catch (error) {
          console.error("Error auto-creating new session:", error);
          toast({
            title: "Error",
            description: "Failed to auto-create a new chat session. Check console for permissions.",
            variant: "destructive"
          });
        }
      };
      createInitialSession();
    }

    return () => {};
  }, [currentUserUid, currentSessionId]);


  // Effect to load messages for the currently active chat session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const messagesCollectionRef = collection(db, `chatSessions/${currentSessionId}/messages`);
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: ChatMessage[] = []; // Use ChatMessage interface here
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error loading chat",
        description: "Failed to load messages for this session.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [currentSessionId, toast]);

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = inputValue.trim();
    if (!userMessage || !currentUserUid || !currentUserEmail || !currentSessionId) return;

    setInputValue('');
    setIsLoading(true);

    await updateDoc(doc(db, 'chatSessions', currentSessionId), {
      lastUpdated: new Date()
    });

    const validMessages = Array.isArray(messages) ? messages : [];

    const history: GeminiMessage[] = validMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const aiResponse: AiResponse = await sendMessageToAI(db, currentSessionId, history, userMessage, currentUserUid, currentUserEmail);

    setIsLoading(false);

    if (aiResponse.type === "action" && aiResponse.action.action === "create_ticket") {
      setTicketFormSubject(aiResponse.action.title);
      setTicketFormReason(aiResponse.action.description);
      setTicketFormName(currentUserName || currentUserEmail.split('@')[0] || '');
      setTicketFormEmail(currentUserEmail);
      setIsTicketFormOpen(true);
      toast({
        title: "AI suggests creating a ticket!",
        description: "Please review and confirm the details.",
        variant: "info"
      });
    }
  };

  const handleEditTitle = async () => {
    if (!currentSessionId || !editedTitle.trim()) return;

    setIsEditingTitle(false);
    try {
      await updateDoc(doc(db, 'chatSessions', currentSessionId), {
        title: editedTitle.trim(),
        lastUpdated: new Date()
      });
      setCurrentSessionTitle(editedTitle.trim());
      toast({
        title: "Title updated!",
        description: `Session title changed to "${editedTitle.trim()}".`,
        variant: "success"
      });
    } catch (error) {
      console.error("Error updating title:", error);
      toast({
        title: "Error",
        description: "Failed to update chat title.",
        variant: "destructive"
      });
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast({
        title: "No messages to export",
        description: "The current chat session is empty.",
        variant: "warning"
      });
      return;
    }

    const chatData = {
      sessionId: currentSessionId,
      sessionTitle: currentSessionTitle,
      exportedAt: new Date().toISOString(),
      messages: messages.map(msg => ({
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate().toISOString() : msg.timestamp
      }))
    };

    const jsonString = JSON.stringify(chatData, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat_history.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Chat Exported!",
      description: `"${currentSessionTitle}" chat history downloaded as JSON.`,
      variant: "success"
    });
  };

  const handleTerminateChatClick = () => {
    if (!currentSessionId) {
      toast({
        title: "No active chat",
        description: "There is no chat session to terminate.",
        variant: "warning"
      });
      return;
    }
    setIsReviewDialogOpen(true);
  };

  const handleSkipReviewAndTerminate = async () => {
    if (!currentSessionId) return;

    setIsSubmittingReview(true);
    try {
      await deleteChatSession(currentSessionId);

      setIsReviewDialogOpen(false);
      setReviewRating(0);
      setReviewFeedback('');

      toast({
        title: "Chat Terminated!",
        description: "Current chat session closed and deleted.",
        variant: "info"
      });

      onNavigateToView('knowledge');
    } catch (error) {
      console.error("Error skipping review and terminating chat:", error);
      toast({
        title: "Error",
        description: "Failed to terminate chat session.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };


  const handleReviewSubmit = async () => {
    if (!currentUserUid || !currentSessionId) return;

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'chatReviews'), {
        sessionId: currentSessionId,
        userId: currentUserUid,
        rating: reviewRating,
        feedback: reviewFeedback.trim(),
        createdAt: new Date(),
      });

      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback!",
        variant: "success"
      });

      await deleteChatSession(currentSessionId);

      setIsReviewDialogOpen(false);
      setReviewRating(0);
      setReviewFeedback('');
      
      onNavigateToView('knowledge');
    } catch (error) {
      console.error("Error submitting review or terminating chat:", error);
      toast({
        title: "Error",
        description: "Failed to submit review or terminate chat.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      const messagesSnapshot = await getDocs(collection(db, `chatSessions/${sessionId}/messages`));
      const deleteMessagePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(doc(db, `chatSessions/${sessionId}/messages`, msgDoc.id)));
      await Promise.all(deleteMessagePromises);

      await deleteDoc(doc(db, 'chatSessions', sessionId));

      setCurrentSessionId(null);
      setCurrentSessionTitle('New Chat');
      setMessages([]);
      setInputValue('');
      setIsLoading(false);
    } catch (error) {
      console.error("Error deleting chat session from Firestore:", error);
      throw error;
    }
  };


  const handleConfirmTicketCreation = async () => {
    if (!currentUserUid || !ticketFormSubject.trim() || !ticketFormReason.trim() || !ticketFormName.trim() || !ticketFormEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for the ticket.",
        variant: "warning"
      });
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const ticketId = await createTicketConfirmed(db, {
        title: ticketFormSubject.trim(),
        description: ticketFormReason.trim(),
        customerName: ticketFormName.trim(),
        customerEmail: ticketFormEmail.trim(),
        customerId: currentUserUid,
      });

      await addDoc(collection(db, 'chatSessions', currentSessionId!, 'messages'), {
        text: `Ticket #${ticketId} has been successfully created for you. An employee will reach out to you soon.`,
        sender: 'ai',
        timestamp: new Date(),
      });

      toast({
        title: "Ticket Created!",
        description: `Your ticket #${ticketId} has been submitted. An employee will reach out to you soon.`,
        variant: "success"
      });
      setIsTicketFormOpen(false);
    } catch (error: any) {
      console.error("Error confirming ticket creation:", error);
      toast({
        title: "Ticket Creation Failed",
        description: error.message || "There was an error submitting your ticket.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <header className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{currentSessionTitle}</h2>
          {currentSessionId && (
            <Button variant="ghost" size="sm" onClick={() => { setIsEditingTitle(true); setEditedTitle(currentSessionTitle); }}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentSessionId && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportChat} disabled={messages.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export Chat
              </Button>
              <Button variant="outline" size="sm" onClick={handleTerminateChatClick}>
                <XCircle className="mr-2 h-4 w-4" /> Terminate Chat
              </Button>
            </>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-3',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot size={18} /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-md rounded-lg p-3 text-sm',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.text}
              </div>
              {message.sender === 'user' && (
                <Avatar className="h-8 w-8">
                   <AvatarFallback><User size={18} /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
               <LoaderCircle className="h-4 w-4 animate-spin" />
               <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            className="pr-16"
            disabled={isLoading || !currentUserUid}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
            disabled={isLoading || !inputValue || !currentUserUid}
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
        {!currentUserUid && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Please log in to start chatting.
          </p>
        )}
      </div>

      {/* Dialog for editing chat title (existing) */}
      <Dialog open={isEditingTitle} onOpenChange={setIsEditingTitle}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Chat Title</DialogTitle>
            <DialogDescription>
              Change the title of your current chat session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-chat-title" className="text-right">
                Title
              </Label>
              <Input
                id="edit-chat-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditTitle} disabled={!editedTitle.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Ticket Creation Form (existing) */}
      <Dialog open={isTicketFormOpen} onOpenChange={setIsTicketFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Ticket Details</DialogTitle>
            <DialogDescription>
              The AI has identified a need for a ticket. Please review and confirm the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-name">Your Name</Label>
              <Input
                id="ticket-name"
                value={ticketFormName}
                onChange={(e) => setTicketFormName(e.target.value)}
                placeholder="Your Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-email">Your Email</Label>
              <Input
                id="ticket-email"
                type="email"
                value={ticketFormEmail}
                onChange={(e) => setTicketFormEmail(e.target.value)}
                placeholder="Your Email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={ticketFormSubject}
                onChange={(e) => setTicketFormSubject(e.target.value)}
                placeholder="Subject of the ticket"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-reason">Reason / Description</Label>
              <Textarea
                id="ticket-reason"
                value={ticketFormReason}
                onChange={(e) => setTicketFormReason(e.target.value)}
                placeholder="Detailed description of your issue"
                rows={5}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketFormOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmTicketCreation} disabled={isSubmittingTicket}>
              {isSubmittingTicket ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm & Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Dialog for Chat Review */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Chat Experience</DialogTitle>
            <DialogDescription>
              Please provide your feedback on this chat session. Your input helps us improve!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "cursor-pointer",
                      reviewRating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                    )}
                    onClick={() => setReviewRating(star)}
                    size={28}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-feedback">Optional Feedback</Label>
              <Textarea
                id="review-feedback"
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Share any additional comments..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} disabled={isSubmittingReview}>
              Cancel
            </Button>
            <Button onClick={handleReviewSubmit} disabled={isSubmittingReview || reviewRating === 0}>
              {isSubmittingReview ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Review & Terminate'}
            </Button>
            <Button variant="secondary" onClick={handleSkipReviewAndTerminate} disabled={isSubmittingReview}>
              Skip & Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChatInterface;