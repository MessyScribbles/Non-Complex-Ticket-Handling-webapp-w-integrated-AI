// src/pages/Index.tsx
import React, { useState } from 'react';
import RoleSelection from '@/components/RoleSelection';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import PopulateFirestoreData from '@/components/PopulateFirestoreData';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom'; // Import Link for navigation

type View = 'role-selection' | 'login' | 'signup' | 'populate-data';
type Role = 'customer' | 'consultant';

export default function Index() {
  const [view, setView] = useState<View>('role-selection');
  const [role, setRole] = useState<Role | null>(null);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setView('login');
  };

  const renderContent = () => {
    switch (view) {
      case 'login':
        return (
          <LoginForm
            role={role!}
            onShowSignUp={role === 'customer' ? () => setView('signup') : undefined}
            onBack={() => setView('role-selection')}
          />
        );
      case 'signup':
        return (
          <SignUpForm
            onBackToLogin={() => setView('login')}
          />
        );
      case 'populate-data':
        return <PopulateFirestoreData />;
      case 'role-selection':
      default:
        return (
          <>
            <RoleSelection onSelectRole={handleRoleSelect} />
            {/* Temporary: Link to Populate Mock Data */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                For development:{" "}
                <Button variant="link" onClick={() => setView('populate-data')} className="p-0 h-auto">
                  Populate Mock Data
                </Button>
              </p>
            </div>
            {/* NEW: Temporary link to Create Admin User page */}
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-500">
                <Link to="/create-admin" className="text-blue-500 hover:underline">
                  Create Admin User (Dev Only)
                </Link>
              </p>
            </div>
          </>
        );
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        backgroundImage: `url('https://i.postimg.cc/5N2FMfj1/Chat-GPT-Image-Jul-9-2025-03-24-46-PM.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {renderContent()}
    </div>
  );
}