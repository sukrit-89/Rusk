import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rusk AI",
  description: "Private RAG assistant with pgvector, FastAPI, Supabase auth, and NearAI TEE deployment path"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
