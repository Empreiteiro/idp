import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import QueryProvider from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IDP - Intelligent Document Processing",
  description:
    "Platform for intelligent extraction of structured data from documents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-background">
              <div className="p-6">{children}</div>
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
