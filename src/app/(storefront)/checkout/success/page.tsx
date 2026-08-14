import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SuccessContent } from "./SuccessContent";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
