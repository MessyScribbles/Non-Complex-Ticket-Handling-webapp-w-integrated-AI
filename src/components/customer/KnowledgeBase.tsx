// src/components/customer/KnowledgeBase.tsx
import React, { useState, useEffect } from "react"; // Import useEffect
import { Card, CardTitle } from "@/components/ui/card"; // Reduced imports to essentials
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Clock, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'; // Import Firestore functions
import { db } from '@/lib/firebase'; // Import db
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button"; // Used for professional filter buttons
import { cn } from "@/lib/utils";

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
}

interface KnowledgeBaseProps {
  MenuButton: React.ReactElement;
}

const KnowledgeBase = ({ MenuButton }: KnowledgeBaseProps) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  // Fetch articles from Firestore
  useEffect(() => {
    if (!APP_ID) {
      setError("Firebase Project ID (APP_ID) is not defined. Cannot fetch articles.");
      setLoading(false);
      return;
    }

    const articlesCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`);
    const q = query(articlesCollectionRef, orderBy('publishedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedArticles: Article[] = [];
      snapshot.forEach(doc => {
        fetchedArticles.push({ id: doc.id, ...doc.data() } as Article);
      });
      setArticles(fetchedArticles);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching articles:", err);
      setError("Failed to load articles. Please check console for details.");
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load knowledge base articles.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [APP_ID, toast]);

  const categories = ["all", "Getting Started", "Troubleshooting", "Support", "Features"];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading knowledge base articles...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">Error: {error}</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 1. Unified Header (Blue) - NOW HOSTS MENU BUTTON */}
      <div className="p-6 border-b border-border bg-primary">
        <div className="flex items-center justify-start gap-4">
          {MenuButton}
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground mb-2">ALIAS Base</h1>
            <p className="text-primary-foreground opacity-80">
              Find answers to common questions and learn about our services
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        {/* 2. UX CONTROL ELEMENT: Elevated Search & Filters Card */}
        <Card className="mb-8 p-6 shadow-card">
          <CardTitle className="text-xl font-semibold mb-4 text-foreground">What do you need help with?</CardTitle>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles, troubleshoot, features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Unique Filter Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-sm font-medium text-foreground pt-1">Filter by Topic:</span>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  // Enhancing UX: Rounded buttons with subtle primary hover border
                  className={cn(
                    "rounded-full transition-all duration-200 text-sm",
                    selectedCategory === category ? "shadow-md" : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* LIVELY RESULTS: Articles Grid with Enhanced Cards */}
        <div className="grid gap-6">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
              <Card 
                key={article.id} 
                // Enhanced styling: strong shadow + prominent blue left border on hover for lively feedback
                className="p-6 shadow-card hover:shadow-elegant transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary"
              >
                <Link to={`/knowledge-base/${article.id}`} className="block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {/* Category Badge - Subtle Blue Theme */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">{article.category}</Badge>
                      </div>
                      
                      {/* Title - Clear Hierarchy */}
                      <h3 className="text-xl font-bold text-foreground mb-2 hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      
                      {/* Excerpt */}
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                        {article.excerpt}
                      </p>
                    </div>
                    {article.imageUrl && (
                      <img src={article.imageUrl} alt={article.title} className="w-24 h-24 object-cover rounded-md ml-4 flex-shrink-0 border border-border" />
                    )}
                  </div>
                </Link>

                {/* Metadata - Separated for Professionalism */}
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{article.readTime} min read</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{article.views} views</span>
                    </div>
                  </div>
                  <span className="text-xs">
                    Published: {article.publishedAt?.toDate ? article.publishedAt.toDate().toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or category filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;