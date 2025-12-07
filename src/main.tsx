// src/main.tsx
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// NEW: Favicon injection logic to set the browser tab icon
const faviconBaseUrl = "https://i.postimg.cc/1XGdZPhV/Alias-Informatique.png";
// Use a timestamp to bust the browser cache, which is necessary for favicons
const cacheBuster = Date.now();
const faviconUrl = `${faviconBaseUrl}?v=${cacheBuster}`;

// Check if a favicon link already exists and remove it to prevent duplicates
let existingLink = document.querySelector("link[rel*='icon']");
if (existingLink) {
    existingLink.remove();
}

const link = document.createElement('link');
link.rel = 'icon';
link.href = faviconUrl;
link.type = 'image/png'; // Explicitly set type to help the browser
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);