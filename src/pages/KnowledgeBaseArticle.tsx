// src/pages/KnowledgeBaseArticle.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Clock, MessageCircle, Heart, Loader2, Link as LinkIcon } from "lucide-react"; // Import LinkIcon here
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { auth, db } from '@/lib/firebase';
import { collection, doc, addDoc, query, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from '@/lib/utils';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  views: number;
  publishedAt: any; // Firestore Timestamp
  imageUrl?: string; // Image URL for display
  link?: string; // External link
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

const KnowledgeBaseArticle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [articleError, setArticleError] = useState<string | null>(null);

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

  // Fetch article details from Firestore
  useEffect(() => {
    if (!id || !APP_ID) {
      setLoadingArticle(false);
      setArticleError("Article ID or APP_ID is missing.");
      return;
    }

    const articleRef = doc(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`, id);
    const unsubscribe = onSnapshot(articleRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setArticle({ id: docSnap.id, ...data } as Article);
        setLikesCount(data.likesCount || 0);
        setHasLiked(currentUser ? (data.likedBy || []).includes(currentUser.uid) : false);
      } else {
        setArticleError("Article not found.");
      }
      setLoadingArticle(false);
    }, (err) => {
      console.error("Error fetching article details:", err);
      setArticleError("Failed to load article details.");
      setLoadingArticle(false);
    });

    return () => unsubscribe();
  }, [id, APP_ID, currentUser]);


  // Fetch comments
  useEffect(() => {
    if (!id || !APP_ID) return;
    const q = query(collection(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles/${id}/comments`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments: Comment[] = [];
      snapshot.forEach(doc => {
        fetchedComments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(fetchedComments);
    });
    return () => unsubscribe();
  }, [id, APP_ID]);

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !currentUser || !id || !APP_ID) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles/${id}/comments`), {
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
    const articleRef = doc(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`, id);

    try {
      if (hasLiked) {
        await updateDoc(articleRef, {
          likesCount: likesCount - 1,
          likedBy: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(articleRef, {
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

  if (loadingArticle) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading article details...</div>
    );
  }

  if (articleError) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">{articleError}</h1>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          &larr; Back to Knowledge Base
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Knowledge Base Article</h1>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card className="p-6 shadow-card">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <Badge variant="outline">{article.category}</Badge>
            </div>
            <CardTitle className="text-xl font-semibold text-foreground mb-2">
              {article.title}
            </CardTitle>
            <CardDescription className="text-sm">
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {article.readTime} min read
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {comments.length} comments
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {article.imageUrl && (
              <img src={article.imageUrl} alt={article.title} className="w-full max-h-64 object-cover rounded-md mb-4" />
            )}
            <p className="text-muted-foreground leading-relaxed">
              {article.content}
            </p>
            {article.link && (
              <div className="mt-4">
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" /> Read more
                </a>
              </div>
            )}
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

export default KnowledgeBaseArticle;