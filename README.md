# **AI-Assisted Support Platform**

 customer-support portal combining real-time communication, multi-role workflows, and integrated GenAI assistance.

---

## **Motivation**

This platform was built to apply my knowledge of client–server architecture, serverless systems, and AI integration within a practical business context.

It serves as a complete case study demonstrating:

* Real-time communication using cloud infrastructure
* A dual-portal system for customers and consultants
* Practical usage of LLMs (Google Gemini) in customer support workflows

The goal: **optimize support processes** by routing user queries from an intelligent AI chatbot to human consultants only when necessary—reducing workload, speeding resolution times, and improving user experience and to also decrease data loss and fragmentation within the company i interned in.

---

##  **Project Overview**

A support solution featuring **two dedicated portals**:

* **Customer Portal:** AI chat, ticketing, knowledge base, and live chat
* **Admin/Consultant Portal:** Ticket management, dashboards, content tools, meetings, and tasks

### **Tech Architecture**

* **Frontend:** React + TypeScript, Vite
* **UI:** Tailwind CSS, Shadcn UI (Radix UI primitives)
* **Backend:** Firebase (Auth, Firestore, Storage)
* **AI Layer:** Google Gemini (gemini-2.5-flash)
* **Routing:** React Router DOM

---

## **Key Features**

---

### **I. Customer Portal**

Self-service, AI assistance, and escalation workflows.

| Feature                         | Description                                                                                             | Implementation                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **AI Chat Interface**           | Gemini-powered assistant suggesting knowledge articles and drafting tickets when needed.                | `ChatInterface.tsx`, `ai.ts`                    |
| **Support Tickets**             | View/create tickets (pending → in-progress → resolved). Redirects to live chat when consultant accepts. | `SupportTickets.tsx`, `TicketDetail.tsx`        |
| **Alias Base (Knowledge Base)** | Searchable articles with categories, likes, comments, and solution previews.                            | `KnowledgeBase.tsx`, `KnowledgeBaseArticle.tsx` |
| **Live Chat Interface**         | Real-time messaging with consultants after escalation. Includes "Close Chat" action.                    | `LiveChatInterface.tsx`                         |
| **Profile Settings**            | Manage name, picture, and online status.                                                                | `ProfileSettings.tsx`, `profile.ts`             |

---

### **II. Admin / Consultant Portal**

Full operational control and management tools.

| Feature                | Description                                                                         | Implementation                                              |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Dashboard**          | KPI overview: real-time counts of tickets, meetings, content, etc.                  | `Dashboard.tsx`                                             |
| **Ticket Management**  | Accept, prioritize, and handle customer tickets. Includes “Accept & Chat” workflow. | `TicketManagement.tsx`                                      |
| **Content Management** | Create/edit/publish knowledge base articles and announcements.                      | `KnowledgeBaseManagement.tsx`, `AnnouncementManagement.tsx` |
| **Task Management**    | Internal task tracker for consultants.                                              | `TaskManagement.tsx`                                        |
| **Meeting Management** | Schedule and track customer meetings.                                               | `MeetingManagement.tsx`                                     |

---

## 🛠️ **Tech Stack**

**Frontend**

* React
* TypeScript
* Vite

**UI Frameworks**

* Tailwind CSS
* Shadcn UI (Radix UI)

**Backend & Cloud Services**

* Firebase Authentication
* Firestore Database
* Firebase Storage

**AI Layer**

* Google Gemini API (gemini-2.5-flash)

**Routing**

* React Router DOM

---

## **Getting Started**

### **Prerequisites**

Ensure the following are installed/set up:

* Node.js (LTS)
* npm or Yarn
* Firebase project (Firestore + Auth + Storage enabled)
* Gemini API key

---

### **1. Clone the Repository**

```bash
git clone <your-repository-url>
cd <your-repository-name>
```

### **2. Install Dependencies**

```bash
npm install
# or
yarn install
```

### **3. Configure Environment Variables**

Create a `.env` file:

```dotenv
VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="SENDER_ID"
VITE_FIREBASE_APP_ID="APP_ID"

# Gemini AI Key
VITE_GEMINI_API_KEY="INSERT_YOUR_GEMINI_API_KEY_HERE"
```

---

### **4. Start the Development Server**

```bash
npm run dev
# or
yarn dev
```
### ***For testing purposes: incase you wanna try the app without setting up proper firebase rules use the following as your firebase rules***
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

However be careful as this will allow bypassing all permissions , this is only for testing purposes.
---

### **5. Create the Initial Admin User**

Open the following development-only endpoint:

```
http://localhost:5173/create-admin
or create one from your firebase
```

Use it to register your **first consultant/admin** account.

---

I hope this may be of use to someone.
