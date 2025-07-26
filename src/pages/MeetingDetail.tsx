// src/pages/MeetingDetail.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video } from "lucide-react";

// Re-defining mockMeetings for standalone access in this component
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
    description: "Initial consultation for new project requirements, discussing scope, timeline, and resource allocation. This meeting is crucial for setting the foundation of the project.",
    date: new Date(2024, 0, 25, 14, 30),
    duration: 60,
    location: "Conference Room A",
    type: "in-person",
    status: "upcoming",
  },
  {
    id: "2",
    title: "Technical Review",
    description: "Review of current system architecture and improvements needed for scalability and performance. We will go over the existing codebase and identify areas for optimization.",
    date: new Date(2024, 0, 28, 10, 0),
    duration: 90,
    location: "Zoom Meeting",
    type: "video",
    status: "upcoming",
  },
  {
    id: "3",
    title: "Monthly Check-in",
    description: "Regular monthly progress review and planning for the next sprint. We will discuss achievements, roadblocks, and set new goals.",
    date: new Date(2024, 0, 20, 15, 0),
    duration: 45,
    location: "Phone Call",
    type: "phone",
    status: "completed",
  },
];

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meeting = mockMeetings.find(m => m.id === id);

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

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Meeting Not Found</h1>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          &larr; Back to Meetings
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Meeting Details</h1>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card className="p-6 shadow-card">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(meeting.type)}
                  <CardTitle className="text-xl font-semibold text-foreground">
                    {meeting.title}
                  </CardTitle>
                  <Badge variant={getStatusColor(meeting.status) as any}>
                    {meeting.status}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  Meeting ID: {meeting.id}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground leading-relaxed mb-4">
              {meeting.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                <span>Location: {meeting.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {getTypeIcon(meeting.type)}
                <span>Type: {meeting.type}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeetingDetail;