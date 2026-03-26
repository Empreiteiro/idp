import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import QueryProvider from "@/lib/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { Breadcrumb } from "@/components/layout/breadcrumb";

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
            >
              Skip to main content
            </a>
            <div className="flex h-screen overflow-hidden bg-sidebar">
              <Sidebar />
              <main
                id="main-content"
                className="flex-1 overflow-y-auto bg-card mt-3 mr-3 mb-3 rounded-2xl synapse-shadow"
              >
                <div className="px-8 pt-6">
                  <Breadcrumb />
                </div>
                <div className="px-8 pb-8">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </div>
              </main>
            </div>
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
