"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Phone,
  Globe,
  Loader2,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { CollectionResponseDTO, pickCollectionImage } from "@/lib/types/api";
import { CATALOG_STALE_TIME_MS } from "@/lib/query";
import { translateCategory } from "@/lib/utils/translations";
import { CartActionBtn, SearchActionBtn, UserActionBtn } from "./HeaderActions";

type MenuState = "main" | "novidades" | "feminino" | "masculino";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUserClick: () => void;
  onCartClick: () => void;
  avatarInitials: string | null;
  cartCount: number;
  isAdmin: boolean;
}

export function MenuDrawer({
  isOpen,
  onClose,
  onUserClick,
  onCartClick,
  avatarInitials,
  cartCount,
  isAdmin,
}: MenuDrawerProps) {
  const [activeMenu, setActiveMenu] = useState<MenuState>("main");
  const [entered, setEntered] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (isOpen) return;
    const id = setTimeout(() => setActiveMenu("main"), 300);
    return () => clearTimeout(id);
  }, [isOpen]);

  const isVisible = isOpen && entered;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 250;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const { data: headerCollection, isLoading: isLoadingHeaderCollection } = useQuery({
    queryKey: ['collections', 'header'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'HEADER', targetAudience: 'WOMEN' }
      });
      return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
    },
    staleTime: CATALOG_STALE_TIME_MS,
    enabled: isOpen,
  });

  const { data: womensCollections, isLoading: isLoadingWomensCollections } = useQuery({
    queryKey: ['collections', 'women'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { targetAudience: 'WOMEN' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
    },
    staleTime: CATALOG_STALE_TIME_MS,
    enabled: activeMenu === "novidades",
  });

  const { data: newArrivalsCollections, isLoading: isLoadingNewArrivals } = useQuery({
    queryKey: ['collections', 'new-arrivals'],
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>('/v1/catalog/collections', {
        params: { position: 'NEW_ARRIVALS' }
      });
      return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
    },
    staleTime: CATALOG_STALE_TIME_MS,
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
    staleTime: CATALOG_STALE_TIME_MS,
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
    staleTime: CATALOG_STALE_TIME_MS,
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
    staleTime: CATALOG_STALE_TIME_MS,
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
    staleTime: CATALOG_STALE_TIME_MS,
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
    staleTime: CATALOG_STALE_TIME_MS,
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
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 h-full w-full max-w-[400px] bg-background text-foreground z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-x-hidden ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted min-h-[72px]">
          {activeMenu === "main" ? (
            <>
              <div className="flex items-center gap-6">
                <button
                  onClick={onClose}
                  className="p-1 hover:opacity-70 transition-opacity"
                >
                  <X className="w-6 h-6" strokeWidth={1.5} />
                </button>
                <SearchActionBtn className="w-6 h-6" onNavigate={onClose} />
              </div>

              <div className="flex items-center gap-6">
                <UserActionBtn
                  className="w-6 h-6"
                  onClick={onUserClick}
                  initials={avatarInitials}
                />
                <CartActionBtn
                  className="w-6 h-6"
                  onClick={onCartClick}
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
                  onClick={onClose}
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
                onClick={onClose}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors w-full"
              >
                <span className="text-sm tracking-wide text-red-600 font-medium">Sale</span>
              </Link>
            </nav>

            <div className="mt-auto flex flex-col py-8 border-t border-muted">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex items-center gap-4 px-6 py-3 pb-5 mb-3 border-b border-muted hover:bg-muted/50 transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm tracking-wide font-medium">Painel administrativo</span>
                </Link>
              )}
              <Link href="/cart" onClick={onClose} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm tracking-wide">Carrinho</span>
              </Link>
              <Link href="/contact" onClick={onClose} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
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
                   onClick={onClose}
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
                       onClick={onClose}
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
                   onClick={onClose}
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
                       onClick={onClose}
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
                 {isLoadingNewArrivals ? (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm">Carregando novidades...</span>
                   </div>
                 ) : newArrivalsCollections && newArrivalsCollections.length > 0 ? (
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
                       {newArrivalsCollections.map((collection) => (
                         <Link
                           key={collection.id}
                           href={`/collections/${collection.slug}`}
                           onClick={onClose}
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
                       onClick={onClose}
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
                         onClick={onClose}
                         className="group/item cursor-pointer flex flex-col"
                       >
                         <div className="relative w-full aspect-square overflow-hidden bg-muted mb-2">
                           {(() => {
                             const src = pickCollectionImage(collection, ["squareImageUrl", "portraitImageUrl", "heroImageUrl"]);
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
                       onClick={onClose}
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
                         onClick={onClose}
                         className="group/item cursor-pointer flex flex-col"
                       >
                         <div className="relative w-full aspect-square overflow-hidden bg-muted mb-2">
                           {(() => {
                             const src = pickCollectionImage(collection, ["squareImageUrl", "portraitImageUrl", "heroImageUrl"]);
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
    </>
  );
}
