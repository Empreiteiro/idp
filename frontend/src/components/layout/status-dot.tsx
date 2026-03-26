import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  completed: "bg-green-500",
  failed: "bg-red-500",
  review: "bg-yellow-500",
  uploaded: "bg-blue-400",
  ocr_processing: "bg-blue-500",
  ocr_complete: "bg-blue-300",
  classifying: "bg-purple-400",
  extracting: "bg-indigo-400",
};

interface StatusDotProps {
  status: string;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        statusColors[status] || "bg-gray-400",
        className
      )}
    />
  );
}
