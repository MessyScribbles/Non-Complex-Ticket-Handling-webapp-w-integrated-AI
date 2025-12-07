// src/components/admin/TaskManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, Calendar as CalendarIcon, ListChecks } from 'lucide-react'; // Added ListChecks icon
import { Checkbox as UICheckbox } from '@/components/ui/checkbox'; // Import Checkbox from your UI components
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

// Import where from firebase/firestore
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: any; // Firestore Timestamp
  completed: boolean;
  assignedTo: string;
  createdAt: any;
  updatedAt: any;
}

interface TaskManagementProps { // ADDED
  MenuButton: React.ReactElement; // ADDED
}

const TaskManagement: React.FC<TaskManagementProps> = ({ MenuButton }) => { // MODIFIED: Receiving MenuButton
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDeadline, setFormDeadline] = useState<Date | undefined>(undefined);
  const [formCompleted, setFormCompleted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Get current user UID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch tasks from Firestore (only tasks assigned to the current admin)
  useEffect(() => {
    if (!APP_ID || !currentUserUid) {
      setLoading(false);
      setTasks([]);
      return;
    }

    const tasksCollectionRef = collection(db, `tasks`);
    const q = query(tasksCollectionRef, where('assignedTo', '==', currentUserUid), orderBy('deadline', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach(doc => {
        fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(fetchedTasks);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please check console for details.");
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load tasks.",
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [APP_ID, currentUserUid, toast]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormDeadline(undefined);
    setFormCompleted(false);
    setCurrentTask(null);
    setIsEditing(false);
    setIsFormOpen(false);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setCurrentTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormDeadline(task.deadline?.toDate ? task.deadline.toDate() : undefined);
    setFormCompleted(task.completed);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !currentUserUid) {
      toast({
        title: "Missing fields",
        description: "Title is required and you must be logged in.",
        variant: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        deadline: formDeadline || null,
        completed: formCompleted,
        assignedTo: currentUserUid,
        createdAt: currentTask?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isEditing && currentTask) {
        const taskRef = doc(db, `tasks`, currentTask.id);
        await updateDoc(taskRef, taskData);
        toast({
          title: "Task Updated!",
          description: `"${formTitle}" has been updated.`,
          variant: "success"
        });
      } else {
        await addDoc(collection(db, `tasks`), taskData);
        toast({
          title: "Task Created!",
          description: `"${formTitle}" has been added.`,
          variant: "success"
        });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error saving task:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save task.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    if (!currentUserUid || task.assignedTo !== currentUserUid) {
      toast({
        title: "Permission Denied",
        description: "You can only mark your own tasks.",
        variant: "destructive"
      });
      return;
    }
    try {
      const taskRef = doc(db, `tasks`, task.id);
      await updateDoc(taskRef, {
        completed: !task.completed,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Task Status Updated!",
        description: `Task "${task.title}" marked as ${task.completed ? 'incomplete' : 'completed'}.`,
        variant: "success"
      });
    } catch (err: any) {
      console.error("Error toggling task completion:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update task status.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, `tasks`, taskId));
      toast({
        title: "Task Deleted!",
        description: "The task has been removed.",
        variant: "success"
      });
    } catch (err: any) {
      console.error("Error deleting task:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete task.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading tasks...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">Error: {error}</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* MODIFIED: Integrated MenuButton into the primary header */}
      <div className="p-6 border-b border-border bg-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {MenuButton} {/* ADDED MENU BUTTON */}
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground mb-2">Task Management</h1>
              <p className="text-primary-foreground opacity-80">
                Create, manage, and track your personal tasks
              </p>
            </div>
          </div>
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {tasks.length > 0 ? (
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Complete</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className={task.completed ? 'opacity-60' : ''}>
                    <TableCell>
                      <UICheckbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        aria-label="Mark task as complete"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      {task.deadline?.toDate ? format(task.deadline.toDate(), 'PPP') : 'No deadline'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
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
            <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-4" /> {/* Changed icon for task list */}
            <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
            <p className="text-muted-foreground">Click "New Task" to add your first task.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Task Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details of this task.' : 'Create a new personal task.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description (Optional)</Label>
              <Textarea id="task-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deadline">Deadline (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formDeadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDeadline ? format(formDeadline, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formDeadline}
                    onSelect={setFormDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {isEditing && (
              <div className="flex items-center space-x-2">
                <UICheckbox
                  id="task-completed"
                  checked={formCompleted}
                  onCheckedChange={(checked) => setFormCompleted(!!checked)}
                />
                <Label htmlFor="task-completed">Mark as Completed</Label>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Task')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;