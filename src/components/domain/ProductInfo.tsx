"use client";

import { useState, useRef, useEffect } from "react";
import { ProductResponseDTO, ProductColor, Sku } from "@/lib/types/api";
import { effectivePrice } from "@/lib/utils/price";
import { ProductPrice } from "./ProductPrice";
import { useCart } from "@/lib/context/CartContext";
import { ProductAccordions } from "./ProductAccordions";

interface ProductInfoProps {
  product: ProductResponseDTO;
  activeColor: ProductColor;
  activeSize: Sku | null;
  onColorChange: (color: ProductColor) => void;
  onSizeChange: (size: Sku) => void;
}

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG"];

export function ProductInfo({
  product,
  activeColor,
  activeSize,
  onColorChange,
  onSizeChange
}: ProductInfoProps) {

  const [showExtraColors, setShowExtraColors] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowExtraColors(false);
      }
    }
    if (showExtraColors) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExtraColors]);

  const sortedSkus = [...activeColor.skus].sort((a, b) => {
    const idxA = SIZE_ORDER.indexOf(a.size);
    const idxB = SIZE_ORDER.indexOf(b.size);
    const wA = idxA === -1 ? 999 : idxA;
    const wB = idxB === -1 ? 999 : idxB;
    return wA - wB;
  });

  const MAX_VISIBLE_COLORS = 3;
  const visibleColors = product.colors.slice(0, MAX_VISIBLE_COLORS);
  const extraColors = product.colors.slice(MAX_VISIBLE_COLORS);
  const hasExtraColors = extraColors.length > 0;

  const handleAddToCart = () => {
    if (activeSize) {
      addItem({
        productId: product.id,
        skuId: activeSize.id,
        name: product.name,
        slug: product.slug,
        colorName: activeColor.colorName,
        colorHex: activeColor.colorHex,
        size: activeSize.size,
        price: effectivePrice(product),
        imageUrl: activeColor.coverImageUrl,
        stockQuantity: activeSize.stockQuantity,
        available: product.active && activeSize.stockQuantity > 0,
      });
    }
  };

  return (
    <div className="flex flex-col w-full h-full pt-8 md:pt-32 pb-32 md:pb-16 px-4 sm:px-8 md:pl-12 md:pr-16 md:max-w-xl">

      <h1 className="text-xl md:text-2xl tracking-wide text-foreground font-serif uppercase mb-2">
        {product.name}
      </h1>
      <ProductPrice
        listPrice={product.price}
        salePrice={product.promotionalPrice}
        size="lg"
        showBadge
        className="mb-6"
      />

      <div className="w-full h-[1px] bg-muted mb-8" />

      <div className="text-xs tracking-widest text-muted-foreground uppercase mb-4">
        {activeColor.colorName}
      </div>

      <div className="hidden md:flex items-center gap-3 flex-wrap relative mb-8">
        {product.colors.map((color) => {
          const isSelected = activeColor.id === color.id;
          return (
            <button
              key={color.id}
              onClick={() => onColorChange(color)}
              aria-label={`Cor ${color.colorName}`}
              className={`w-7 h-7 transition-all ${
                isSelected ? "border border-foreground p-[2px]" : "border border-transparent hover:border-muted p-[2px]"
              }`}
            >
              <div
                className="w-full h-full border border-muted"
                style={{ backgroundColor: color.colorHex }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex md:hidden items-center gap-3 relative mb-8">
        {visibleColors.map((color) => {
          const isSelected = activeColor.id === color.id;
          return (
            <button
              key={color.id}
              onClick={() => onColorChange(color)}
              aria-label={`Cor ${color.colorName}`}
              className={`w-7 h-7 transition-all ${
                isSelected ? "border border-foreground p-[2px]" : "border border-transparent hover:border-muted p-[2px]"
              }`}
            >
              <div
                className="w-full h-full border border-muted"
                style={{ backgroundColor: color.colorHex }}
              />
            </button>
          );
        })}

        {hasExtraColors && (
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowExtraColors(!showExtraColors)}
              className={`w-7 h-7 flex items-center justify-center text-xs font-medium text-foreground transition-colors border
                ${showExtraColors ? "border-foreground" : "border-transparent hover:border-muted"}
              `}
            >
              +
            </button>
            {showExtraColors && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-background border border-muted shadow-lg flex gap-2 z-50">
                {extraColors.map((color) => {
                  const isSelected = activeColor.id === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => {
                        onColorChange(color);
                        setShowExtraColors(false);
                      }}
                      className={`w-6 h-6 transition-all ${
                        isSelected ? "border border-foreground p-[1px]" : "border border-transparent hover:border-muted p-[1px]"
                      }`}
                    >
                      <div className="w-full h-full border border-muted" style={{ backgroundColor: color.colorHex }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        {sortedSkus.map((sku) => {
          const isSelected = activeSize?.size === sku.size;
          const isAvailable = sku.stockQuantity > 0;

          return (
            <button
              key={sku.size}
              onClick={() => isAvailable && onSizeChange(sku)}
              disabled={!isAvailable}
              className={`relative flex items-center justify-center text-xs tracking-widest min-w-[3rem] h-8 transition-colors
                ${isSelected
                  ? "border border-foreground text-foreground font-medium"
                  : isAvailable
                    ? "border border-transparent text-muted-foreground hover:border-muted"
                    : "border border-transparent text-muted-foreground/30 cursor-not-allowed"
                }
              `}
            >
              {sku.size}
              {!isAvailable && (
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_top_right,transparent_48%,#d1d5db_49%,#d1d5db_51%,transparent_52%)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 w-full px-4 py-4 bg-background border-t border-muted md:static md:p-0 md:bg-transparent md:border-t-0 md:mb-12 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none">
        <button
          onClick={handleAddToCart}
          className={`w-full py-4 text-xs tracking-[0.2em] uppercase font-medium transition-colors ${
            activeSize
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          disabled={!activeSize}
        >
          Adicionar ao Carrinho
        </button>
      </div>

      <div className="w-full flex flex-col gap-6 mt-8 md:mt-0 mb-8 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground">{product.description}</p>

        {product.fabricCompositions && product.fabricCompositions.length > 0 && (
          <div className="flex flex-col gap-2">
            <strong className="text-xs tracking-widest uppercase font-medium text-foreground">Composição:</strong>
            <ul className="flex flex-col gap-1">
              {product.fabricCompositions.map((fc, idx) => (
                <li key={idx}>
                  {fc.percentage}% {fc.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="w-full">
        <ProductAccordions product={product} />
      </div>

    </div>
  );
}
