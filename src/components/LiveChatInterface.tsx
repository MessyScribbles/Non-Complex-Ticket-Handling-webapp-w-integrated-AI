// src/components/LiveChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
// Import CalendarIcon and ensure DialogTrigger is imported from dialog
import { User, CornerDownLeft, LoaderCircle, XCircle, MessageSquareText, CheckCircle, CalendarPlus, Calendar as CalendarIcon } from 'lucide-react'; // Added CalendarIcon
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Import DialogTrigger here
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'; // Ensure DialogTrigger is imported
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar'; // Your custom calendar component
import { format } from 'date-fns';

interface LiveChatMessage {
  id?: string;
  senderId: string;
  senderRole: 'customer' | 'admin';
  text: string;
  timestamp?: any;
}

interface LiveChatSession {
  id: string;
  ticketId: string;
  customerId: string;
  consultantId: string | null;
  status: 'open' | 'closed' | 'in-progress';
  createdAt: any;
  startedAt: any;
  closedAt?: any;
  lastMessageAt: any;
}

interface LiveChatInterfaceProps {
  liveChatId: string;
  onNavigateToView: (view: string) => void;
}

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

const LiveChatInterface: React.FC<LiveChatInterfaceProps> = ({ liveChatId, onNavigateToView }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [liveChatSession, setLiveChatSession] = useState<LiveChatSession | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'customer' | 'admin' | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // NEW: State to track auth loading
  const [otherParticipantName, setOtherParticipantName] = useState('Participant');

  // Schedule Meeting states
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [meetingDuration, setMeetingDuration] = useState('30');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingType, setMeetingType] = useState<'in-person' | 'video' | 'phone'>('video');
  const [isScheduling, setIsScheduling] = useState(false);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current user's UID and Role
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        if (userDoc.exists()) {
          setCurrentUserRole(userDoc.data().role as 'customer' | 'admin');
        } else {
          // If user exists in Auth but not Firestore, default role or force logout
          console.warn("User document not found for authenticated UID:", user.uid);
          setCurrentUserRole('customer'); // Default to customer if doc not found
        }
      } else {
        setCurrentUserUid(null);
        setCurrentUserRole(null);
        // Only navigate if not already on a public/login route to prevent loops
        if (!['/', '/login', '/signup', '/create-admin'].includes(window.location.pathname)) {
            navigate('/');
        }
      }
      setIsAuthLoading(false); // Auth loading is complete whether user is logged in or not
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch live chat session details - now depends on isAuthLoading
  useEffect(() => {
    console.log("LiveChatInterface (Session Effect): Dependencies changed. liveChatId:", liveChatId, "currentUserUid:", currentUserUid, "currentUserRole:", currentUserRole, "isAuthLoading:", isAuthLoading);

    if (isAuthLoading) { // NEW: Don't proceed if auth is still loading
      console.log("LiveChatInterface (Session Effect): Auth still loading.");
      return;
    }

    // Now, check other dependencies after auth is confirmed loaded
    if (!liveChatId || !currentUserUid || !currentUserRole) {
      console.log("LiveChatInterface (Session Effect): Skipping session fetch due to missing dependencies after auth loaded.");
      setLiveChatSession(null); // Explicitly set session to null if dependencies are missing

      // Only navigate away if liveChatId is truly missing, as currentUserUid/Role could genuinely be null if user logged out
      if (!liveChatId) {
          toast({
              title: "Error",
              description: "Chat session ID is missing or invalid.",
              variant: "destructive"
          });
          navigate('/support-portal'); // Redirect to a safe page if liveChatId is bad
      }
      return;
    }

    const sessionRef = doc(db, 'liveChats', liveChatId);
    const unsubscribe = onSnapshot(sessionRef, async (docSnap) => {
      if (docSnap.exists()) {
        const sessionData = { id: docSnap.id, ...docSnap.data() } as LiveChatSession; // Include ID from docSnap
        console.log("LiveChatInterface (Session Effect): Fetched session data:", sessionData);

        if (sessionData.customerId !== currentUserUid && sessionData.consultantId !== currentUserUid) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this chat session.",
            variant: "destructive"
          });
          console.error("LiveChatInterface (Session Effect): Access denied for this chat.");
          navigate('/support-portal');
          return;
        }

        setLiveChatSession(sessionData);
        console.log("LiveChatInterface (Session Effect): liveChatSession state updated.");


        const otherParticipantId = currentUserUid === sessionData.customerId ? sessionData.consultantId : sessionData.customerId;
        
        // --- MODIFIED LOGIC FOR DISPLAY NAME ---
        if (otherParticipantId) {
          const otherUserDoc = await getDoc(doc(db, `users/${otherParticipantId}`));
          if (otherUserDoc.exists()) {
            setOtherParticipantName(otherUserDoc.data().name || otherUserDoc.data().email?.split('@')[0] || 'Participant');
          } else {
            setOtherParticipantName('Unknown Participant'); // Fallback if user doc not found
          }
        } else if (currentUserRole === 'customer' && !sessionData.consultantId) {
            setOtherParticipantName('Waiting for Consultant'); // Customer sees this while waiting for consultant to join
        } else {
            setOtherParticipantName('AI Assistant'); // Default (e.g., if the other ID is truly null/non-user)
        }
        // ---------------------------------------


        if (currentUserRole === 'admin' && sessionData.status === 'open' && !sessionData.consultantId) {
            console.log("LiveChatInterface (Session Effect): Admin joining open chat, updating session status.");
            await updateDoc(sessionRef, {
                consultantId: currentUserUid,
                startedAt: serverTimestamp(),
                status: 'in-progress'
            });
        }

      } else {
        console.error("LiveChatInterface (Session Effect): Chat session not found or deleted.");
        toast({
          title: "Chat Not Found",
          description: "The live chat session does not exist or has been deleted.",
          variant: "destructive"
        });
        navigate('/support-portal');
      }
    }, (error) => {
      console.error("LiveChatInterface (Session Effect): Error fetching live chat session (onSnapshot error callback):", error);
      toast({
        title: "Error",
        description: "Failed to load live chat session.",
        variant: "destructive"
      });
      navigate('/support-portal');
    });

    return () => unsubscribe();
  }, [liveChatId, currentUserUid, currentUserRole, isAuthLoading, navigate, toast]); // Added isAuthLoading to dependencies

  // Fetch messages for the live chat session
  useEffect(() => {
    console.log("LiveChatInterface (Messages Effect): Dependencies changed. liveChatSession?.id:", liveChatSession?.id);
    if (!liveChatSession?.id) {
      setMessages([]);
      console.log("LiveChatInterface (Messages Effect): Skipping message fetch, no session ID.");
      return;
    }

    const messagesCollectionRef = collection(db, `liveChats/${liveChatSession.id}/messages`);
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("LiveChatInterface (Messages Effect): Messages onSnapshot triggered. Snapshot size:", querySnapshot.size);
      const msgs: LiveChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as LiveChatMessage);
      });
      setMessages(msgs);
      setIsLoading(false);
      console.log("LiveChatInterface (Messages Effect): Messages updated. Total messages:", msgs.length);
    }, (error) => {
      console.error("LiveChatInterface (Messages Effect): Error fetching live chat messages (onSnapshot error callback):", error);
      toast({
        title: "Error loading messages",
        description: "Failed to load chat messages.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [liveChatSession?.id, toast]);

  // Scroll to bottom on new messages
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
    const messageText = inputValue.trim();
    console.log("LiveChatInterface: Sending message attempt. messageText:", messageText, "currentUserUid:", currentUserUid, "currentUserRole:", currentUserRole, "liveChatSession?.id:", liveChatSession?.id);

    // Consolidated and explicit checks before sending message
    if (!messageText) {
        // Don't send empty messages, no toast needed
        return;
    }
    if (isAuthLoading || !currentUserUid || !currentUserRole) {
        toast({
            title: "Authentication Pending",
            description: "Please wait for user authentication to complete.",
            variant: "warning"
        });
        console.warn("LiveChatInterface: Message send aborted due to authentication status.");
        return;
    }
    if (!liveChatSession?.id) {
        toast({
            title: "Chat Not Ready",
            description: "Please wait for the chat session to load before sending messages.",
            variant: "warning"
        });
        console.warn("LiveChatInterface: Message send aborted, chat session not loaded.");
        return;
    }


    setIsLoading(true);
    setInputValue('');

    try {
      const messageData = {
        senderId: currentUserUid,
        senderRole: currentUserRole,
        text: messageText,
        timestamp: serverTimestamp(),
      };
      console.log("LiveChatInterface: Adding message to Firestore:", messageData);
      await addDoc(collection(db, `liveChats/${liveChatSession.id}/messages`), messageData);

      console.log("LiveChatInterface: Updating lastMessageAt for session.");
      await updateDoc(doc(db, 'liveChats', liveChatSession.id), {
        lastMessageAt: serverTimestamp(),
      });
      console.log("LiveChatInterface: Message sent successfully.");

    } catch (error) {
      console.error("LiveChatInterface: Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Check console for permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndChat = async () => {
    console.log("LiveChatInterface: Ending chat attempt. liveChatSession:", liveChatSession, "currentUserRole:", currentUserRole);
    if (!liveChatSession || !currentUserUid || liveChatSession.status === 'closed') return;

    if (currentUserRole !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only a consultant can close this chat.",
        variant: "warning"
      });
      console.warn("LiveChatInterface: Non-admin attempted to close chat.");
      return;
    }

    if (!confirm("Are you sure you want to end this live chat session?")) {
      console.log("LiveChatInterface: Chat end cancelled by user.");
      return;
    }

    setIsLoading(true);
    try {
      const sessionRef = doc(db, 'liveChats', liveChatSession.id);
      console.log("LiveChatInterface: Updating session status to closed.");
      await updateDoc(sessionRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
      });

      if (liveChatSession.ticketId) {
        console.log("LiveChatInterface: Updating associated ticket to resolved. Ticket ID:", liveChatSession.ticketId);
        const ticketRef = doc(db, `artifacts/${APP_ID}/public/data/support_tickets`, liveChatSession.ticketId);
        await updateDoc(ticketRef, {
          status: 'resolved',
        });
      } else {
        console.warn("LiveChatInterface: No ticketId found in liveChatSession, skipping ticket update.");
      }

      toast({
        title: "Chat Ended!",
        description: "Live chat session has been closed and ticket resolved.",
        variant: "success"
      });
      console.log("LiveChatInterface: Chat ended successfully, redirecting.");
      const targetView = currentUserRole === 'admin' ? 'dashboard' : 'knowledge';
      console.log("LiveChatInterface: Navigating to view:", targetView);
      onNavigateToView(targetView);
    } catch (error) {
      console.error("LiveChatInterface: Error ending chat:", error);
      toast({
        title: "Error",
        description: "Failed to end chat session. Check console for permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!liveChatSession || !currentUserUid || !meetingTitle.trim() || !meetingDate || !meetingDuration.trim() || !meetingLocation.trim() || !meetingType) {
      toast({
        title: "Missing Information",
        description: "Please fill all required meeting fields.",
        variant: "warning"
      });
      return;
    }
    if (currentUserRole !== 'admin') {
      toast({
        title: "Permission Denied",
        description: "Only a consultant can schedule meetings.",
        variant: "warning"
      });
      return;
    }

    setIsScheduling(true);
    try {
      await addDoc(collection(db, `artifacts/${APP_ID}/meetings`), {
        title: meetingTitle.trim(),
        description: meetingDescription.trim(),
        date: meetingDate,
        duration: parseInt(meetingDuration),
        location: meetingLocation.trim(),
        type: meetingType,
        status: 'upcoming',
        consultantId: currentUserUid,
        customerId: liveChatSession.customerId,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Meeting Scheduled!",
        description: `Meeting "${meetingTitle}" scheduled for ${format(meetingDate, 'PPP')}.`,
        variant: "success"
      });
      setIsScheduleMeetingOpen(false);
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDate(undefined);
      setMeetingDuration('30');
      setMeetingLocation('');
      setMeetingType('video');
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule meeting. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  // NEW: Render loading state if auth info isn't ready
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <LoaderCircle className="h-8 w-8 animate-spin mb-4" />
        Authenticating user for live chat...
      </div>
    );
  }

  // Display a loading indicator if liveChatSession is still null after auth is resolved
  if (!liveChatSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <LoaderCircle className="h-8 w-8 animate-spin mb-4" />
        Loading live chat session...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <header className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Live Chat with {otherParticipantName}
            {liveChatSession.status === 'closed' && <Badge variant="destructive" className="ml-2">Closed</Badge>}
            {liveChatSession.status === 'open' && <Badge variant="info" className="ml-2">Open</Badge>}
            {liveChatSession.status === 'in-progress' && <Badge variant="success" className="ml-2">In Progress</Badge>}
          </h2>
        </div>
        <div className="flex gap-2">
          {/* NEW: Customer Close Chat Button (visible when chat is closed) */}
          {liveChatSession.status === 'closed' && currentUserRole === 'customer' && (
            <Button 
                variant="default" 
                size="sm" 
                onClick={() => onNavigateToView('knowledge')}
            >
                <XCircle className="mr-2 h-4 w-4" /> Close Chat
            </Button>
          )}

          {/* Existing Admin Buttons (visible when chat is open or in-progress) */}
          {liveChatSession.status !== 'closed' && currentUserRole === 'admin' && (
            <>
              <Button variant="outline" size="sm" onClick={handleEndChat} disabled={isLoading}>
                 <CheckCircle className="mr-2 h-4 w-4" /> Mark as Resolved
              </Button>
              <Dialog open={isScheduleMeetingOpen} onOpenChange={setIsScheduleMeetingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Schedule Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Schedule New Meeting</DialogTitle>
                    <DialogDescription>
                      Schedule a meeting with {otherParticipantName} for this ticket.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="meeting-title">Title</Label>
                      <Input id="meeting-title" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-description">Description (Optional)</Label>
                      <Textarea id="meeting-description" value={meetingDescription} onChange={(e) => setMeetingDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-date">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !meetingDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {meetingDate ? format(meetingDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white text-black">
                          <Calendar
                            mode="single"
                            selected={meetingDate}
                            onSelect={setMeetingDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                      <Input id="meeting-duration" type="number" value={meetingDuration} onChange={(e) => setMeetingDuration(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-location">Location/Link</Label>
                      <Input id="meeting-location" value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} placeholder="e.g., Zoom Link, Office Address" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-type">Meeting Type</Label>
                      <select id="meeting-type" value={meetingType} onChange={(e) => setMeetingType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background">
                        <option value="video">Video Call</option>
                        <option value="in-person">In-person</option>
                        <option value="phone">Phone Call</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScheduleMeetingOpen(false)} disabled={isScheduling}>Cancel</Button>
                    <Button onClick={handleScheduleMeeting} disabled={isScheduling}>
                      {isScheduling ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : 'Schedule'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                message.senderId === currentUserUid ? 'justify-end' : 'justify-start'
              )}
            >
              {message.senderId !== currentUserUid && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{message.senderRole === 'admin' ? 'C' : 'U'}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-md rounded-lg p-3 text-sm',
                  message.senderId === currentUserUid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.text}
              </div>
              {message.senderId === currentUserUid && (
                <Avatar className="h-8 w-8">
                   <AvatarFallback>{currentUserRole === 'admin' ? 'C' : 'U'}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
               <LoaderCircle className="h-4 w-4 animate-spin" />
               <span className="text-sm text-muted-foreground">Sending...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={liveChatSession.status === 'closed' ? "Chat is closed." : "Type your message..."}
            className="pr-16"
            // Disable if loading, chat closed, or essential session ID is missing
            disabled={isLoading || liveChatSession.status === 'closed' || !liveChatSession?.id}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
            // Disable if loading, no input, chat closed, or essential session ID is missing
            disabled={isLoading || !inputValue || liveChatSession.status === 'closed' || !liveChatSession?.id}
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LiveChatInterface;