import Link from "next/link";
import { Search, ShoppingBag, User } from "lucide-react";

interface UserActionBtnProps {
  className?: string;
  onClick: () => void;
  initials: string | null;
}

export function UserActionBtn({
  className = "w-5 h-5 sm:w-6 sm:h-6",
  onClick,
  initials,
}: UserActionBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Profile"
      className="p-1 hover:opacity-70 transition-opacity flex items-center justify-center"
    >
      {initials !== null ? (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] sm:text-xs font-semibold tracking-wide">
          {initials}
        </div>
      ) : (
        <User className={className} strokeWidth={1.5} />
      )}
    </button>
  );
}

interface SearchActionBtnProps {
  className?: string;
  onNavigate?: () => void;
}

export function SearchActionBtn({
  className = "w-5 h-5 sm:w-6 sm:h-6",
  onNavigate,
}: SearchActionBtnProps) {
  return (
    <Link
      href="/search"
      aria-label="Buscar"
      onClick={onNavigate}
      className="p-1 hover:opacity-70 transition-opacity flex items-center justify-center"
    >
      <Search className={className} strokeWidth={1.5} />
    </Link>
  );
}

interface CartActionBtnProps {
  className?: string;
  onClick: () => void;
  count: number;
}

export function CartActionBtn({
  className = "w-5 h-5 sm:w-6 sm:h-6",
  onClick,
  count,
}: CartActionBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Cart"
      className="p-1 hover:opacity-70 transition-opacity relative flex items-center justify-center"
    >
      <ShoppingBag className={className} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
