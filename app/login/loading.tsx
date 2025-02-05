import { Loader2 } from "lucide-react";

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
} 