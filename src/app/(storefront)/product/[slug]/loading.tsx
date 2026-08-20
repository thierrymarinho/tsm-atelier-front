export default function ProductLoading() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="flex flex-col w-full md:flex-row">
        <div className="w-full md:w-1/2">
          <div className="w-full aspect-[3/4] bg-muted/40 animate-pulse" />
        </div>

        <div className="w-full md:w-1/2">
          <div className="flex flex-col gap-4 pt-8 md:pt-[calc(var(--header-height)+2rem)] pb-16 px-4 sm:px-8 md:pl-12 md:pr-16 md:max-w-xl animate-pulse">
            <div className="h-7 w-3/4 bg-muted/60 rounded-sm" />
            <div className="h-5 w-1/3 bg-muted/50 rounded-sm" />
            <div className="h-4 w-1/2 bg-muted/40 rounded-sm mt-4" />
            <div className="flex gap-3 mt-2">
              <div className="w-9 h-9 rounded-full bg-muted/50" />
              <div className="w-9 h-9 rounded-full bg-muted/40" />
              <div className="w-9 h-9 rounded-full bg-muted/30" />
            </div>
            <div className="h-4 w-1/3 bg-muted/40 rounded-sm mt-4" />
            <div className="grid grid-cols-4 gap-2 mt-2">
              <div className="h-11 bg-muted/40 rounded-sm" />
              <div className="h-11 bg-muted/40 rounded-sm" />
              <div className="h-11 bg-muted/40 rounded-sm" />
              <div className="h-11 bg-muted/40 rounded-sm" />
            </div>
            <div className="h-12 w-full bg-muted/60 rounded-sm mt-6" />
            <div className="flex flex-col gap-2 mt-6">
              <div className="h-4 w-full bg-muted/30 rounded-sm" />
              <div className="h-4 w-5/6 bg-muted/30 rounded-sm" />
              <div className="h-4 w-2/3 bg-muted/30 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
