"use client";

import { useCart } from "@/lib/context/CartContext";
import { ExpiredSessionNotice } from "@/components/cart/ExpiredSessionNotice";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, removeItem, cartTotal, cartCount, isLocked } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`fixed z-[70] bg-background flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          bottom-0 left-0 w-full max-h-[85vh] rounded-t-2xl
          lg:top-0 lg:right-0 lg:left-auto lg:h-full lg:w-[420px] lg:max-h-full lg:rounded-none
          ${isCartOpen
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:translate-y-0 lg:translate-x-full"
          }
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted flex-shrink-0">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">
            Adicionado ao carrinho ({cartCount})
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 hover:opacity-70 transition-opacity"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <p className="text-muted-foreground text-sm tracking-wide">
                Seu carrinho está vazio.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-xs uppercase tracking-widest font-semibold border-b border-foreground pb-1 hover:opacity-70 transition-opacity"
              >
                Continuar Comprando
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {isLocked && <ExpiredSessionNotice />}
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-24 h-32 relative bg-muted/30 flex-shrink-0 overflow-hidden">
                    <Image
                      src={item.imageUrl || "/placeholder.jpg"}
                      alt={item.name}
                      fill
                      className="object-cover object-top"
                      sizes="96px"
                    />
                  </div>

                  <div className="flex flex-col flex-1 text-sm py-1">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => setIsCartOpen(false)}
                      className="font-medium text-foreground hover:opacity-70 transition-opacity mb-1 leading-tight"
                    >
                      {item.name}
                    </Link>
                    <div className="flex flex-col gap-0.5 text-muted-foreground text-xs mt-1 mb-2">
                      <span>Cor: {item.colorName}</span>
                      <span>Tamanho: {item.size}</span>
                      <span className="flex items-center gap-2">
                        Qtd: {item.quantity}
                        {!item.available && (
                          <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-semibold text-[10px] tracking-wider uppercase">
                            Indisponível
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between">
                      <span className="font-semibold text-foreground">
                        {formatPrice(item.price)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isLocked}
                        className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-muted p-6 flex-shrink-0 bg-background pb-8 lg:pb-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold tracking-wider uppercase text-foreground">
                Subtotal
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/cart"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-4 border border-foreground text-foreground text-center text-xs tracking-widest uppercase font-semibold hover:bg-foreground hover:text-background transition-colors block"
              >
                Ir para o Carrinho
              </Link>

              {isLocked ? (
                <button
                  disabled
                  className="w-full py-4 bg-muted border border-muted text-muted-foreground text-center text-xs tracking-widest uppercase font-semibold cursor-not-allowed"
                >
                  Entre para continuar
                </button>
              ) : items.some(item => !item.available) ? (
                <button
                  disabled
                  className="w-full py-4 bg-muted border border-muted text-muted-foreground text-center text-xs tracking-widest uppercase font-semibold cursor-not-allowed"
                >
                  Remova itens indisponíveis
                </button>
              ) : (
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-4 bg-foreground border border-foreground text-background text-center text-xs tracking-widest uppercase font-semibold hover:opacity-90 transition-opacity block"
                >
                  Prosseguir para o Pagamento
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
