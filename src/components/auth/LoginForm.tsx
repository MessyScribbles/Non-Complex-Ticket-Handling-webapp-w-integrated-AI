import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface LoginFormProps {
  role: 'customer' | 'consultant';
  onShowSignUp?: () => void;
  onBack: () => void;
}

export function LoginForm({ role, onShowSignUp, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener in App.tsx will handle navigation
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-gray-200">
        <CardHeader className="text-center relative">
          <Button variant="ghost" onClick={onBack} className="absolute top-2 left-2">
            &larr; Back
          </Button>
          <CardTitle className="text-2xl pt-8">
            {role === 'customer' ? 'Customer Login' : 'Consultant Login'}
          </CardTitle>
          <CardDescription>
            Please enter your credentials to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          {role === 'customer' && (
            <div className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <Button variant="link" onClick={onShowSignUp} className="p-0 h-auto">
                Create one
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
