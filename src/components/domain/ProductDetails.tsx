"use client";

import { useState } from "react";
import { ProductResponseDTO, ProductColor, Sku } from "@/lib/types/api";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";

interface ProductDetailsProps {
  product: ProductResponseDTO;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  // Ensure we have colors to select from and sort them by ID so the principal (first created) is always default
  const sortedColors = product.colors ? [...product.colors].sort((a, b) => a.id - b.id) : [];
  const initialColor = sortedColors.length > 0 ? sortedColors[0] : null;
  const sortedProduct = { ...product, colors: sortedColors };
  
  
  const [activeColor, setActiveColor] = useState<ProductColor | null>(initialColor);
  const [activeSize, setActiveSize] = useState<Sku | null>(null);

  const handleColorChange = (color: ProductColor) => {
    setActiveColor(color);
    // Reset size when color changes since SKUs might differ
    setActiveSize(null); 
  };

  if (!activeColor) {
    return <div className="p-6 text-center text-muted-foreground">Produto sem configuração de cores.</div>;
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="flex flex-col w-full md:flex-row">
        
        {/* Left Column: Gallery (Scrollable on Desktop) */}
        <div className="w-full md:w-1/2">
          <ProductGallery color={activeColor} />
        </div>

        {/* Right Column: Info & Accordions (Sticky on Desktop) */}
        <div className="w-full md:w-1/2 md:sticky md:top-20 md:h-[calc(100vh-80px)] md:overflow-y-auto">
          <ProductInfo 
            product={sortedProduct}
            activeColor={activeColor}
            activeSize={activeSize}
            onColorChange={handleColorChange}
            onSizeChange={setActiveSize}
          />
        </div>

      </div>
    </div>
  );
}
