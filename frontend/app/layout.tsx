import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Multimodal Attendance & Engagement Agent",
  description: "Privacy-Preserving Offline-First Classroom Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-darkSlate-900 min-h-screen">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
