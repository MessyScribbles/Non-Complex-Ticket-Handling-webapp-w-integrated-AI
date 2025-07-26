// src/components/customer/Meetings.tsx
import React, { useState, useEffect } from "react"; // Import useEffect
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'; // Import Firestore functions
import { db, auth } from '@/lib/firebase'; // Import db and auth
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged

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
}

const Meetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const { toast } = useToast();

  // Listen for auth state changes to get current user UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch meetings from Firestore
  useEffect(() => {
    if (!APP_ID || !currentUserUid) {
      // Don't fetch if not authenticated or APP_ID is missing
      setLoading(false);
      return;
    }

    const meetingsCollectionRef = collection(db, `artifacts/${APP_ID}/meetings`);
    // Query for meetings where current user is either customer or consultant
    const q = query(
      meetingsCollectionRef,
      where('customerId', '==', currentUserUid)
      // Note: Firestore doesn't directly support OR queries across different fields
      // For a true OR, you'd typically fetch two separate queries and merge,
      // or use a Cloud Function to denormalize participants into an array.
      // For simplicity here, we'll just fetch for customerId.
      // If you need consultant-side meetings, you'd add another query.
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMeetings: Meeting[] = [];
      snapshot.forEach(doc => {
        fetchedMeetings.push({ id: doc.id, ...doc.data() } as Meeting);
      });
      setMeetings(fetchedMeetings);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching meetings:", err);
      setError("Failed to load meetings. Please check console for details.");
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load meetings.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [APP_ID, currentUserUid, toast]); // Re-run when currentUserUid changes

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
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === "upcoming");
  const pastMeetings = meetings.filter(m => m.status !== "upcoming");

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
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Meetings</h1>
        <p className="text-muted-foreground">
          View and manage your scheduled meetings with our consultants
        </p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Upcoming Meetings */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Meetings</h2>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <Card key={meeting.id} className="p-6 shadow-card hover:shadow-elegant transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(meeting.type)}
                        <Link to={`/meetings/${meeting.id}`} className="hover:underline">
                          <h3 className="text-lg font-semibold text-foreground">
                            {meeting.title}
                          </h3>
                        </Link>
                        <Badge variant={getStatusColor(meeting.status) as any}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">
                        {meeting.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{meeting.date?.toDate ? meeting.date.toDate().toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {meeting.date?.toDate ? meeting.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        ({meeting.duration} min)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{meeting.location}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming meetings</h3>
              <p className="text-muted-foreground">Your next meetings will appear here.</p>
            </Card>
          )}
        </div>

        {/* Past Meetings */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Past Meetings</h2>
          {pastMeetings.length > 0 ? (
            <div className="space-y-4">
              {pastMeetings.map((meeting) => (
                <Card key={meeting.id} className="p-6 shadow-card opacity-75">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(meeting.type)}
                        <Link to={`/meetings/${meeting.id}`} className="hover:underline">
                          <h3 className="text-lg font-semibold text-foreground">
                            {meeting.title}
                          </h3>
                        </Link>
                        <Badge variant={getStatusColor(meeting.status) as any}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">
                        {meeting.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{meeting.date?.toDate ? meeting.date.toDate().toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {meeting.date?.toDate ? meeting.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        ({meeting.duration} min)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{meeting.location}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No past meetings</h3>
              <p className="text-muted-foreground">Your meeting history will appear here.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Meetings;