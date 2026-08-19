"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useCart } from "@/lib/context/CartContext";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";
import { useHeaderScroll } from "@/lib/hooks/useHeaderScroll";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartActionBtn, SearchActionBtn, UserActionBtn } from "./HeaderActions";

const MenuDrawer = dynamic(() =>
  import("./MenuDrawer").then((mod) => mod.MenuDrawer),
);

interface HeaderMode {
  /** Rolagem em px até onde o header é transparente. `null` = sempre sólido. */
  transparentUntil: number | null;
  /** Texto claro enquanto transparente. Só a home tem capa escura embaixo. */
  lightTextWhenTransparent: boolean;
  /** Sai da tela ao rolar para baixo e volta ao rolar para cima. */
  hidesOnScroll: boolean;
}

// A home usa 50px, e não 0, porque é o comportamento que ela já tinha — a capa
// tolera um começo de rolagem sem trocar de cor. O produto usa 0: a foto ocupa
// a tela inteira, então qualquer rolagem já pede header legível.
const HOME: HeaderMode = { transparentUntil: 50, lightTextWhenTransparent: true, hidesOnScroll: false };
const PRODUCT: HeaderMode = { transparentUntil: 0, lightTextWhenTransparent: false, hidesOnScroll: true };
const LISTING: HeaderMode = { transparentUntil: null, lightTextWhenTransparent: false, hidesOnScroll: true };
const PINNED: HeaderMode = { transparentUntil: null, lightTextWhenTransparent: false, hidesOnScroll: false };

const LISTING_ROUTES = ["/collections/", "/sale", "/catalog", "/search"];

// `PINNED` é o padrão, e não o transparente: uma rota nova aparecer com header
// sólido é feio; aparecer com header invisível sobre fundo branco é um bug que
// ninguém nota até um cliente reclamar. /account, /cart, /checkout,
// /checkout/success, /contact e /verify-email caem aqui.
function resolveHeaderMode(pathname: string | null): HeaderMode {
  if (!pathname || pathname === "/") return HOME;
  if (pathname.startsWith("/product/")) return PRODUCT;
  if (LISTING_ROUTES.some((route) => pathname.startsWith(route))) return LISTING;
  return PINNED;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);
  const { isAuthPanelOpen, openAuthPanel, closeAuthPanel } = useAuthPanel();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading: isAuthLoading, isAdminArea } = useAuth();
  const isAdmin = !isAuthLoading && isAdminArea;
  const { cartCount, isCartOpen, setIsCartOpen } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [canHover, setCanHover] = useState(false);

  const mode = resolveHeaderMode(pathname);

  // Qualquer painel aberto está visualmente ancorado no header. Deixá-lo
  // deslizar para fora levaria o menu pendurado junto.
  const isPanelOpen = isMenuOpen || isCartOpen || isAuthPanelOpen;

  const { isHidden, isPastTransparency } = useHeaderScroll({
    canHide: mode.hidesOnScroll,
    pinned: isPanelOpen,
    transparentUntil: mode.transparentUntil,
  });

  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      setCanHover(pointer.matches);
      if (!pointer.matches) setIsHovered(false);
    };

    update();
    pointer.addEventListener("change", update);
    return () => pointer.removeEventListener("change", update);
  }, []);

  // O hover derruba a transparência para o header continuar legível quando
  // alguém mira o menu sobre uma foto clara.
  const isTransparent = !isPastTransparency && !isHovered && !isPanelOpen;

  const getInitials = () => {
    if (!user) return "";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleUserClick = () => {
    if (isAuthenticated) {
      router.push('/account');
    } else {
      openAuthPanel();
      if (isMenuOpen) closeMenu();
    }
  };

  const handleCartClick = () => {
    setIsCartOpen(true);
    if (isMenuOpen) closeMenu();
  };

  const avatarInitials = isAuthenticated && user ? getInitials() : null;

  return (
    <>
      <header
        onMouseEnter={canHover ? () => setIsHovered(true) : undefined}
        onMouseLeave={canHover ? () => setIsHovered(false) : undefined}
        className={`fixed top-0 w-full z-40 transition-all duration-300 motion-reduce:transition-none border-b ${
          isHidden ? "-translate-y-full" : "translate-y-0"
        } ${
          isTransparent
            ? `bg-transparent border-transparent ${mode.lightTextWhenTransparent ? "text-white" : "text-foreground"}`
            : "bg-background text-foreground border-muted shadow-sm"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 h-[var(--header-height)] flex items-center justify-between">

          <div className="flex items-center gap-4 sm:gap-6 flex-1">
            <button
              aria-label="Menu"
              className="p-1 hover:opacity-70 transition-opacity"
              onClick={() => {
                setIsMenuOpen(true);
                setHasOpenedMenu(true);
              }}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            </button>

            <SearchActionBtn />
          </div>

          <div className="flex-shrink-0 flex justify-center">
            <Link
              href="/"
              className="font-serif text-lg sm:text-2xl tracking-widest uppercase hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              TSM Atelier
            </Link>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-end">
            <UserActionBtn onClick={handleUserClick} initials={avatarInitials} />
            <CartActionBtn onClick={handleCartClick} count={cartCount} />
          </div>

        </div>
      </header>

      {hasOpenedMenu && (
        <MenuDrawer
          isOpen={isMenuOpen}
          onClose={closeMenu}
          onUserClick={handleUserClick}
          onCartClick={handleCartClick}
          avatarInitials={avatarInitials}
          cartCount={cartCount}
          isAdmin={isAdmin}
        />
      )}

      <AuthPanel isOpen={isAuthPanelOpen} onClose={closeAuthPanel} />

      <CartDrawer />
    </>
  );
}
