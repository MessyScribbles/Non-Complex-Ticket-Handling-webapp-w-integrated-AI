// src/components/RoleSelection.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define the type for the roles
type Role = 'customer' | 'consultant';

// Define the props interface for the component to accept the onSelectRole function
interface RoleSelectionProps {
  onSelectRole: (role: Role) => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <>
      {/* Logo and Title Section */}
      <div className="text-center mb-10">
        <img
          alt="Logo"
          // Adjusted width classes for a larger logo
          className="w-40 md:w-56 mx-auto mb-4" // Increased from w-24 md:w-28
          onError={(e) => { (e.target as HTMLImageElement).src='https://placehold.co/112x40/ffffff/000000?text=Logo'; }}
        />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-700">Support Portal</h1>
        <p className="text-md md:text-lg text-gray-500 mt-2">Welcome to your comprehensive customer support solution</p>
      </div>

      {/* Portal Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        {/* Customer Portal Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow border border-gray-300 rounded-lg p-4">
          <CardHeader className="p-2 text-center">
            <CardTitle className="text-xl font-semibold text-gray-800">Customer Portal</CardTitle>
          </CardHeader>
          <CardContent className="p-2 text-center flex flex-col items-center">
            <CardDescription className="mb-6 text-gray-600 h-20">
              Get instant support with our AI assistant, create tickets, and access our comprehensive knowledge base.
            </CardDescription>
            <Button onClick={() => onSelectRole('customer')} variant="outline" className="w-full border-gray-400 text-gray-700 hover:bg-gray-100">
              Enter Customer Portal
            </Button>
          </CardContent>
        </Card>

        {/* Consultant Portal Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow border border-gray-300 rounded-lg p-4">
          <CardHeader className="p-2 text-center">
            <CardTitle className="text-xl font-semibold text-gray-800">Consultant Portal</CardTitle>
          </CardHeader>
          <CardContent className="p-2 text-center flex flex-col items-center">
            <CardDescription className="mb-6 text-gray-600 h-20">
              Manage tickets, publish content, oversee customer support, and track performance metrics.
            </CardDescription>
            <Button onClick={() => onSelectRole('consultant')} variant="outline" className="w-full border-gray-400 text-gray-700 hover:bg-gray-100">
              Enter Admin Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}