export default function CollectionLoading() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12 md:pb-20 mt-16 sm:mt-20">
      <div className="mb-10 md:mb-16 flex flex-col items-center gap-4 animate-pulse">
        <div className="h-7 w-64 max-w-full bg-muted/60 rounded-sm" />
        <div className="h-4 w-48 max-w-full bg-muted/40 rounded-sm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 animate-pulse">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col">
            <div className="w-full aspect-[3/4] bg-muted/40 mb-4" />
            <div className="h-4 w-3/4 bg-muted/40 rounded-sm mb-2" />
            <div className="h-4 w-1/3 bg-muted/30 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
