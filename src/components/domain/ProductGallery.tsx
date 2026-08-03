"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductColor } from "@/lib/types/api";

interface ProductGalleryProps {
  color: ProductColor;
}

export function ProductGallery({ color }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenActiveIndex, setFullscreenActiveIndex] = useState(0);
  
  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(0);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const fullscreenCarouselRef = useRef<HTMLDivElement>(null);

  // Compile all images: Cover + Hover (if exists) + Gallery
  const images = [
    color.coverImageUrl,
    ...(color.hoverImageUrl ? [color.hoverImageUrl] : []),
    ...(color.galleryImages || [])
  ];

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Determine if vertical (desktop) or horizontal (mobile)
      const isVertical = window.innerWidth >= 768; // md breakpoint
      
      let newIndex = activeIndex;
      if (isVertical) {
        const scrollPosition = container.scrollTop;
        const slideHeight = container.clientHeight;
        newIndex = Math.round(scrollPosition / slideHeight);
      } else {
        const scrollPosition = container.scrollLeft;
        const slideWidth = container.clientWidth;
        newIndex = Math.round(scrollPosition / slideWidth);
      }
      
      setActiveIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [images.length]);

  // Effect to handle scroll sync and scroll listener for fullscreen modal
  useEffect(() => {
    const container = fullscreenCarouselRef.current;
    if (!container || !isFullscreen) return;

    // Instant scroll to the clicked image
    const slideWidth = container.clientWidth;
    container.scrollLeft = slideWidth * fullscreenActiveIndex;

    const handleScroll = () => {
      const scrollPosition = container.scrollLeft;
      const currentSlideWidth = container.clientWidth;
      const newIndex = Math.round(scrollPosition / currentSlideWidth);
      setFullscreenActiveIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]); // only run when isFullscreen changes to mount the event listener and scroll once

  const openFullscreen = (index: number) => {
    setFullscreenActiveIndex(index);
    setZoomLevel(0);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setZoomLevel(0);
  };

  const navigateFullscreen = (direction: 'next' | 'prev') => {
    setZoomLevel(0);
    let newIndex;
    if (direction === 'next') {
      newIndex = fullscreenActiveIndex === images.length - 1 ? 0 : fullscreenActiveIndex + 1;
    } else {
      newIndex = fullscreenActiveIndex === 0 ? images.length - 1 : fullscreenActiveIndex - 1;
    }
    setFullscreenActiveIndex(newIndex);
    
    // Scroll the container to the new index
    if (fullscreenCarouselRef.current) {
      const container = fullscreenCarouselRef.current;
      container.scrollTo({
        left: container.clientWidth * newIndex,
        behavior: 'smooth'
      });
    }
  };

  const handleZoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel === 2) {
      setZoomLevel(0);
      setTransformOrigin("center center");
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTransformOrigin(`${x}% ${y}%`);
    setZoomLevel(zoomLevel + 1);
  };

  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setTransformOrigin(`${x}% ${y}%`);
    }
  };

  const progressPercentage = ((activeIndex + 1) / images.length) * 100;

  return (
    <div className="relative w-full bg-muted/30">
      {/* Mobile & Desktop Image Gallery */}
      <div 
        ref={carouselRef}
        className="flex flex-row overflow-x-auto snap-x snap-mandatory md:flex-col md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((imgUrl, idx) => (
          <div 
            key={idx}
            className="w-full flex-shrink-0 snap-center relative aspect-[3/4] cursor-zoom-in"
            onClick={() => openFullscreen(idx)}
          >
            <Image
              src={imgUrl}
              alt={`Imagem ${idx + 1}`}
              fill
              className="object-cover object-center"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Progress Indicator (Mobile only) */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 md:hidden">
        <div className="w-16 h-[2px] bg-muted/50 overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Index indicator */}
      <div className="absolute bottom-4 right-4 text-xs tracking-widest text-muted-foreground bg-background/70 px-2 py-1 backdrop-blur-md">
        {activeIndex + 1} / {images.length}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 absolute top-0 w-full z-10">
            <span className="text-black text-xs tracking-widest font-medium">
              {fullscreenActiveIndex + 1} / {images.length}
            </span>
            <button 
              onClick={closeFullscreen}
              className="p-2 bg-black/5 hover:bg-black/10 backdrop-blur-md rounded-full text-black transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>
          
          <div 
            ref={fullscreenCarouselRef}
            className="flex-1 flex overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((imgUrl, idx) => (
              <div 
                key={idx}
                className={`w-full h-full flex-shrink-0 snap-center relative flex items-center justify-center bg-muted/20 overflow-hidden ${
                  zoomLevel === 2 ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={handleZoomClick}
                onMouseMove={handleZoomMove}
              >
                <div 
                  className="relative w-full h-full"
                  style={{
                    transform: zoomLevel === 0 ? "scale(1)" : zoomLevel === 1 ? "scale(1.5)" : "scale(2.5)",
                    transformOrigin: transformOrigin,
                    transition: zoomLevel === 0 ? "transform 0.3s ease-out" : "transform 0.1s ease-out",
                  }}
                >
                  <Image
                    src={imgUrl}
                    alt={`Imagem Fullscreen ${idx + 1}`}
                    fill
                    className="object-contain"
                    unoptimized
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={(e) => { e.stopPropagation(); navigateFullscreen('prev'); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/5 hover:bg-black/10 backdrop-blur-md rounded-full text-black transition-colors"
          >
            <ChevronLeft className="w-8 h-8" strokeWidth={1.5} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); navigateFullscreen('next'); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/5 hover:bg-black/10 backdrop-blur-md rounded-full text-black transition-colors"
          >
            <ChevronRight className="w-8 h-8" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
