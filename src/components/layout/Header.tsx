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
  Loader2
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { CollectionResponseDTO } from "@/lib/types/api";
import { useAuth } from "@/lib/context/AuthContext";
import { useCart } from "@/lib/context/CartContext";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { translateCategory } from "@/lib/utils/translations";

type MenuState = "main" | "novidades" | "feminino" | "masculino";



export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuState>("main");
  const carouselRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isProductPage = pathname?.startsWith("/product/");
  const isCollectionPage = pathname?.startsWith("/collections/");
  const isCatalogPage = pathname?.startsWith("/catalog");
  const isAlwaysTransparentWithBlackText = isProductPage || isCollectionPage || isCatalogPage;
  
  // Logic for transparent state
  const isTransparent = isAlwaysTransparentWithBlackText 
    ? !isHovered // On these pages: transparent unless hovered (scroll doesn't matter)
    : (!isScrolled && !isHovered); // Other pages: transparent only at top and not hovered

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
    // Optional: reset to main menu after close animation finishes
    setTimeout(() => setActiveMenu("main"), 300);
  };

  const handleUserClick = () => {
    if (isAuthenticated) {
      router.push('/account');
    } else {
      setIsAuthPanelOpen(true);
      if (isMenuOpen) closeMenu();
    }
  };

  const handleCartClick = () => {
    setIsCartOpen(true);
    if (isMenuOpen) closeMenu();
  };

  const UserActionBtn = ({ className = "w-5 h-5 sm:w-6 sm:h-6" }: { className?: string }) => (
    <button 
      onClick={handleUserClick}
      aria-label="Profile" 
      className="p-1 hover:opacity-70 transition-opacity flex items-center justify-center"
    >
      {isAuthenticated && user ? (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] sm:text-xs font-semibold tracking-wide">
          {getInitials()}
        </div>
      ) : (
        <User className={className} strokeWidth={1.5} />
      )}
    </button>
  );

  const CartActionBtn = ({ className = "w-5 h-5 sm:w-6 sm:h-6" }: { className?: string }) => (
    <button 
      onClick={handleCartClick}
      aria-label="Cart" 
      className="p-1 hover:opacity-70 transition-opacity relative flex items-center justify-center"
    >
      <ShoppingBag className={className} strokeWidth={1.5} />
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
          {cartCount}
        </span>
      )}
    </button>
  );

  // --- MAIN MENU QUERIES ---
  const { data: headerCollection, isLoading: isLoadingHeaderCollection } = useQuery({
    queryKey: ['collections', 'header'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'HEADER', targetAudience: 'WOMEN' }
      });
      return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
    },
    enabled: activeMenu === "main" || isMenuOpen, // fetch when menu opens
  });

  // --- NOVIDADES QUERIES ---
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

  // --- FEMININO QUERIES ---
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

  // --- MASCULINO QUERIES ---
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
      {/* Main Header */}
      {/* Transparent Header styling logic */}
      <header 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 w-full z-40 transition-all duration-300 border-b ${
          isTransparent 
            ? `bg-transparent border-transparent ${isAlwaysTransparentWithBlackText ? "text-foreground" : "text-white"}` 
            : "bg-background text-foreground border-muted glass shadow-sm"
        }`}
      >
        <div className="w-full px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between max-w-7xl mx-auto">
          
          {/* Left Side: Hamburger & Search */}
          <div className="flex items-center gap-4 sm:gap-6 flex-1">
            <button 
              aria-label="Menu" 
              className="p-1 hover:opacity-70 transition-opacity"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            </button>
            
            <button 
              aria-label="Search" 
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex-shrink-0 flex justify-center">
            <Link 
              href="/" 
              className="font-serif text-lg sm:text-2xl tracking-widest uppercase hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              TSM Atelier
            </Link>
          </div>

          {/* Right Side: Profile & Cart */}
          <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-end">
            <UserActionBtn />
            <CartActionBtn />
          </div>

        </div>
      </header>

      {/* Slide-out Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
      />

      {/* Slide-out Menu Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-full max-w-[400px] bg-background text-foreground z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-x-hidden ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Menu Top Bar - Dynamic based on activeMenu */}
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
                <button className="p-1 hover:opacity-70 transition-opacity">
                  <Search className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                <UserActionBtn className="w-6 h-6" />
                <CartActionBtn className="w-6 h-6" />
              </div>
            </>
          ) : (
            // Sub-Menu Header State
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

        {/* Menu Content Container (Slides left/right) */}
        <div className="relative flex-1 overflow-hidden">
          
          {/* Main Navigation Level */}
          <div 
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto ${
               activeMenu === "main" ? "translate-x-0" : "-translate-x-full"
             }`}
          >
            {/* Header Collection (Position: HEADER) */}
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
                    <Image 
                      src={headerCollection.squareImageUrl || headerCollection.portraitImageUrl || headerCollection.heroImageUrl} 
                      alt="Featured Collection" 
                      fill 
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      unoptimized
                    />
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
              <Link href="/sale" onClick={closeMenu} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                <span className="text-sm tracking-wide text-red-600 font-medium">Sale</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </Link>
            </nav>

            {/* Bottom Navigation Links */}
            <div className="mt-auto flex flex-col py-8 border-t border-muted">
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

          {/* Novidades Sub-Menu Level */}
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
                 {/* Dynamic Collections from API */}
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

               {/* PARA ELE Section */}
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
                 
                 {/* Dynamic Collections from API */}
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

               {/* Featured Collections Carousel */}
               <div className="mt-8 px-6 pb-12 relative">
                 {isLoadingFeatured ? (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando destaques...</span>
                   </div>
                 ) : featuredCollections && featuredCollections.length > 0 ? (
                   <div className="relative group">
                     {/* Scroll Buttons */}
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

                     {/* Carousel Container */}
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
                             <Image 
                               src={collection.portraitImageUrl || collection.squareImageUrl || collection.heroImageUrl} 
                               alt={collection.name} 
                               fill 
                               className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                               unoptimized
                             />
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

          {/* Feminino Sub-Menu Level */}
          <div 
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto bg-background text-foreground ${
               activeMenu === "feminino" ? "translate-x-0" : "translate-x-full"
             }`}
          >
            <div className="py-6">
               <div className="flex flex-col mb-8">
                 {/* Categories List */}
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

               {/* 2x2 Collections Grid */}
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
                           <Image 
                             src={collection.portraitImageUrl || collection.squareImageUrl || collection.heroImageUrl || "/placeholder.jpg"} 
                             alt={collection.name}
                             fill
                             className="object-cover object-center transition-transform duration-700 group-hover/item:scale-105"
                             unoptimized
                           />
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

          {/* Masculino Sub-Menu Level */}
          <div 
             className={`absolute inset-0 flex flex-col transition-transform duration-300 overflow-y-auto bg-background text-foreground ${
               activeMenu === "masculino" ? "translate-x-0" : "translate-x-full"
             }`}
          >
            <div className="py-6">
               <div className="flex flex-col mb-8">
                 {/* Categories List */}
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

               {/* 2x2 Collections Grid */}
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
                           <Image 
                             src={collection.portraitImageUrl || collection.squareImageUrl || collection.heroImageUrl || "/placeholder.jpg"} 
                             alt={collection.name}
                             fill
                             className="object-cover object-center transition-transform duration-700 group-hover/item:scale-105"
                             unoptimized
                           />
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

      {/* Auth Panel (Slides from Right) */}
      <AuthPanel 
        isOpen={isAuthPanelOpen} 
        onClose={() => setIsAuthPanelOpen(false)} 
      />

      {/* Cart Drawer */}
      <CartDrawer />
    </>
  );
}
