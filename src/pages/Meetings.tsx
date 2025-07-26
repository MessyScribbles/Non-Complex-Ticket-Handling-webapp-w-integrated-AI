// src/components/customer/Meetings.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video } from "lucide-react";
import { Link } from "react-router-dom"; // Ensure this import is present and correct

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  duration: number;
  location: string;
  type: "in-person" | "video" | "phone";
  status: "upcoming" | "completed" | "cancelled";
}

const mockMeetings: Meeting[] = [
  {
    id: "1",
    title: "Project Consultation",
    description: "Initial consultation for new project requirements",
    date: new Date(2024, 0, 25, 14, 30),
    duration: 60,
    location: "Conference Room A",
    type: "in-person",
    status: "upcoming",
  },
  {
    id: "2",
    title: "Technical Review",
    description: "Review of current system architecture and improvements",
    date: new Date(2024, 0, 28, 10, 0),
    duration: 90,
    location: "Zoom Meeting",
    type: "video",
    status: "upcoming",
  },
  {
    id: "3",
    title: "Monthly Check-in",
    description: "Regular monthly progress review and planning",
    date: new Date(2024, 0, 20, 15, 0),
    duration: 45,
    location: "Phone Call",
    type: "phone",
    status: "completed",
  },
];

const Meetings = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "in-person":
        return <MapPin className="w-4 h-4" />;
      case "phone":
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const upcomingMeetings = mockMeetings.filter(m => m.status === "upcoming");
  const pastMeetings = mockMeetings.filter(m => m.status !== "upcoming");

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
                        {/* Ensure Link wraps the h3 directly and has hover underline */}
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
                      <span>{meeting.date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {meeting.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        {/* Ensure Link wraps the h3 directly and has hover underline */}
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
                      <span>{meeting.date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {meeting.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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