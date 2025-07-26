// src/components/customer/Announcements.tsx
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar, AlertCircle, Info, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "update";
  publishedAt: any; // Firestore Timestamp
  important: boolean;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!APP_ID) {
      setError("Firebase Project ID (APP_ID) is not defined. Cannot fetch announcements.");
      setLoading(false);
      return;
    }

    const announcementsCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/announcements`);
    const q = query(announcementsCollectionRef, orderBy('publishedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAnnouncements: Announcement[] = [];
      snapshot.forEach(doc => {
        fetchedAnnouncements.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(fetchedAnnouncements);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching announcements:", err);
      setError("Failed to load announcements. Please check console for details.");
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load announcements.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [APP_ID, toast]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertCircle className="w-5 h-5" />;
      case "success": return <CheckCircle className="w-5 h-5" />;
      case "info": return <Info className="w-5 h-5" />;
      case "update": return <Megaphone className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "warning": return "warning";
      case "success": return "success";
      case "info": return "info";
      case "update": return "default";
      default: return "default";
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case "warning": return "bg-warning/10 text-warning";
      case "success": return "bg-success/10 text-success";
      case "info": return "bg-info/10 text-info";
      case "update": return "bg-primary/10 text-primary";
      default: return "bg-primary/10 text-primary";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading announcements...</div>
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
        <h1 className="text-2xl font-bold text-foreground mb-2">Announcements</h1>
        <p className="text-muted-foreground">
          Stay updated with the latest news and important information
        </p>
      </div>

      <div className="flex-1 p-6">
        <div className="space-y-6">
          {announcements.length > 0 ? ( // Check if there are announcements
            announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`p-6 shadow-card hover:shadow-elegant transition-all duration-300 ${
                  announcement.important ? "border-l-4 border-l-warning" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeBgColor(announcement.type)}`}>
                    {getTypeIcon(announcement.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/announcements/${announcement.id}`} className="hover:underline">
                          <h3 className="text-lg font-semibold text-foreground">
                            {announcement.title}
                          </h3>
                        </Link>
                        {announcement.important && (
                          <Badge variant="warning" className="text-xs">
                            Important
                          </Badge>
                        )}
                      </div>
                      <Badge variant={getTypeColor(announcement.type) as any}>
                        {announcement.type}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {announcement.content}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Published on {announcement.publishedAt?.toDate ? announcement.publishedAt.toDate().toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No announcements</h3>
              <p className="text-muted-foreground">Check back later for important updates and news.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;