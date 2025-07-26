// src/components/auth/SignUpForm.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Ensure setDoc is imported
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast'; // Assuming you want to use the toast notification system

interface SignUpFormProps {
  onBackToLogin: () => void;
}

export function SignUpForm({ onBackToLogin }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast(); // Initialize toast

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Create or update a user profile document in Firestore
      // This stores their role and other information.
      // Use setDoc with merge: true to ensure the document is created if it doesn't exist,
      // and existing fields are not overwritten if this is called on an existing UID.
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'customer', // Assign the role of customer by default
        createdAt: new Date(),
        name: user.email?.split('@')[0] || 'New User', // Initialize display name
        profilePictureUrl: user.photoURL || '', // Initialize profile picture URL
        onlineStatus: 'offline', // Initialize online status
        lastSeen: new Date(), // Initialize last seen
      }, { merge: true }); // Crucial: use merge to create if not exists, or update if exists

      toast({
        title: "Account created successfully!",
        description: "You can now log in with your new account.",
        variant: "success",
      });
      onBackToLogin();
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      toast({
        title: "Sign Up Error",
        description: err.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-gray-200">
        <CardHeader className="text-center relative">
          <Button variant="ghost" onClick={onBackToLogin} className="absolute top-2 left-2">
            &larr; Back
          </Button>
          <CardTitle className="text-2xl pt-8">Create Customer Account</CardTitle>
          <CardDescription>
            Enter your details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}