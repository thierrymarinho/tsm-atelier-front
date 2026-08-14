import { formatBRL } from "@/lib/utils/format";
import { discountPercentage } from "@/lib/utils/price";

interface ProductPriceProps {
  listPrice: number;
  salePrice: number | null;
  size?: "sm" | "lg";
  showBadge?: boolean;
  className?: string;
}

export function ProductPrice({
  listPrice,
  salePrice,
  size = "sm",
  showBadge = false,
  className = "",
}: ProductPriceProps) {
  const textSize = size === "lg" ? "text-sm tracking-widest" : "text-sm";

  if (salePrice === null) {
    return (
      <p className={`${textSize} font-medium text-foreground ${className}`}>
        {formatBRL(listPrice)}
      </p>
    );
  }

  return (
    <p className={`${textSize} flex items-center gap-2 flex-wrap ${className}`}>
      <s className="text-muted-foreground font-normal">
        <span className="sr-only">Preço original: </span>
        {formatBRL(listPrice)}
      </s>
      <span className="font-semibold text-red-600">
        <span className="sr-only">Preço promocional: </span>
        {formatBRL(salePrice)}
      </span>
      {showBadge && <DiscountBadge listPrice={listPrice} salePrice={salePrice} inline />}
    </p>
  );
}

interface DiscountBadgeProps {
  listPrice: number;
  salePrice: number;
  inline?: boolean;
}

export function DiscountBadge({ listPrice, salePrice, inline = false }: DiscountBadgeProps) {
  const percentage = discountPercentage(listPrice, salePrice);

  if (percentage < 1) return null;

  const label = `-${percentage}%`;

  if (inline) {
    return (
      <span className="bg-red-600 text-white text-[10px] font-semibold tracking-wider px-1.5 py-0.5">
        {label}
      </span>
    );
  }

  return (
    <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 bg-red-600 text-white px-2 py-1 md:px-2.5 md:py-1.5">
      <span className="text-[9px] md:text-[11px] font-semibold tracking-wider">{label}</span>
    </div>
  );
}
