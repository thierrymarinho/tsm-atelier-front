import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VerifyEmailContent } from "./VerifyEmailContent";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full flex items-center justify-center min-h-screen bg-background px-4">
          <Loader2 className="w-12 h-12 text-foreground animate-spin" strokeWidth={1.5} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
