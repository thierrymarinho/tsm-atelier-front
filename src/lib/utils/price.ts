interface PricedProduct {
  price: number;
  promotionalPrice: number | null;
}

export function isOnSale(product: PricedProduct): boolean {
  return product.promotionalPrice !== null;
}

export function effectivePrice(product: PricedProduct): number {
  return product.promotionalPrice ?? product.price;
}

export function discountPercentage(listPrice: number, salePrice: number): number {
  return Math.round(((listPrice - salePrice) / listPrice) * 100);
}
