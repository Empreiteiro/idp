"use client";

import { List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  value: "list" | "grid";
  onChange: (value: "list" | "grid") => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-xl border bg-card p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 gap-2 rounded-lg px-3 text-xs font-medium",
          value === "list"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange("list")}
      >
        <List className="h-3.5 w-3.5" />
        List View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 gap-2 rounded-lg px-3 text-xs font-medium",
          value === "grid"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange("grid")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Grid
      </Button>
    </div>
  );
}
