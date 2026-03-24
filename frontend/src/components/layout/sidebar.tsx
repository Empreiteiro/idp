"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Upload,
  Settings,
  Brain,
  Table2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FolderOpen },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/documents/upload", label: "Upload", icon: Upload },
  { href: "/data", label: "Extracted Data", icon: Table2 },
  { href: "/llm-logs", label: "LLM Logs", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Brain className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-lg font-bold leading-tight">IDP</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Intelligent Document Processing
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          IDP Platform v1.0
        </p>
      </div>
    </aside>
  );
}
