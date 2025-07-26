// src/components/admin/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Import all necessary Lucide icons, including Activity
import { DollarSign, Users, CreditCard, Activity, Ticket, Calendar as CalendarIcon, Megaphone, BookOpen, CheckCircle, Clock } from "lucide-react"; // <-- Activity is now explicitly here
import { collection, query, orderBy, onSnapshot, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface TicketData {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  createdAt: any; // Firestore Timestamp
}

interface MeetingData {
  id: string;
  title: string;
  date: any; // Firestore Timestamp
  status: "upcoming" | "completed" | "cancelled";
}

const Dashboard = () => {
  const [totalTickets, setTotalTickets] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [resolvedTicketsToday, setResolvedTicketsToday] = useState(0);
  const [totalMeetings, setTotalMeetings] = useState(0);
  const [upcomingMeetings, setUpcomingMeetings] = useState(0);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [totalKnowledgeArticles, setTotalKnowledgeArticles] = useState(0);
  const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!APP_ID) {
      setErrorStats("Firebase Project ID (APP_ID) is not defined. Cannot fetch dashboard stats.");
      setLoadingStats(false);
      return;
    }

    const fetchData = async () => {
      setLoadingStats(true);
      try {
        // --- Tickets Stats ---
        const ticketsRef = collection(db, `artifacts/${APP_ID}/public/data/support_tickets`);

        // Total Tickets
        const unsubscribeTotalTickets = onSnapshot(ticketsRef, (snapshot) => {
          setTotalTickets(snapshot.size);
        });

        // Pending Tickets
        const qPending = query(ticketsRef, where('status', '==', 'pending'));
        const unsubscribePendingTickets = onSnapshot(qPending, (snapshot) => {
          setPendingTickets(snapshot.size);
        });

        // Resolved Tickets Today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const qResolvedToday = query(
          ticketsRef,
          where('status', '==', 'resolved'),
          where('createdAt', '>=', startOfToday)
        );
        const unsubscribeResolvedToday = onSnapshot(qResolvedToday, (snapshot) => {
          setResolvedTicketsToday(snapshot.size);
        });

        // --- Meetings Stats ---
        const meetingsRef = collection(db, `artifacts/${APP_ID}/meetings`);

        // Total Meetings
        const unsubscribeTotalMeetings = onSnapshot(meetingsRef, (snapshot) => {
          setTotalMeetings(snapshot.size);
        });

        // Upcoming Meetings
        const qUpcomingMeetings = query(
          meetingsRef,
          where('status', '==', 'upcoming'),
          where('date', '>=', new Date())
        );
        const unsubscribeUpcomingMeetings = onSnapshot(qUpcomingMeetings, (snapshot) => {
          setUpcomingMeetings(snapshot.size);
        });

        // --- Announcements Stats ---
        const announcementsRef = collection(db, `artifacts/${APP_ID}/public/data/announcements`);
        const unsubscribeAnnouncements = onSnapshot(announcementsRef, (snapshot) => {
          setTotalAnnouncements(snapshot.size);
        });

        // --- Knowledge Base Articles Stats ---
        const kbArticlesRef = collection(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`);
        const unsubscribeKbArticles = onSnapshot(kbArticlesRef, (snapshot) => {
          setTotalKnowledgeArticles(snapshot.size);
        });

        // --- Recent Tickets (last 5) ---
        const qRecentTickets = query(ticketsRef, orderBy('createdAt', 'desc'), limit(5));
        const unsubscribeRecentTickets = onSnapshot(qRecentTickets, (snapshot) => {
          const fetchedRecentTickets: TicketData[] = [];
          snapshot.forEach(doc => {
            fetchedRecentTickets.push({ id: doc.id, ...doc.data() } as TicketData);
          });
          setRecentTickets(fetchedRecentTickets);
        });

        setLoadingStats(false);

        return () => {
          unsubscribeTotalTickets();
          unsubscribePendingTickets();
          unsubscribeResolvedToday();
          unsubscribeTotalMeetings();
          unsubscribeUpcomingMeetings();
          unsubscribeAnnouncements();
          unsubscribeKbArticles();
          unsubscribeRecentTickets();
        };

      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
        setErrorStats(err.message || "Failed to load dashboard statistics.");
        setLoadingStats(false);
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics.",
          variant: "destructive"
        });
      }
    };

    const cleanupPromise = fetchData();
    return () => {
      cleanupPromise.then(unsubscribes => {
        if (unsubscribes) {
          unsubscribes();
        }
      });
    };
  }, [APP_ID, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "in-progress": return <Activity className="w-4 h-4" />; // Activity icon usage
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

  if (loadingStats) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading dashboard data...</div>
    );
  }

  if (errorStats) {
    return (
      <div className="p-6 text-center text-destructive">Error: {errorStats}</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of support operations</p>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-auto">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTickets}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTickets}</div>
              <p className="text-xs text-muted-foreground">Awaiting action</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolvedTicketsToday}</div>
              <p className="text-xs text-muted-foreground">Tickets resolved today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMeetings}</div>
              <p className="text-xs text-muted-foreground">Scheduled meetings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingMeetings}</div>
              <p className="text-xs text-muted-foreground">In the near future</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAnnouncements}</div>
              <p className="text-xs text-muted-foreground">Total published</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KB Articles</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKnowledgeArticles}</div>
              <p className="text-xs text-muted-foreground">Total published</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets Table */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Tickets</h2>
          {recentTickets.length > 0 ? (
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{ticket.id}</TableCell>
                      <TableCell>{ticket.title}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No recent tickets.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;