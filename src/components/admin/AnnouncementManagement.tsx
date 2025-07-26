// src/components/admin/AnnouncementManagement.tsx
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
} from '@/components/ui/dialog'; // Ensure DialogDescription is imported
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, Megaphone } from 'lucide-react'; // Removed Checkbox from here
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox from your UI components

import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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

const AnnouncementManagement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<Announcement['type']>('info');
  const [formImportant, setFormImportant] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Fetch announcements from Firestore
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

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('info');
    setFormImportant(false);
    setCurrentAnnouncement(null);
    setIsEditing(false);
    setIsFormOpen(false);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormType(announcement.type);
    setFormImportant(announcement.important);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and Content are required.",
        variant: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const announcementData = {
        title: formTitle.trim(),
        content: formContent.trim(),
        type: formType,
        important: formImportant,
        publishedAt: currentAnnouncement?.publishedAt || serverTimestamp(),
      };

      if (isEditing && currentAnnouncement) {
        const announcementRef = doc(db, `artifacts/${APP_ID}/public/data/announcements`, currentAnnouncement.id);
        await updateDoc(announcementRef, announcementData);
        toast({
          title: "Announcement Updated!",
          description: `"${formTitle}" has been updated.`,
          variant: "success"
        });
      } else {
        await addDoc(collection(db, `artifacts/${APP_ID}/public/data/announcements`), announcementData);
        toast({
          title: "Announcement Created!",
          description: `"${formTitle}" has been published.`,
          variant: "success"
        });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error saving announcement:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save announcement.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm("Are you sure you want to delete this announcement? This cannot be undone.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, `artifacts/${APP_ID}/public/data/announcements`, announcementId));
      toast({
        title: "Announcement Deleted!",
        description: "The announcement has been removed.",
        variant: "success"
      });
    } catch (err: any) {
      console.error("Error deleting announcement:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete announcement.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Announcement Management</h1>
            <p className="text-muted-foreground">
              Create, edit, and manage public announcements
            </p>
          </div>
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="w-4 h-4" /> New Announcement
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {announcements.length > 0 ? (
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Important</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">{announcement.title}</TableCell>
                    <TableCell>{announcement.type}</TableCell>
                    <TableCell>{announcement.important ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{announcement.publishedAt?.toDate ? announcement.publishedAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(announcement)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(announcement.id)}>
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
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No announcements published yet</h3>
            <p className="text-muted-foreground">Click "New Announcement" to get started.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Announcement Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details of this announcement.' : 'Create a new public announcement.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input id="announcement-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-content">Content</Label>
              <Textarea id="announcement-content" value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={6} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-type">Type</Label>
              <select id="announcement-type" value={formType} onChange={(e) => setFormType(e.target.value as Announcement['type'])}
                className="w-full px-3 py-2 border border-input rounded-md bg-background">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="update">Update</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="announcement-important"
                checked={formImportant}
                onCheckedChange={(checked) => setFormImportant(!!checked)}
              />
              <Label htmlFor="announcement-important">Mark as Important</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Publish Announcement')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementManagement;