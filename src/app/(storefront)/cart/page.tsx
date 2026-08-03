"use client";

import { useCart } from "@/lib/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

export default function CartPage() {
  const { items, cartTotal, cartCount, removeItem, updateQuantity } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center text-muted-foreground">
          <ShoppingBag className="w-8 h-8" strokeWidth={1} />
        </div>
        <h1 className="font-serif text-2xl tracking-widest text-foreground text-center">
          SEU CARRINHO ESTÁ VAZIO
        </h1>
        <Link
          href="/"
          className="mt-4 px-10 py-4 bg-foreground text-background text-xs tracking-widest uppercase font-medium hover:opacity-90 transition-opacity"
        >
          Continuar Comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <h1 className="font-serif text-xl sm:text-2xl tracking-widest mb-10 pb-4 border-b border-muted">
        CARRINHO ({cartCount})
      </h1>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        
        {/* Items List */}
        <div className="flex-1 flex flex-col gap-10">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-6 sm:gap-8 pb-10 border-b border-muted">
              
              {/* Image */}
              <Link 
                href={`/product/${item.slug}`}
                className="w-full sm:w-64 h-80 sm:h-72 relative bg-muted/20 flex-shrink-0 group block overflow-hidden"
              >
                <Image
                  src={item.imageUrl || "/placeholder.jpg"}
                  alt={item.name}
                  fill
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 256px"
                />
              </Link>

              {/* Info & Actions */}
              <div className="flex flex-col flex-1 justify-between py-2">
                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/product/${item.slug}`}
                    className="font-medium text-base hover:opacity-70 transition-opacity uppercase tracking-wide"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">Cor: {item.colorName}</p>
                  <p className="text-sm text-muted-foreground">Tamanho: {item.size}</p>
                  
                  {/* Quantity Control */}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      Quantidade:
                      {!item.available && (
                        <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-semibold text-[10px] tracking-wider uppercase">
                          Indisponível
                        </span>
                      )}
                    </span>
                    <div className="flex items-center border border-muted w-24">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex-1 py-1 flex items-center justify-center hover:bg-muted/50 transition-colors"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2} />
                      </button>
                      <span className="text-sm w-8 text-center tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= Math.min(10, item.stockQuantity)}
                        className={`flex-1 py-1 flex items-center justify-center transition-colors ${
                          item.quantity >= Math.min(10, item.stockQuantity) 
                            ? "opacity-30 cursor-not-allowed" 
                            : "hover:bg-muted/50"
                        }`}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-8 sm:mt-0 gap-6">
                  {/* Action Link */}
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                    >
                      Excluir
                    </button>
                  </div>

                  {/* Price */}
                  <span className="font-semibold text-lg">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Order Summary (Desktop Sticky / Mobile Bottom) */}
        <div className="w-full lg:w-[380px] flex-shrink-0">
          <div className="bg-muted/10 p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold tracking-widest uppercase mb-6 pb-4 border-b border-muted">
              Resumo do Pedido
            </h2>
            
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-green-600 font-medium uppercase tracking-widest text-xs">
                  Grátis
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between font-semibold text-base mb-8 pt-6 border-t border-muted">
              <span>Total Estimado</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>

            {items.some(item => !item.available) ? (
              <button
                disabled
                className="w-full py-4 bg-muted border border-muted text-muted-foreground text-center text-xs tracking-widest uppercase font-semibold cursor-not-allowed flex items-center justify-center"
              >
                Remova itens indisponíveis
              </button>
            ) : (
              <Link
                href="/checkout"
                className="w-full py-4 bg-foreground border border-foreground text-background text-center text-xs tracking-widest uppercase font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Prosseguir para o Pagamento
              </Link>
            )}

            <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
              Pagamento seguro. Suas informações estão protegidas. 
              Troca gratuita em até 30 dias.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
