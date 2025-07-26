// src/pages/CreateAdminUserPage.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const CreateAdminUserPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Add user role to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: "admin", // Explicitly set role as 'admin'
        createdAt: new Date(),
        name: email.split('@')[0] || 'Admin', // Default name
        profilePictureUrl: '',
        onlineStatus: 'offline',
        lastSeen: new Date(),
      });

      toast({
        title: "Admin User Created!",
        description: `Admin account "${email}" created successfully. You can now log in with it.`,
        variant: "success",
      });
      console.log("Admin user created:", user.email);
      setEmail('');
      setPassword('');
      // Optionally, redirect to login page after creation
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Failed to create admin account.");
      toast({
        title: "Error Creating Admin User",
        description: err.message || "Failed to create admin account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        backgroundImage: `url('https://i.postimg.cc/5N2FMfj1/Chat-GPT-Image-Jul-9-2025-03-24-46-PM.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-lg border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Admin Account (Dev Only)</CardTitle>
          <CardDescription>
            Use this page to create admin users for testing purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Admin...' : 'Create Admin Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ** REMEMBER TO REMOVE THIS PAGE BEFORE DEPLOYMENT **
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAdminUserPage;