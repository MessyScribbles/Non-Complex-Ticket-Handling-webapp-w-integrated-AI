// src/components/admin/KnowledgeBaseManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription // Import DialogDescription here
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, Image as ImageIcon, Link as LinkIcon, BookOpen } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  views: number;
  publishedAt: any;
  imageUrl?: string;
  link?: string;
}

const KnowledgeBaseManagement: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImageUrl, setFormImageUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

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

  const resetForm = () => {
    setFormTitle('');
    setFormExcerpt('');
    setFormContent('');
    setFormCategory('');
    setFormLink('');
    setFormImageFile(null);
    setFormImageUrl('');
    setCurrentArticle(null);
    setIsEditing(false);
    setIsFormOpen(false);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (article: Article) => {
    setCurrentArticle(article);
    setFormTitle(article.title);
    setFormExcerpt(article.excerpt);
    setFormContent(article.content);
    setFormCategory(article.category);
    setFormLink(article.link || '');
    setFormImageUrl(article.imageUrl || '');
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormImageFile(e.target.files[0]);
    } else {
      setFormImageFile(null);
    }
  };

  const uploadImage = async (articleId: string, file: File): Promise<string> => {
    const storage = getStorage();
    const imageRef = ref(storage, `article_images/${articleId}/${file.name}`);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  };

  const deleteImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    const storage = getStorage();
    const imageRef = ref(storage, imageUrl);
    try {
      await deleteObject(imageRef);
      console.log("Old image deleted from storage.");
    } catch (error) {
      console.warn("Could not delete old image from storage (might not exist or permissions):", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || !formCategory.trim()) {
      toast({
        title: "Missing fields",
        description: "Title, Content, and Category are required.",
        variant: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let newImageUrl = formImageUrl;

      // Handle image upload for new articles or replacement for existing ones
      if (formImageFile) {
        // If creating a new article, we need its ID first.
        // If editing, we have the ID.
        const articleIdForImage = isEditing && currentArticle ? currentArticle.id : 'temp_id_' + Date.now(); // Use temp ID for new, real ID for edit
        newImageUrl = await uploadImage(articleIdForImage, formImageFile);

        // If it's an edit and a new image was uploaded, delete the old one
        if (isEditing && currentArticle?.imageUrl && currentArticle.imageUrl !== newImageUrl) {
          await deleteImage(currentArticle.imageUrl);
        }
      } else if (isEditing && currentArticle && !formImageUrl && currentArticle.imageUrl) {
        // If editing and image was removed from form, delete it from storage
        await deleteImage(currentArticle.imageUrl);
        newImageUrl = ''; // Clear image URL
      }


      const articleData = {
        title: formTitle.trim(),
        excerpt: formExcerpt.trim() || formContent.trim().substring(0, 150) + '...',
        content: formContent.trim(),
        category: formCategory.trim(),
        link: formLink.trim() || null,
        imageUrl: newImageUrl || null,
        readTime: Math.ceil(formContent.trim().split(/\s+/).length / 200),
        views: currentArticle?.views || 0,
        publishedAt: currentArticle?.publishedAt || serverTimestamp(),
      };

      if (isEditing && currentArticle) {
        // Update existing article
        const articleRef = doc(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`, currentArticle.id);
        await updateDoc(articleRef, articleData);
        toast({
          title: "Article Updated!",
          description: `"${formTitle}" has been updated.`,
          variant: "success"
        });
      } else {
        // Create new article
        const newArticleRef = await addDoc(collection(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`), articleData);
        // If a temporary ID was used for image upload, update the document with the real ID's image path
        if (formImageFile && newImageUrl.includes('temp_id_')) {
            const updatedImageUrl = newImageUrl.replace('temp_id_' + Date.now(), newArticleRef.id);
            await updateDoc(newArticleRef, { imageUrl: updatedImageUrl });
            // Need to rename the file in storage or re-upload with correct path.
            // For simplicity, we'll just update the URL in the doc.
            // A more robust solution would be to upload after doc creation or use Cloud Functions for renaming.
        }
        toast({
          title: "Article Created!",
          description: `"${formTitle}" has been published.`,
          variant: "success"
        });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error saving article:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save article.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
    }
  };

  const handleDelete = async (articleId: string, imageUrl?: string) => {
    if (!confirm("Are you sure you want to delete this article? This cannot be undone.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (imageUrl) {
        await deleteImage(imageUrl);
      }
      await deleteDoc(doc(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`, articleId));
      toast({
        title: "Article Deleted!",
        description: "The article has been removed.",
        variant: "success"
      });
    } catch (err: any) {
      console.error("Error deleting article:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete article.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Knowledge Base Management</h1>
            <p className="text-muted-foreground">
              Create, edit, and manage articles for the knowledge base
            </p>
          </div>
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="w-4 h-4" /> New Article
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {articles.length > 0 ? (
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>{article.category}</TableCell>
                    <TableCell>{article.publishedAt?.toDate ? article.publishedAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(article)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(article.id, article.imageUrl)}>
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
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No articles published yet</h3>
            <p className="text-muted-foreground">Click "New Article" to get started.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Article Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Article' : 'New Article'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details of this knowledge base article.' : 'Create a new knowledge base article.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="article-title">Title</Label>
              <Input id="article-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-category">Category</Label>
              <Input id="article-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Troubleshooting, Getting Started" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-excerpt">Excerpt (Optional)</Label>
              <Textarea id="article-excerpt" value={formExcerpt} onChange={(e) => setFormExcerpt(e.target.value)} rows={2} placeholder="A short summary of the article..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-content">Content</Label>
              <Textarea id="article-content" value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-link">External Link (Optional)</Label>
              <Input id="article-link" type="url" value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="https://example.com/more-info" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-image">Image (Optional)</Label>
              {formImageUrl && (
                <div className="mb-2">
                  <img src={formImageUrl} alt="Current Article" className="max-h-32 object-contain mb-2 rounded-md" />
                  <p className="text-xs text-muted-foreground">Current image. Upload new to replace.</p>
                </div>
              )}
              <Input id="article-image" type="file" accept="image/*" onChange={handleImageFileChange} />
              {formImageFile && <p className="text-xs text-muted-foreground mt-1">Selected: {formImageFile.name}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Publish Article')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBaseManagement;