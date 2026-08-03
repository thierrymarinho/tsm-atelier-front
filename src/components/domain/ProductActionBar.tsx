"use client";

import { useState, useRef, useEffect } from "react";
import { Heart } from "lucide-react";
import { ProductResponseDTO, ProductColor, Sku } from "@/lib/types/api";
import { formatBRL } from "@/lib/utils/format";
import { useCart } from "@/lib/context/CartContext";

interface ProductActionBarProps {
  product: ProductResponseDTO;
  activeColor: ProductColor;
  activeSize: Sku | null;
  onColorChange: (color: ProductColor) => void;
  onSizeChange: (size: Sku) => void;
}

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG"];

export function ProductActionBar({ 
  product, 
  activeColor, 
  activeSize, 
  onColorChange, 
  onSizeChange 
}: ProductActionBarProps) {
  
  const [showExtraColors, setShowExtraColors] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  // Close popover when clicking outside
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

  return (
    <div className="fixed bottom-0 left-0 w-full bg-background border-t border-muted px-4 sm:px-6 py-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex flex-col gap-5">
      
      {/* Title, Price and Wishlist */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h1 className="text-sm tracking-wide font-medium text-foreground">
            {product.name}
          </h1>
          <p className="text-sm tracking-widest text-muted-foreground mt-1">
            {formatBRL(product.price)}
          </p>
        </div>
        <button 
          aria-label="Add to wishlist" 
          className="p-1 hover:opacity-70 transition-opacity"
        >
          <Heart className="w-5 h-5 text-foreground" strokeWidth={1.5} />
        </button>
      </div>

      {/* Selectors Row: Tamanhos (Esquerda) e Cores (Direita) */}
      <div className="flex items-start justify-between w-full">
        
        {/* Tamanhos */}
        <div className="flex flex-col gap-2">
          <span className="text-xs tracking-wide text-foreground">Tamanho</span>
          <div className="flex flex-wrap gap-2">
            {sortedSkus.map((sku) => {
              const isSelected = activeSize?.size === sku.size;
              const isAvailable = sku.stockQuantity > 0;
              
              return (
                <button
                  key={sku.size}
                  onClick={() => isAvailable && onSizeChange(sku)}
                  disabled={!isAvailable}
                  aria-label={`Tamanho ${sku.size} ${!isAvailable ? '(Esgotado)' : ''}`}
                  className={`relative w-6 h-6 flex items-center justify-center text-[10px] font-medium transition-colors border
                    ${isSelected 
                      ? "border-foreground text-foreground" 
                      : isAvailable
                        ? "border-muted text-muted-foreground hover:border-foreground/50"
                        : "border-muted/50 text-muted-foreground/30 cursor-not-allowed"
                    }
                  `}
                >
                  {sku.size}
                  
                  {/* Diagonal Line for Out of Stock */}
                  {!isAvailable && (
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_top_right,transparent_48%,#d1d5db_49%,#d1d5db_51%,transparent_52%)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cores */}
        <div className="flex flex-col gap-2 items-end">
          <span className="text-xs tracking-wide text-foreground">Cor</span>
          <div className="flex items-center gap-2 relative">
            
            {visibleColors.map((color) => {
              const isSelected = activeColor.id === color.id;
              return (
                <button
                  key={color.id}
                  onClick={() => onColorChange(color)}
                  aria-label={`Cor ${color.colorName}`}
                  className={`w-6 h-6 border transition-all ${
                    isSelected ? "border-foreground p-[2px]" : "border-muted hover:border-foreground/50"
                  }`}
                >
                  <div 
                    className="w-full h-full"
                    style={{ backgroundColor: color.colorHex }}
                  />
                </button>
              );
            })}

            {/* + Button and Popover for extra colors */}
            {hasExtraColors && (
              <div className="relative" ref={popoverRef}>
                <button
                  onClick={() => setShowExtraColors(!showExtraColors)}
                  aria-label="Mais cores"
                  className={`w-6 h-6 flex items-center justify-center text-[10px] font-medium text-foreground transition-colors border
                    ${showExtraColors ? "border-foreground" : "border-muted hover:border-foreground/50"}
                  `}
                >
                  +
                </button>

                {showExtraColors && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 bg-background border border-muted shadow-lg flex gap-2 z-50">
                    {extraColors.map((color) => {
                      const isSelected = activeColor.id === color.id;
                      return (
                        <button
                          key={color.id}
                          onClick={() => {
                            onColorChange(color);
                            setShowExtraColors(false);
                          }}
                          aria-label={`Cor ${color.colorName}`}
                          className={`w-5 h-5 border transition-all ${
                            isSelected ? "border-foreground p-[2px]" : "border-muted hover:border-foreground/50"
                          }`}
                        >
                          <div 
                            className="w-full h-full"
                            style={{ backgroundColor: color.colorHex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add to Cart Button */}
      <button 
        onClick={() => {
          if (activeSize) {
            addItem({
              productId: product.id,
              skuId: activeSize.id,
              name: product.name,
              slug: product.slug,
              colorName: activeColor.colorName,
              colorHex: activeColor.colorHex,
              size: activeSize.size,
              price: product.price,
              imageUrl: activeColor.coverImageUrl,
              stockQuantity: activeSize.stockQuantity,
              available: product.active && activeSize.stockQuantity > 0,
            });
          }
        }}
        className={`w-full py-4 mt-2 text-xs tracking-widest uppercase font-medium transition-colors ${
          activeSize 
            ? "bg-foreground text-background hover:opacity-90" 
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
        disabled={!activeSize}
      >
        Adicionar ao Carrinho
      </button>

    </div>
  );
}
