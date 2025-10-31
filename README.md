# Support Portal – A Non-Complex Customer Support System

## Overview

This project is a non-complex customer support portal designed to streamline communication and support operations for businesses. Built with **React** and **TypeScript**, it offers distinct functionalities for both customers and admins/consultants. It uses **Google Firebase** for its backend and integrates the **Google Gemini API** for intelligent AI support.

Ideal for small to medium-sized businesses, this app is scalable, customizable, and easy to extend for further development.

---

## ✨ Features

### 🧑‍💻 Customer Portal

- **AI Chat Interface**  
  Powered by Google Gemini. Automatically suggests tickets and can escalate to human support.  
  _Implementation: `ChatInterface.tsx`, `ai.ts`_

- **Support Tickets**  
  View submitted tickets, auto-redirect to live chat when a consultant joins.  
  _Implementation: `SupportTickets.tsx`, `TicketDetail.tsx`_

- **Knowledge Base**  
  Searchable article library with categories, likes, and comments.  
  _Implementation: `KnowledgeBase.tsx`, `KnowledgeBaseArticle.tsx`_

- **Meetings**  
  View scheduled meetings with date, time, and type (in-person, video, phone).  
  _Implementation: `Meetings.tsx`, `MeetingDetail.tsx`_

- **Announcements**  
  See latest updates, interact with important news.  
  _Implementation: `Announcements.tsx`, `AnnouncementDetail.tsx`_

- **Profile Settings**  
  Manage name, profile picture, and status.  
  _Implementation: `ProfileSettings.tsx`, `profile.ts`_

---

### 🛠️ Admin/Consultant Portal

- **Dashboard**  
  Overview of tickets, meetings, content counts.  
  _Implementation: `Dashboard.tsx`_

- **Ticket Management**  
  Accept/assign tickets and start live chats.  
  _Implementation: `TicketManagement.tsx`_

- **Live Chat Interface**  
  Real-time chat with escalation from AI or ticket view.  
  _Implementation: `LiveChatInterface.tsx`_

- **Knowledge Base Management**  
  Add/edit/delete articles, images, and links.  
  _Implementation: `KnowledgeBaseManagement.tsx`_

- **Announcement Management**  
  Publish announcements with importance tags.  
  _Implementation: `AnnouncementManagement.tsx`_

- **Task Management**  
  Internal task tracker for consultants.  
  _Implementation: `TaskManagement.tsx`_

- **Meeting Management**  
  Manage all scheduled customer meetings.  
  _Implementation: `MeetingManagement.tsx`_

- **Mock Data Population (Dev Only)**  
  Populate articles and announcements for testing.  
  _Implementation: `PopulateFirestoreData.tsx`_

- **Create Admin User (Dev Only)**  
  Setup page for new admin account creation.  
  _Implementation: `CreateAdminUserPage.tsx`_

---

## 🧪 Tech Stack

- **Frontend**: React, TypeScript, Vite  
- **UI**: Shadcn UI (Radix UI + Tailwind CSS)  
- **Backend**: Google Firebase (Auth, Firestore, Cloud Storage)  
- **AI**: Google Gemini API  
- **Routing**: React Router DOM  
- **State**: React Hooks + Firebase listeners  
- **Notifications**: Sonner + Shadcn Toast

---

## 🚀 Getting Started

### ✅ Prerequisites

- Node.js (LTS recommended)  
- npm or Yarn  
- Firebase + Google Cloud account

### 1. Clone the Repo

```bash
git clone <your-repository-url>
cd support-portal

*Create admin from your firabase/Prefered db