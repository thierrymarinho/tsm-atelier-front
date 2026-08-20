"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductSummaryDTO } from "@/lib/types/api";
import { DiscountBadge, ProductPrice } from "./ProductPrice";

interface ProductCardProps {
  product: ProductSummaryDTO;
  isNewBadge?: boolean;
}

export function ProductCard({ product, isNewBadge }: ProductCardProps) {
  const [showHover, setShowHover] = useState(false);
  const armHover = () => setShowHover(true);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col cursor-pointer"
      onMouseEnter={product.hoverImageUrl ? armHover : undefined}
      onFocus={product.hoverImageUrl ? armHover : undefined}
    >
      <div className="relative w-full aspect-[3/4] bg-muted overflow-hidden mb-4">
        <Image
          src={product.coverImageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`object-cover object-center transition-opacity duration-500 ease-in-out ${
            product.hoverImageUrl && showHover ? "group-hover:opacity-0" : ""
          }`}
        />

        {product.hoverImageUrl && showHover && (
          <Image
            src={product.hoverImageUrl}
            alt={`${product.name} - Alternate View`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center absolute inset-0 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100"
          />
        )}

        {product.promotionalPrice !== null && (
          <DiscountBadge listPrice={product.price} salePrice={product.promotionalPrice} />
        )}

        {isNewBadge && (
          <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-white/80 backdrop-blur-sm w-7 h-7 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <span className="text-[6px] md:text-[10px] font-semibold tracking-wider text-black mt-[1px]">
              NEW
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start text-left">
        <h3 className="text-sm tracking-wide text-foreground mb-1 line-clamp-1">
          {product.name}
        </h3>
        <ProductPrice
          listPrice={product.price}
          salePrice={product.promotionalPrice}
          className="mb-2"
        />

        {product.colorsHex && product.colorsHex.length > 1 && (
          <div className="flex items-center gap-1.5">
            {product.colorsHex.map((hex, idx) => (
              <div
                key={idx}
                className="w-3 h-3 border border-black/15"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
