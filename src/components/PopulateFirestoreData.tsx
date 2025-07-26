// src/components/PopulateFirestoreData.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Define APP_ID for Firestore paths, assuming it's your Firebase Project ID
const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID; // Or replace with your static appId if different

// Mock Announcements (must match the structure in Announcements.tsx)
const mockAnnouncements = [
  {
    id: "1",
    title: "System Maintenance Scheduled",
    content: "We will be performing scheduled maintenance on January 30th from 2:00 AM to 4:00 AM EST. During this time, some services may be temporarily unavailable.",
    type: "warning",
    publishedAt: new Date(2024, 0, 22),
    important: true,
  },
  {
    id: "2",
    title: "New Feature: Enhanced Chat Interface",
    content: "We've rolled out an improved AI chat interface with better response accuracy and faster processing times. Experience the upgrade in your next conversation!",
    type: "success",
    publishedAt: new Date(2024, 0, 20),
    important: false,
  },
  {
    id: "3",
    title: "Knowledge Base Updated",
    content: "Our knowledge base has been updated with 15 new articles covering common troubleshooting scenarios and best practices.",
    type: "info",
    publishedAt: new Date(2024, 0, 18),
    important: false,
  },
  {
    id: "4",
    title: "Holiday Support Hours",
    content: "Please note that our support hours will be modified during the holiday period. Emergency support remains available 24/7.",
    type: "update",
    publishedAt: new Date(2024, 0, 15),
    important: false,
  },
];

// Mock Articles (must match the structure in KnowledgeBase.tsx)
const mockArticles = [
  {
    id: "1",
    title: "Getting Started with ALIAS Support Portal",
    excerpt: "Learn how to navigate and use all features of the support portal effectively.",
    content: "Welcome to the ALIAS Support Portal! This guide will walk you through all the essential features to help you get started quickly. You'll learn how to navigate the interface, find the information you need, and utilize the various support options available to you. From submitting tickets to chatting with our AI assistant, we've designed this portal to be intuitive and efficient. Start by exploring the sidebar menu to discover all functionalities.",
    category: "Getting Started",
    readTime: 5,
    views: 1250,
    publishedAt: new Date(2024, 0, 15),
  },
  {
    id: "2",
    title: "Troubleshooting Common Login Issues",
    excerpt: "Step-by-step guide to resolve login problems and access your account.",
    content: "Encountering login issues can be frustrating. This step-by-step guide provides common solutions for accessing your account. First, verify your email and password. If that doesn't work, try using the 'Forgot Password' link. Ensure your internet connection is stable. If problems persist, clear your browser's cache and cookies. For persistent issues, our AI assistant or support team can provide further assistance.",
    category: "Troubleshooting",
    readTime: 3,
    views: 890,
    publishedAt: new Date(2024, 0, 10),
  },
  {
    id: "3",
    title: "Creating and Managing Support Tickets",
    excerpt: "How to effectively create support tickets and track their progress.",
    content: "Submitting a support ticket is easy! This article guides you through the process of creating a new ticket, providing all the necessary information for a swift resolution. You'll also learn how to track the status of your existing tickets, add comments, and review solutions provided by our consultants. Effective ticket management ensures your issues are addressed promptly and efficiently.",
    category: "Support",
    readTime: 4,
    views: 650,
    publishedAt: new Date(2024, 0, 8),
  },
];


const PopulateFirestoreData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePopulateData = async () => {
    if (!APP_ID) {
      toast({
        title: "Error",
        description: "VITE_FIREBASE_PROJECT_ID is not defined. Please check your .env file.",
        variant: "destructive",
      });
      return;
    }

    console.log("Current user when populating:", auth.currentUser); // Added for debugging
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to populate data.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // --- Populate Announcements ---
      for (const ann of mockAnnouncements) {
        const annRef = doc(db, `artifacts/${APP_ID}/public/data/announcements`, ann.id);
        await setDoc(annRef, {
          ...ann,
          // Ensure Date objects are converted for Firestore compatibility if needed,
          // but Firestore SDK generally handles Date objects.
          publishedAt: ann.publishedAt,
          likesCount: 0, // Initialize likes count
          likedBy: [], // Initialize likedBy array
        }, { merge: true }); // Use merge to avoid overwriting comments/likes if they exist
        console.log(`Populated announcement: ${ann.id}`);
      }

      // --- Populate Knowledge Base Articles ---
      for (const article of mockArticles) {
        const articleRef = doc(db, `artifacts/${APP_ID}/public/data/knowledgeBaseArticles`, article.id);
        await setDoc(articleRef, {
          ...article,
          publishedAt: article.publishedAt, // Use Date object directly
          likesCount: 0, // Initialize likes count
          likedBy: [], // Initialize likedBy array
        }, { merge: true }); // Use merge to avoid overwriting comments/likes if they exist
        console.log(`Populated article: ${article.id}`);
      }

      toast({
        title: "Firestore Populated!",
        description: "Mock announcement and knowledge base data added to Firestore.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error populating Firestore:", error);
      toast({
        title: "Error Populating Firestore",
        description: error.message || "Failed to add data to Firestore.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-10">
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Populate Firestore Data</CardTitle>
          <CardDescription>
            Adds mock announcements and knowledge base articles to your Firestore.
            (For development purposes only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handlePopulateData} disabled={loading} className="w-full">
            {loading ? 'Populating...' : 'Populate Firestore Now'}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ** Remove this component after use for production. **
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PopulateFirestoreData;