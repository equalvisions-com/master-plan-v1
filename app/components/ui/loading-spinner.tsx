import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

export function LoadingSpinner({ fullScreen = true }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex items-center justify-center w-full",
      fullScreen ? "min-h-screen" : "min-h-[100px]"
    )}>
      <Loader2 className="h-8 w-8 animate-spin text-black" />
    </div>
  );
} 