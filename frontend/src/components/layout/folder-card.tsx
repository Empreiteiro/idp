import { Folder } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FolderCardProps {
  title: string;
  subtitle?: string;
  href: string;
  className?: string;
}

export function FolderCard({ title, subtitle, href, className }: FolderCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-6 synapse-shadow border border-border/50 hover:synapse-shadow-md transition-all duration-200",
        className
      )}
    >
      <div className="flex h-16 w-20 items-center justify-center">
        <Folder className="h-14 w-14 text-blue-400 fill-blue-100 dark:fill-blue-900/30 group-hover:scale-105 transition-transform" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-card-foreground truncate max-w-[140px]">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
