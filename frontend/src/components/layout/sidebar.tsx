"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Upload,
  Settings,
  FileCheck,
  Table2,
  Activity,
  Lightbulb,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/use-dashboard";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  );
}

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, countKey: "total_documents" as const },
  { href: "/templates", label: "Templates", icon: FolderOpen, countKey: "total_templates" as const },
  { href: "/documents", label: "Documents", icon: FileText, countKey: null },
  { href: "/documents/upload", label: "Upload", icon: Upload, countKey: null },
  { href: "/data", label: "Extracted Data", icon: Table2, countKey: null },
  { href: "/insight-templates", label: "Insight Templates", icon: Lightbulb, countKey: null },
  { href: "/insights", label: "Insights", icon: BarChart3, countKey: null },
  { href: "/llm-logs", label: "LLM Logs", icon: Activity, countKey: null },
  { href: "/settings", label: "Settings", icon: Settings, countKey: null },
];

const spaceItems = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/data", label: "Extracted Data", icon: Database },
  { href: "/insights", label: "Insights", icon: Eye },
];

const tagFilters = [
  { label: "Pending", status: "review", color: "bg-yellow-500" },
  { label: "Processing", status: "extracting,ocr_processing,classifying", color: "bg-blue-500" },
  { label: "Completed", status: "completed", color: "bg-green-500" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [spaceOpen, setSpaceOpen] = useState(true);
  const { data: stats } = useDashboardStats();

  // Read status from URL without useSearchParams (avoids Suspense requirement)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCurrentStatus(params.get("status"));
  }, [pathname]);

  function getCount(countKey: "total_documents" | "total_templates" | null): number | undefined {
    if (!countKey || !stats) return undefined;
    return stats[countKey];
  }

  return (
    <aside className="flex w-[272px] flex-col rounded-2xl bg-sidebar synapse-shadow border border-border/40">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border/40 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <FileCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight text-sidebar-foreground">
            IDP
          </h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Intelligent Document Processing
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-4">
          {/* Section 1: Features */}
          <SectionLabel>Features</SectionLabel>
          <nav className="space-y-0.5">
            {mainNavItems.map((item) => {
              const hasMoreSpecificMatch = mainNavItems.some(
                (other) =>
                  other.href !== item.href &&
                  other.href.startsWith(item.href + "/") &&
                  (pathname === other.href ||
                    pathname.startsWith(other.href + "/"))
              );
              const isActive =
                !hasMoreSpecificMatch &&
                (pathname === item.href ||
                  pathname.startsWith(item.href + "/"));
              const count = getCount(item.countKey);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {count !== undefined && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Section 2: IDP Space */}
          <SectionLabel>IDP Space</SectionLabel>
          <Collapsible open={spaceOpen} onOpenChange={setSpaceOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
              {spaceOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <Folder className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Data Views</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 space-y-0.5 border-l border-border pl-3 mt-0.5">
                {spaceItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={`space-${item.href}`}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 3: Tags */}
          <SectionLabel>Tags</SectionLabel>
          <nav className="space-y-0.5">
            {tagFilters.map((tag) => {
              const isActive = currentStatus === tag.status;
              return (
                <Link
                  key={tag.status}
                  href={`/documents?status=${tag.status}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full shrink-0", tag.color)}
                  />
                  <span className="flex-1">{tag.label}</span>
                  {stats?.documents_by_status && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {tag.status.includes(",")
                        ? tag.status
                            .split(",")
                            .reduce(
                              (sum, s) =>
                                sum + (stats.documents_by_status[s] || 0),
                              0
                            )
                        : stats.documents_by_status[tag.status] || 0}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">IDP v1.0</p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
