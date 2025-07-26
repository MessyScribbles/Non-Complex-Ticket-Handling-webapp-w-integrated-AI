// src/components/customer/KnowledgeBase.tsx
import React, { useState, useEffect } from "react"; // Import useEffect
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Clock, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'; // Import Firestore functions
import { db } from '@/lib/firebase'; // Import db
import { useToast } from '@/hooks/use-toast';

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

const KnowledgeBase = () => {
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

  const categories = ["all", "Getting Started", "Troubleshooting", "Support", "Features"]; // You might want to fetch categories dynamically from Firestore too

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()); // Search full content too
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
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and learn about our services
        </p>
      </div>

      <div className="flex-1 p-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-6">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
              <Card key={article.id} className="p-6 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <Badge variant="outline">{article.category}</Badge>
                    </div>
                    <Link to={`/knowledge-base/${article.id}`} className="hover:underline">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {article.title}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {article.excerpt}
                    </p>
                  </div>
                  {article.imageUrl && (
                    <img src={article.imageUrl} alt={article.title} className="w-24 h-24 object-cover rounded-md ml-4 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime} min read
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {/* Note: This currently shows mock views. You'd fetch actual comment count from Firestore */}
                      {article.views} views
                    </div>
                  </div>
                  <span>
                    {article.publishedAt?.toDate ? article.publishedAt.toDate().toLocaleDateString() : 'N/A'}
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