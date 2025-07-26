// src/pages/AnnouncementDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar, AlertCircle, Info, CheckCircle, MessageCircle, Heart, Loader2 } from "lucide-react";
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { auth, db } from '@/lib/firebase';
import { collection, doc, addDoc, query, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from '@/lib/utils';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "update";
  publishedAt: any; // Firestore Timestamp
  important: boolean;
  likesCount?: number;
  likedBy?: string[];
}

interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  timestamp: any;
}

const AnnouncementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(true);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Authenticated user listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch announcement details from Firestore
  useEffect(() => {
    if (!id || !APP_ID) {
      setLoadingAnnouncement(false);
      setAnnouncementError("Announcement ID or APP_ID is missing.");
      return;
    }

    const announcementRef = doc(db, `artifacts/${APP_ID}/public/data/announcements`, id);
    const unsubscribe = onSnapshot(announcementRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAnnouncement({ id: docSnap.id, ...data } as Announcement);
        setLikesCount(data.likesCount || 0);
        setHasLiked(currentUser ? (data.likedBy || []).includes(currentUser.uid) : false);
      } else {
        setAnnouncementError("Announcement not found.");
      }
      setLoadingAnnouncement(false);
    }, (err) => {
      console.error("Error fetching announcement details:", err);
      setAnnouncementError("Failed to load announcement details.");
      setLoadingAnnouncement(false);
    });

    return () => unsubscribe();
  }, [id, APP_ID, currentUser]);


  // Fetch comments
  useEffect(() => {
    if (!id || !APP_ID) return;
    const q = query(collection(db, `artifacts/${APP_ID}/public/data/announcements/${id}/comments`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments: Comment[] = [];
      snapshot.forEach(doc => {
        fetchedComments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(fetchedComments);
    });
    return () => unsubscribe();
  }, [id, APP_ID]);

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

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !currentUser || !id || !APP_ID) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, `artifacts/${APP_ID}/public/data/announcements/${id}/comments`), {
        userId: currentUser.uid,
        userEmail: currentUser.email || 'Anonymous',
        text: newCommentText.trim(),
        timestamp: serverTimestamp(),
      });
      setNewCommentText('');
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser || !id || !APP_ID || isLiking) return;

    setIsLiking(true);
    const announcementRef = doc(db, `artifacts/${APP_ID}/public/data/announcements`, id);

    try {
      if (hasLiked) {
        await updateDoc(announcementRef, {
          likesCount: likesCount - 1,
          likedBy: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(announcementRef, {
          likesCount: likesCount + 1,
          likedBy: arrayUnion(currentUser.uid)
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  if (loadingAnnouncement) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading announcement details...</div>
    );
  }

  if (announcementError) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">{announcementError}</h1>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (!announcement) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          &larr; Back to Announcements
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Announcement Details</h1>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card className="p-6 shadow-card">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeBgColor(announcement.type)}`}>
                {getTypeIcon(announcement.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {announcement.title}
                  </h3>
                  <Badge variant={getTypeColor(announcement.type) as any}>
                    {announcement.type}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Published on {announcement.publishedAt?.toDate ? announcement.publishedAt.toDate().toLocaleDateString() : 'N/A'}</span>
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground leading-relaxed">
              {announcement.content}
            </p>
          </CardContent>
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLike}
              disabled={!currentUser || isLiking}
              className={cn(`flex items-center gap-1`, hasLiked && 'text-red-500 border-red-500 hover:text-red-600 hover:border-red-600')}
            >
              {isLiking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
              {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
            </Button>
             <div className="flex items-center gap-1 text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>{comments.length} Comments</span>
            </div>
          </div>
        </Card>

        {/* Comments Section */}
        <Card className="mt-8 p-6 shadow-card">
          <CardTitle className="text-lg font-semibold mb-4">Comments</CardTitle>
          <CardContent className="p-0">
            {/* New Comment Input */}
            {currentUser ? (
              <div className="mb-6">
                <Textarea
                  placeholder="Write your comment here..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  rows={3}
                  className="mb-2"
                  disabled={isSubmittingComment}
                />
                <Button onClick={handlePostComment} disabled={!newCommentText.trim() || isSubmittingComment}>
                  {isSubmittingComment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...
                    </>
                  ) : (
                    'Post Comment'
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Please log in to post comments.
              </p>
            )}

            {/* Existing Comments List */}
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 bg-muted/50 p-3 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{comment.userEmail.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{comment.userEmail}</p>
                      <p className="text-sm text-muted-foreground">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnnouncementDetail;