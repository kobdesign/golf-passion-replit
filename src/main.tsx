import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('[Main] Starting app...');
console.log('[Main] Environment variables:', {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_KEY_LENGTH: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.length,
  MAPBOX_TOKEN_LENGTH: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.length,
});

createRoot(document.getElementById("root")!).render(<App />);
console.log('[Main] App rendered');
