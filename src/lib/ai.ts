// src/lib/ai.ts
import { Firestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface AiTicketAction {
  action: "create_ticket";
  title: string;
  description: string;
}

export type AiResponse = {
  type: "message";
  text: string;
} | {
  type: "action";
  action: AiTicketAction;
};

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// FIX: Using the correct, stable model name for the REST API endpoint
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`; 
const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export const createTicketConfirmed = async (
  db: Firestore,
  ticketData: {
    title: string;
    description: string;
    customerName: string;
    customerEmail: string;
    customerId: string;
  }
): Promise<string> => {
  try {
    const newTicketRef = await addDoc(collection(db, `artifacts/${APP_ID}/public/data/support_tickets`), {
      title: ticketData.title,
      description: ticketData.description,
      status: "pending",
      priority: "medium", // Default priority
      customerId: ticketData.customerId,
      customerName: ticketData.customerName,
      customerEmail: ticketData.customerEmail,
      createdAt: serverTimestamp(),
    });
    console.log("AI created ticket successfully:", newTicketRef.id);
    return newTicketRef.id;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw new Error("Failed to create ticket via AI.");
  }
};


export const sendMessageToAI = async (
  db: Firestore,
  chatId: string,
  history: GeminiMessage[],
  newMessage: string,
  currentUserUid: string,
  currentUserEmail: string
): Promise<AiResponse> => {
  console.log("sendMessageToAI: Function started.");
  if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not defined. Make sure it's set in your .env file and you've restarted the server.");
    return { type: "message", text: "API Key is not configured. Please contact support." };
  }
  if (!db || !chatId) {
    console.error("Firestore DB instance or Chat ID is missing.");
    return { type: "message", text: "A database error occurred. Please try again later." };
  }

  try {
    // ENHANCED PROMPT: Strict topical constraint
    const prompt = `You are the ALIAS Informatique Support AI Assistant. Your knowledge is strictly limited to ALIAS company services, products, policies, and providing technical support.

    If the user asks about any topic unrelated to ALIAS (e.g., general knowledge, current events, politics), you MUST politely refuse and state that you can only assist with ALIAS-related inquiries.

    You SHOULD ONLY respond with a JSON object if the user EXPLICITLY and DIRECTLY asks to "create a ticket", "open a ticket", "escalate this issue", or "I need more help with this". If the user's request does not contain these explicit phrases, you MUST respond naturally and helpfully in plain text. Do NOT wrap the JSON object in markdown code blocks (e.g., \`\`\`json ... \`\`\`). Provide the raw JSON string directly.
    When generating a JSON response for a ticket creation, the JSON object MUST adhere to this exact structure:
    {"action": "create_ticket", "title": "Summarize the user's request into a concise title", "description": "Provide a detailed description of the user's issue or request"}

    User: ${newMessage}`;

    const fullHistory: GeminiMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: prompt }] }
    ];
    console.log("sendMessageToAI: Sending request to Gemini API with history and refined prompt.");

    const payload = {
      contents: fullHistory,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log("sendMessageToAI: Received response from Gemini API. Status:", response.status);

    const data = await response.json();
    console.log("sendMessageToAI: Parsed Gemini API response data:", data);

    if (!response.ok) {
      console.error("API Error Response:", data);
      if (data.error && data.error.message) {
        throw new Error(`Gemini API Error: ${data.error.message} (Code: ${data.error.code})`);
      }
      throw new Error(`API request failed with status ${response.status}.`);
    }

    let aiResponseContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("sendMessageToAI: AI generated raw content (expecting text or JSON string):", aiResponseContent);

    const jsonRegex = /```json\s*(\{.*\})\s*```/s;
    const match = aiResponseContent.match(jsonRegex);
    if (match && match[1]) {
      aiResponseContent = match[1];
      console.log("sendMessageToAI: Stripped markdown, new content:", aiResponseContent);
    }

    let aiAction: AiTicketAction | null = null;
    try {
      const parsedContent = JSON.parse(aiResponseContent);
      if (parsedContent.action === "create_ticket" && parsedContent.title && parsedContent.description) {
        aiAction = parsedContent;
      }
    } catch (parseError) {
      console.log("sendMessageToAI: Content is not a JSON action. Treating as plain text message.");
    }

    const messagesCollection = collection(db, 'chatSessions', chatId, 'messages');
    await addDoc(messagesCollection, {
      text: newMessage,
      sender: 'user',
      timestamp: serverTimestamp(),
    });

    if (aiAction) {
      console.log("sendMessageToAI: AI requested ticket creation, returning action to UI.");
      return { type: "action", action: aiAction };
    } else {
      await addDoc(messagesCollection, {
        text: aiResponseContent,
        sender: 'ai',
        timestamp: serverTimestamp(),
      });
      console.log("sendMessageToAI: AI text response saved. Function finished successfully.");
      return { type: "message", text: aiResponseContent };
    }

  } catch (error) {
    console.error("Full error object when communicating with AI service or Firestore:", error);
    await addDoc(collection(db, 'chatSessions', chatId, 'messages'), {
      text: "Sorry, there was an error processing your request. Please try again later.",
      sender: 'ai',
      timestamp: serverTimestamp(),
    });
    return { type: "message", text: "Sorry, there was an error processing your request. Please try again later." };
  }
};