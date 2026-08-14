"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
  ChevronRight,
  ChevronLeft,
  Phone,
  Globe,
  Loader2,
  LayoutDashboard
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { CollectionResponseDTO, pickCollectionImage } from "@/lib/types/api";
import { useAuth } from "@/lib/context/AuthContext";
import { useCart } from "@/lib/context/CartContext";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuthPanel } from "@/lib/context/AuthPanelContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { translateCategory } from "@/lib/utils/translations";

type MenuState = "main" | "novidades" | "feminino" | "masculino";

const LIGHT_BACKGROUND_ROUTES = [
  "/product/",
  "/collections/",
  "/catalog",
  "/sale",
  "/cart",
  "/search",
  "/account",
];

const SOLID_HEADER_ROUTES = ["/checkout", "/contact"];

interface UserActionBtnProps {
  className?: string;
  onClick: () => void;
  initials: string | null;
}

function UserActionBtn({
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

function SearchActionBtn({
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

function CartActionBtn({
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

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthPanelOpen, openAuthPanel, closeAuthPanel } = useAuthPanel();
  const [activeMenu, setActiveMenu] = useState<MenuState>("main");
  const carouselRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = !isAuthLoading && user?.role === "ADMIN";
  const { cartCount, setIsCartOpen } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const isAlwaysTransparentWithBlackText = LIGHT_BACKGROUND_ROUTES.some((route) =>
    pathname?.startsWith(route),
  );
  const hasSolidHeader = SOLID_HEADER_ROUTES.some((route) => pathname?.startsWith(route));

  const isTransparent =
    !hasSolidHeader &&
    (isAlwaysTransparentWithBlackText
      ? !isHovered
      : !isScrolled && !isHovered);

  const getInitials = () => {
    if (!user) return "";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 250;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setTimeout(() => setActiveMenu("main"), 300);
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

  const { data: headerCollection, isLoading: isLoadingHeaderCollection } = useQuery({
    queryKey: ['collections', 'header'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'HEADER', targetAudience: 'WOMEN' }
      });
      return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
    },
    enabled: isMenuOpen,
  });

  const { data: womensCollections, isLoading: isLoadingWomensCollections } = useQuery({
    queryKey: ['collections', 'women'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { targetAudience: 'WOMEN' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
    },
    enabled: activeMenu === "novidades",
  });

  const { data: featuredCollections, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['collections', 'featured'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'NEW_ARRIVALS' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
    },
    enabled: activeMenu === "novidades",
  });

  const { data: mensCollections, isLoading: isLoadingMensCollections } = useQuery({
    queryKey: ['collections', 'men'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { targetAudience: 'MEN' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
    },
    enabled: activeMenu === "novidades",
  });

  const { data: womensCategories, isLoading: isLoadingWomensCategories } = useQuery({
    queryKey: ['categories', 'women'],
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/v1/catalog/products/categories', {
        params: { targetAudience: 'WOMEN' }
      });
      return response.data || [];
    },
    enabled: activeMenu === "feminino",
  });

  const { data: womensGridCollections, isLoading: isLoadingWomensGrid } = useQuery({
    queryKey: ['collections', 'featured', 'women'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'FEATURED', targetAudience: 'WOMEN' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 4) : [];
    },
    enabled: activeMenu === "feminino",
  });

  const { data: mensCategories, isLoading: isLoadingMensCategories } = useQuery({
    queryKey: ['categories', 'men'],
    queryFn: async () => {
      const response = await apiClient.get<string[]>('/v1/catalog/products/categories', {
        params: { targetAudience: 'MEN' }
      });
      return response.data || [];
    },
    enabled: activeMenu === "masculino",
  });

  const { data: mensGridCollections, isLoading: isLoadingMensGrid } = useQuery({
    queryKey: ['collections', 'featured', 'men'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'FEATURED', targetAudience: 'MEN' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 4) : [];
    },
    enabled: activeMenu === "masculino",
  });

  const getMenuTitle = () => {
    switch (activeMenu) {
      case "novidades": return "Novidades";
      case "feminino": return "Feminino";
      case "masculino": return "Masculino";
      default: return "";
    }
  };

  return (
    <>
      <header
        onMouseEnter={canHover ? () => setIsHovered(true) : undefined}
        onMouseLeave={canHover ? () => setIsHovered(false) : undefined}
        className={`fixed top-0 w-full z-40 transition-all duration-300 border-b ${
          isTransparent
            ? `bg-transparent border-transparent ${isAlwaysTransparentWithBlackText ? "text-foreground" : "text-white"}`
            : "bg-background text-foreground border-muted shadow-sm"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 h-[var(--header-height)] flex items-center justify-between">

          <div className="flex items-center gap-4 sm:gap-6 flex-1">
            <button
              aria-label="Menu"
              className="p-1 hover:opacity-70 transition-opacity"
              onClick={() => setIsMenuOpen(true)}
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

      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
      />

      <div
        className={`fixed top-0 left-0 h-full w-full max-w-[400px] bg-background text-foreground z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-x-hidden ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted min-h-[72px]">
          {activeMenu === "main" ? (
            <>
              <div className="flex items-center gap-6">
                <button
                  onClick={closeMenu}
                  className="p-1 hover:opacity-70 transition-opacity"
                >
                  <X className="w-6 h-6" strokeWidth={1.5} />
                </button>
                <SearchActionBtn className="w-6 h-6" onNavigate={closeMenu} />
              </div>

              <div className="flex items-center gap-6">
                <UserActionBtn
                  className="w-6 h-6"
                  onClick={handleUserClick}
                  initials={avatarInitials}
                />
                <CartActionBtn
                  className="w-6 h-6"
                  onClick={handleCartClick}
                  count={cartCount}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center w-full relative">
               <button
                  onClick={() => setActiveMenu("main")}
                  className="p-1 hover:opacity-70 transition-opacity absolute left-0"
                >
                  <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
                </button>
                <h2 className="flex-1 text-center text-sm font-semibold tracking-wider">
                  {getMenuTitle()}
                </h2>
                <div className="w-6 h-6 absolute right-0"></div>
            </div>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden">

          <div
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto ${
               activeMenu === "main" ? "translate-x-0" : "-translate-x-full"
             }`}
          >
            <div className="px-6 pt-6 pb-2">
              {isLoadingHeaderCollection ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Carregando destaque...</span>
                </div>
              ) : headerCollection ? (
                <Link
                  href={`/collections/${headerCollection.slug}`}
                  onClick={closeMenu}
                  className="group block"
                >
                  <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden mb-3">
                    {(() => {
                      const src = pickCollectionImage(headerCollection, ["squareImageUrl", "portraitImageUrl", "heroImageUrl"]);
                      return src ? (
                        <Image
                          src={src}
                          alt="Featured Collection"
                          fill
                          sizes="(max-width: 400px) 100vw, 352px"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : null;
                    })()}
                  </div>
                  <h3 className="text-center text-sm tracking-widest font-medium uppercase text-foreground group-hover:text-muted-foreground transition-colors">
                    {headerCollection.name}
                  </h3>
                </Link>
              ) : null}
            </div>

            <nav className="flex flex-col py-2">
              <button
                onClick={() => setActiveMenu("novidades")}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors w-full"
              >
                <span className="text-sm tracking-wide">Novidades</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setActiveMenu("feminino")}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors w-full"
              >
                <span className="text-sm tracking-wide">Feminino</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setActiveMenu("masculino")}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors w-full"
              >
                <span className="text-sm tracking-wide">Masculino</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </button>

              <Link
                href="/sale"
                onClick={closeMenu}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors w-full"
              >
                <span className="text-sm tracking-wide text-red-600 font-medium">Sale</span>
              </Link>
            </nav>

            <div className="mt-auto flex flex-col py-8 border-t border-muted">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="flex items-center gap-4 px-6 py-3 pb-5 mb-3 border-b border-muted hover:bg-muted/50 transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm tracking-wide font-medium">Painel administrativo</span>
                </Link>
              )}
              <Link href="/cart" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm tracking-wide">Carrinho</span>
              </Link>
              <Link href="/contact" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
                <Phone className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm tracking-wide">Fale conosco</span>
              </Link>
              <button className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors mt-2 text-left">
                <Globe className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm tracking-wide">Brasil / Portuguese</span>
              </button>
            </div>
          </div>

          <div
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto bg-background text-foreground ${
               activeMenu === "novidades" ? "translate-x-0" : "translate-x-full"
             }`}
          >
            <div className="py-6">
               <h3 className="px-6 text-xs text-muted-foreground font-medium tracking-widest uppercase mb-4">
                 Para Ela
               </h3>

               <div className="flex flex-col mb-8">
                 <Link
                   href="/collections/novidades-mulheres"
                   onClick={closeMenu}
                   className="px-6 py-3 text-sm tracking-wide hover:bg-muted/50 transition-colors"
                 >
                   Novidades para mulheres
                 </Link>
                 {isLoadingWomensCollections ? (
                   <div className="px-6 py-4 flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando coleções...</span>
                   </div>
                 ) : womensCollections && womensCollections.length > 0 ? (
                   womensCollections.map((collection) => (
                     <Link
                       key={collection.id}
                       href={`/collections/${collection.slug}`}
                       onClick={closeMenu}
                       className="px-6 py-3 text-sm tracking-wide hover:bg-muted/50 transition-colors"
                     >
                       {collection.name}
                     </Link>
                   ))
                 ) : (
                   <div className="px-6 py-3 text-sm tracking-wide text-muted-foreground">
                     Nenhuma coleção encontrada.
                   </div>
                 )}
               </div>

               <h3 className="px-6 text-xs text-muted-foreground font-medium tracking-widest uppercase mb-4 mt-6">
                 Para Ele
               </h3>

               <div className="flex flex-col mb-8">
                 <Link
                   href="/collections/novidades-homens"
                   onClick={closeMenu}
                   className="px-6 py-3 text-sm tracking-wide hover:bg-muted/50 transition-colors"
                 >
                   Novidades para homens
                 </Link>

                 {isLoadingMensCollections ? (
                   <div className="px-6 py-4 flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando coleções...</span>
                   </div>
                 ) : mensCollections && mensCollections.length > 0 ? (
                   mensCollections.map((collection) => (
                     <Link
                       key={collection.id}
                       href={`/collections/${collection.slug}`}
                       onClick={closeMenu}
                       className="px-6 py-3 text-sm tracking-wide hover:bg-muted/50 transition-colors"
                     >
                       {collection.name}
                     </Link>
                   ))
                 ) : (
                   <div className="px-6 py-3 text-sm tracking-wide text-muted-foreground">
                     Nenhuma coleção encontrada.
                   </div>
                 )}
               </div>

               <div className="mt-8 px-6 pb-12 relative">
                 {isLoadingFeatured ? (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando destaques...</span>
                   </div>
                 ) : featuredCollections && featuredCollections.length > 0 ? (
                   <div className="relative group">
                     <button
                       onClick={() => scrollCarousel('left')}
                       className="absolute left-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 shadow-md rounded-full flex items-center justify-center z-10 hover:bg-white transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                     >
                       <ChevronLeft className="w-5 h-5 text-black" strokeWidth={1.5} />
                     </button>
                     <button
                       onClick={() => scrollCarousel('right')}
                       className="absolute right-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 shadow-md rounded-full flex items-center justify-center z-10 hover:bg-white transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                     >
                       <ChevronRight className="w-5 h-5 text-black" strokeWidth={1.5} />
                     </button>

                     <div
                       ref={carouselRef}
                       className="flex overflow-x-auto gap-4 snap-x snap-mandatory scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                     >
                       {featuredCollections.map((collection) => (
                         <Link
                           key={collection.id}
                           href={`/collections/${collection.slug}`}
                           onClick={closeMenu}
                           className="min-w-[220px] sm:min-w-[260px] flex-shrink-0 snap-center group/item cursor-pointer"
                         >
                           <div className="relative w-full aspect-[4/5] overflow-hidden bg-muted mb-3">
                             {(() => {
                               const src = pickCollectionImage(collection, ["portraitImageUrl", "squareImageUrl", "heroImageUrl"]);
                               return src ? (
                                 <Image
                                   src={src}
                                   alt={collection.name}
                                   fill
                                   sizes="260px"
                                   className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                 />
                               ) : null;
                             })()}
                           </div>
                           <h4 className="text-sm tracking-wide text-foreground group-hover/item:text-muted-foreground transition-colors">
                             {collection.name}
                           </h4>
                         </Link>
                       ))}
                     </div>
                   </div>
                 ) : null}
               </div>
            </div>
          </div>

          <div
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto bg-background text-foreground ${
               activeMenu === "feminino" ? "translate-x-0" : "translate-x-full"
             }`}
          >
            <div className="py-6">
               <div className="flex flex-col mb-8">
                 {isLoadingWomensCategories ? (
                   <div className="px-6 py-4 flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando categorias...</span>
                   </div>
                 ) : womensCategories && womensCategories.length > 0 ? (
                   womensCategories.map((cat, idx) => (
                     <Link
                       key={idx}
                       href={`/catalog?category=${cat}&targetAudience=WOMEN`}
                       onClick={closeMenu}
                       className="px-6 py-3 text-sm tracking-wide hover:bg-muted/50 transition-colors flex justify-between items-center"
                     >
                       <span>{translateCategory(cat)}</span>
                     </Link>
                   ))
                 ) : (
                   <div className="px-6 py-3 text-sm tracking-wide text-muted-foreground">
                     Nenhuma categoria encontrada.
                   </div>
                 )}
               </div>

               <div className="px-6 pb-12">
                 {isLoadingWomensGrid ? (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando coleções...</span>
                   </div>
                 ) : womensGridCollections && womensGridCollections.length > 0 ? (
                   <div className="grid grid-cols-2 gap-4">
                     {womensGridCollections.map((collection) => (
                       <Link
                         key={collection.id}
                         href={`/collections/${collection.slug}`}
                         onClick={closeMenu}
                         className="group/item cursor-pointer flex flex-col"
                       >
                         <div className="relative w-full aspect-square overflow-hidden bg-muted mb-2">
                           {(() => {
                             const src = pickCollectionImage(collection, ["portraitImageUrl", "squareImageUrl", "heroImageUrl"]);
                             return src ? (
                           <Image
                             src={src}
                             alt={collection.name}
                             fill
                             sizes="(max-width: 400px) 50vw, 168px"
                             className="object-cover object-center transition-transform duration-700 group-hover/item:scale-105"
                           />
                             ) : null;
                           })()}
                         </div>
                         <h4 className="text-xs sm:text-sm tracking-wide text-foreground group-hover/item:text-muted-foreground transition-colors text-center line-clamp-2">
                           {collection.name}
                         </h4>
                       </Link>
                     ))}
                   </div>
                 ) : null}
               </div>
            </div>
          </div>

          <div
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto bg-background text-foreground ${
               activeMenu === "masculino" ? "translate-x-0" : "translate-x-full"
             }`}
          >
            <div className="py-6">
               <div className="flex flex-col mb-8">
                 {isLoadingMensCategories ? (
                   <div className="px-6 py-4 flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando categorias...</span>
                   </div>
                 ) : mensCategories && mensCategories.length > 0 ? (
                   mensCategories.map((cat, idx) => (
                     <Link
                       key={idx}
                       href={`/catalog?category=${cat}&targetAudience=MEN`}
                       onClick={closeMenu}
                       className="px-6 py-3 text-sm tracking-wide hover:bg-muted/50 transition-colors flex justify-between items-center"
                     >
                       <span>{translateCategory(cat)}</span>
                     </Link>
                   ))
                 ) : (
                   <div className="px-6 py-3 text-sm tracking-wide text-muted-foreground">
                     Nenhuma categoria encontrada.
                   </div>
                 )}
               </div>

               <div className="px-6 pb-12">
                 {isLoadingMensGrid ? (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando coleções...</span>
                   </div>
                 ) : mensGridCollections && mensGridCollections.length > 0 ? (
                   <div className="grid grid-cols-2 gap-4">
                     {mensGridCollections.map((collection) => (
                       <Link
                         key={collection.id}
                         href={`/collections/${collection.slug}`}
                         onClick={closeMenu}
                         className="group/item cursor-pointer flex flex-col"
                       >
                         <div className="relative w-full aspect-square overflow-hidden bg-muted mb-2">
                           {(() => {
                             const src = pickCollectionImage(collection, ["portraitImageUrl", "squareImageUrl", "heroImageUrl"]);
                             return src ? (
                           <Image
                             src={src}
                             alt={collection.name}
                             fill
                             sizes="(max-width: 400px) 50vw, 168px"
                             className="object-cover object-center transition-transform duration-700 group-hover/item:scale-105"
                           />
                             ) : null;
                           })()}
                         </div>
                         <h4 className="text-xs sm:text-sm tracking-wide text-foreground group-hover/item:text-muted-foreground transition-colors text-center line-clamp-2">
                           {collection.name}
                         </h4>
                       </Link>
                     ))}
                   </div>
                 ) : null}
               </div>
            </div>
          </div>

        </div>
      </div>

      <AuthPanel isOpen={isAuthPanelOpen} onClose={closeAuthPanel} />

      <CartDrawer />
    </>
  );
}
