"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { CATALOG_STALE_TIME_MS } from "@/lib/query";
import { CATEGORIES, type Category, type TargetAudience } from "@/lib/types/api";
import { translateCategory } from "@/lib/utils/translations";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

interface Suggestion {
  category: Category;
  label: string;
}

interface SearchAutocompleteProps {
  value: string;
  targetAudience?: TargetAudience;
  onSubmitTerm: (term: string) => void;
  onSelectCategory: (category: Category) => void;
}

export function SearchAutocomplete({
  value,
  targetAudience,
  onSubmitTerm,
  onSelectCategory,
}: SearchAutocompleteProps) {
  const [draft, setDraft] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setDraft(value);
    setHighlight(0);
  }

  const { data: categories } = useQuery({
    queryKey: ["categories", targetAudience ?? "all"],
    staleTime: CATALOG_STALE_TIME_MS,
    queryFn: async () => {
      const response = await apiClient.get<string[]>("/v1/catalog/products/categories", {
        params: { targetAudience },
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const suggestions = useMemo<Suggestion[]>(() => {
    const source = categories?.length ? categories : [...CATEGORIES];
    const all = source.map((category) => ({
      category: category as Category,
      label: translateCategory(category),
    }));

    const term = fold(draft);
    if (!term) return all;

    return all.filter((item) => fold(item.label).includes(term));
  }, [categories, draft]);

  const trimmedDraft = draft.trim();
  const showTermRow = trimmedDraft.length > 0;
  const termRowIndex = showTermRow ? suggestions.length : -1;
  const optionCount = suggestions.length + (showTermRow ? 1 : 0);

  const activeIndex = highlight < optionCount ? highlight : 0;

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isOpen]);

  const commitTerm = (term: string) => {
    setIsOpen(false);
    onSubmitTerm(term.trim());
  };

  const commitCategory = (category: Category) => {
    setIsOpen(false);
    setDraft("");
    onSelectCategory(category);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (isOpen && activeIndex < suggestions.length) {
        commitCategory(suggestions[activeIndex].category);
      } else if (trimmedDraft) {
        commitTerm(trimmedDraft);
      }
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    if (!isOpen) {
      setIsOpen(true);
      return;
    }
    if (optionCount === 0) return;

    const next = event.key === "ArrowDown" ? activeIndex + 1 : activeIndex - 1;
    setHighlight((next + optionCount) % optionCount);
  };

  const activeOptionId =
    isOpen && optionCount > 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-3 border-b border-muted focus-within:border-foreground transition-colors">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-label="Buscar produtos ou categorias"
          autoComplete="off"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setHighlight(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar produtos ou categorias"
          className="w-full bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {draft && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              setDraft("");
              commitTerm("");
              inputRef.current?.focus();
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {isOpen && optionCount > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Sugestões"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto bg-background border border-muted shadow-lg py-2"
        >
          {suggestions.length > 0 && (
            <li
              aria-hidden="true"
              className="px-4 py-1.5 text-[10px] tracking-widest uppercase text-muted-foreground"
            >
              Categorias
            </li>
          )}

          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.category}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => {
                event.preventDefault();
                commitCategory(suggestion.category);
              }}
              onMouseEnter={() => setHighlight(index)}
              className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                activeIndex === index ? "bg-muted/40 text-foreground" : "text-muted-foreground"
              }`}
            >
              {suggestion.label}
            </li>
          ))}

          {showTermRow && (
            <li
              id={`${listboxId}-option-${termRowIndex}`}
              role="option"
              aria-selected={activeIndex === termRowIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                commitTerm(trimmedDraft);
              }}
              onMouseEnter={() => setHighlight(termRowIndex)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2 ${
                suggestions.length > 0 ? "border-t border-muted mt-1 pt-3" : ""
              } ${activeIndex === termRowIndex ? "bg-muted/40 text-foreground" : "text-muted-foreground"}`}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
              <span className="truncate">
                Buscar por <span className="text-foreground">&ldquo;{trimmedDraft}&rdquo;</span>
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
