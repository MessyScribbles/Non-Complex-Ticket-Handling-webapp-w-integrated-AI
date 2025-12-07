// src/components/admin/MeetingManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, Calendar as CalendarIcon, Clock, MapPin, Video, XCircle, CheckCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge component here

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: any; // Firestore Timestamp
  duration: number;
  location: string;
  type: "in-person" | "video" | "phone";
  status: "upcoming" | "completed" | "cancelled";
  consultantId: string;
  customerId: string;
  customerName?: string;
  consultantName?: string;
  createdAt: any;
}

interface MeetingManagementProps { // ADDED
  MenuButton: React.ReactElement; // ADDED
}

const MeetingManagement: React.FC<MeetingManagementProps> = ({ MenuButton }) => { // MODIFIED: Receiving MenuButton
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formDuration, setFormDuration] = useState('60');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState<Meeting['type']>('video');
  const [formCustomerId, setFormCustomerId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Get current user UID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch meetings from Firestore (meetings where current user is consultant or customer)
  useEffect(() => {
    if (!APP_ID || !currentUserUid) {
      setLoading(false);
      setMeetings([]);
      return;
    }

    const meetingsCollectionRef = collection(db, `artifacts/${APP_ID}/meetings`);
    const q1 = query(meetingsCollectionRef, where('consultantId', '==', currentUserUid), orderBy('date', 'asc'));
    const q2 = query(meetingsCollectionRef, where('customerId', '==', currentUserUid), orderBy('date', 'asc'));

    const unsub1 = onSnapshot(q1, (snapshot1) => {
      const consultantMeetings: Meeting[] = [];
      snapshot1.forEach(doc => {
        consultantMeetings.push({ id: doc.id, ...doc.data() } as Meeting);
      });

      const unsub2 = onSnapshot(q2, (snapshot2) => {
        const customerMeetings: Meeting[] = [];
        snapshot2.forEach(doc => {
          customerMeetings.push({ id: doc.id, ...doc.data() } as Meeting);
        });

        const allMeetings = [...consultantMeetings, ...customerMeetings];
        const uniqueMeetings = Array.from(new Map(allMeetings.map(m => [m.id, m])).values());
        
        uniqueMeetings.sort((a, b) => (a.date?.toDate()?.getTime() || 0) - (b.date?.toDate()?.getTime() || 0));
        
        setMeetings(uniqueMeetings);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching customer meetings:", err);
        setError("Failed to load meetings.");
        setLoading(false);
        toast({ title: "Error", description: "Failed to load meetings.", variant: "destructive" });
      });
      return unsub2;
    }, (err) => {
      console.error("Error fetching consultant meetings:", err);
      setError("Failed to load meetings.");
      setLoading(false);
      toast({ title: "Error", description: "Failed to load meetings.", variant: "destructive" });
    });

    return () => {
      unsub1();
    };
  }, [APP_ID, currentUserUid, toast]);


  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormDate(undefined);
    setFormDuration('60');
    setFormLocation('');
    setFormType('video');
    setFormCustomerId('');
    setCurrentMeeting(null);
    setIsEditing(false);
    setIsFormOpen(false);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (meeting: Meeting) => {
    setCurrentMeeting(meeting);
    setFormTitle(meeting.title);
    setFormDescription(meeting.description);
    setFormDate(meeting.date?.toDate ? meeting.date.toDate() : undefined);
    setFormDuration(meeting.duration.toString());
    setFormLocation(meeting.location);
    setFormType(meeting.type);
    setFormCustomerId(meeting.customerId);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formDuration.trim() || !formLocation.trim() || !formType || !currentUserUid || !formCustomerId.trim()) {
      toast({
        title: "Missing fields",
        description: "Title, Date, Duration, Location, Type, and Customer ID are required.",
        variant: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const meetingData = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        date: formDate,
        duration: parseInt(formDuration),
        location: formLocation.trim(),
        type: formType,
        status: currentMeeting?.status || 'upcoming',
        consultantId: currentUserUid,
        customerId: formCustomerId.trim(),
        createdAt: currentMeeting?.createdAt || serverTimestamp(),
      };

      if (isEditing && currentMeeting) {
        const meetingRef = doc(db, `artifacts/${APP_ID}/meetings`, currentMeeting.id);
        await updateDoc(meetingRef, meetingData);
        toast({
          title: "Meeting Updated!",
          description: `Meeting "${formTitle}" has been updated.`,
          variant: "success"
        });
      } else {
        await addDoc(collection(db, `artifacts/${APP_ID}/meetings`), meetingData);
        toast({
          title: "Meeting Scheduled!",
          description: `Meeting "${formTitle}" has been scheduled.`,
          variant: "success"
        });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error saving meeting:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save meeting.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
    }
  };

  const handleCancelMeeting = async (meeting: Meeting) => {
    if (!confirm(`Are you sure you want to cancel the meeting "${meeting.title}"?`)) {
      return;
    }
    try {
      const meetingRef = doc(db, `artifacts/${APP_ID}/meetings`, meeting.id);
      await updateDoc(meetingRef, { status: 'cancelled' });
      toast({
        title: "Meeting Cancelled!",
        description: `Meeting "${meeting.title}" has been cancelled.`,
        variant: "info"
      });
    } catch (err: any) {
      console.error("Error cancelling meeting:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to cancel meeting.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm("Are you sure you want to delete this meeting? This cannot be undone.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, `artifacts/${APP_ID}/meetings`, meetingId));
      toast({
        title: "Meeting Deleted!",
        description: "The meeting has been removed.",
        variant: "success"
      });
    } catch (err: any) {
      console.error("Error deleting meeting:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete meeting.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "info";
      case "completed": return "success";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4" />;
      case "in-person": return <MapPin className="w-4 h-4" />;
      case "phone": return <Clock className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading meetings...</div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {MenuButton} {/* ADDED MENU BUTTON */}
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground mb-2">Meeting Management</h1>
              <p className="text-primary-foreground opacity-80">
                Create, edit, and manage scheduled meetings
              </p>
            </div>
          </div>
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="w-4 h-4" /> Schedule New Meeting
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {meetings.length > 0 ? (
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting) => (
                  <TableRow key={meeting.id} className={meeting.status === 'cancelled' ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{meeting.title}</TableCell>
                    <TableCell>{meeting.date?.toDate ? format(meeting.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="flex items-center gap-1">
                        {getTypeIcon(meeting.type)} {meeting.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(meeting.status) as any}>
                        {meeting.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{meeting.customerName || meeting.customerId}</TableCell>
                    <TableCell className="text-right">
                      {meeting.status === 'upcoming' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(meeting)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancelMeeting(meeting)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(meeting.id)}>
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
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No meetings found</h3>
            <p className="text-muted-foreground">Click "Schedule New Meeting" to add one.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Meeting Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Meeting' : 'Schedule New Meeting'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details of this meeting.' : 'Schedule a new meeting with a customer.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Title</Label>
              <Input id="meeting-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-description">Description (Optional)</Label>
              <Textarea id="meeting-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-customer-id">Customer ID</Label>
              <Input id="meeting-customer-id" value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} placeholder="Enter Customer UID" required disabled={isEditing} />
              <CardDescription className="text-xs text-muted-foreground">
                Find customer UID in Firebase Authentication.
              </CardDescription>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDate ? format(formDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white text-black">
                  <Calendar
                    mode="single"
                    selected={formDate}
                    onSelect={setFormDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-duration">Duration (minutes)</Label>
              <Input id="meeting-duration" type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-location">Location/Link</Label>
              <Input id="meeting-location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g., Zoom Link, Office Address" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-type">Meeting Type</Label>
              <select id="meeting-type" value={formType} onChange={(e) => setFormType(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background">
                <option value="video">Video Call</option>
                <option value="in-person">In-person</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Schedule Meeting')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingManagement;