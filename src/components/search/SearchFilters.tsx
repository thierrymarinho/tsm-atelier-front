"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { CATALOG_STALE_TIME_MS } from "@/lib/query";
import {
  CATEGORIES,
  TARGET_AUDIENCES,
  type Category,
  type CollectionResponseDTO,
  type TargetAudience,
} from "@/lib/types/api";
import { translateCategory, translateTargetAudience } from "@/lib/utils/translations";
import { isCategoryValidFor, type SearchFilters as Filters } from "@/lib/search/filters";

interface SearchFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClearAll: () => void;
}

const GROUP_LABEL = "text-xs text-muted-foreground uppercase tracking-widest mb-3";

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-5 border-b border-muted last:border-b-0">
      <h3 className={GROUP_LABEL}>{title}</h3>
      {children}
    </div>
  );
}

export function SearchFilters({ filters, onChange, onClearAll }: SearchFiltersProps) {
  const { targetAudience, category, minPrice, maxPrice, onSale, collectionId } = filters;

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

  const { data: collections } = useQuery({
    queryKey: ["collections", "all"],
    staleTime: CATALOG_STALE_TIME_MS,
    queryFn: async () => {
      const response = await apiClient.get<CollectionResponseDTO[]>("/v1/catalog/collections");
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const categoryOptions = (categories?.length ? categories : [...CATEGORIES]) as Category[];

  const [minDraft, setMinDraft] = useState(minPrice?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(maxPrice?.toString() ?? "");

  const [syncedRange, setSyncedRange] = useState({ minPrice, maxPrice });
  if (syncedRange.minPrice !== minPrice || syncedRange.maxPrice !== maxPrice) {
    setSyncedRange({ minPrice, maxPrice });
    setMinDraft(minPrice?.toString() ?? "");
    setMaxDraft(maxPrice?.toString() ?? "");
  }

  const commitPrice = (which: "minPrice" | "maxPrice", raw: string) => {
    const trimmed = raw.trim();
    let next: number | undefined;

    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) return;
      next = parsed;
    }

    onChange(which === "minPrice" ? { minPrice: next } : { maxPrice: next });
  };

  const selectAudience = (next: TargetAudience | undefined) => {
    const keepCategory = category && (!next || isCategoryValidFor(category, next));
    onChange({ targetAudience: next, category: keepCategory ? category : undefined });
  };

  return (
    <div className="flex flex-col">
      <FilterGroup title="Gênero">
        <div className="flex flex-col gap-2">
          {TARGET_AUDIENCES.map((audience) => {
            const isActive = targetAudience === audience;
            return (
              <button
                key={audience}
                type="button"
                aria-pressed={isActive}
                onClick={() => selectAudience(isActive ? undefined : audience)}
                className={`text-left text-sm transition-colors ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {translateTargetAudience(audience)}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Categoria">
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto overscroll-contain pr-2 scrollbar-slim">
          {categoryOptions.map((option) => {
            const isActive = category === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange({ category: isActive ? undefined : option })}
                className={`text-left text-sm transition-colors ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {translateCategory(option)}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Preço final">
        <div className="flex items-center gap-3">
          {(
            [
              { key: "minPrice", label: "De", value: minDraft, setValue: setMinDraft },
              { key: "maxPrice", label: "Até", value: maxDraft, setValue: setMaxDraft },
            ] as const
          ).map(({ key, label, value, setValue }) => (
            <label key={key} className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1 border-b border-muted focus-within:border-foreground transition-colors">
                <span className="text-sm text-muted-foreground">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onBlur={() => commitPrice(key, value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitPrice(key, value);
                    }
                  }}
                  placeholder="—"
                  className="w-full bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </div>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          Considera o preço com desconto, quando houver.
        </p>
      </FilterGroup>

      <FilterGroup title="Promoções">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={Boolean(onSale)}
            onChange={(event) => onChange({ onSale: event.target.checked ? true : undefined })}
            className="accent-foreground w-4 h-4 cursor-pointer"
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Somente promoções
          </span>
        </label>
      </FilterGroup>

      {collections && collections.length > 0 && (
        <FilterGroup title="Coleção">
          <select
            value={collectionId ?? ""}
            onChange={(event) =>
              onChange({ collectionId: event.target.value ? Number(event.target.value) : undefined })
            }
            aria-label="Coleção"
            className="w-full bg-transparent border-b border-muted py-2 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors cursor-pointer"
          >
            <option value="">Todas</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </FilterGroup>
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="mt-6 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        Limpar filtros
      </button>
    </div>
  );
}
