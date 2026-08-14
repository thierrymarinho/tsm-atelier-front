"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatServerDateTime } from "@/lib/utils/format";
import {
  AUDITED_ENTITY_LABELS,
  AUDIT_ACTION_LABELS,
  AUDIT_SORT_OPTIONS,
  activeAuditFilterCount,
  describeAuditChange,
  describeAuditReason,
  parseAuditFilters,
  toAuditApiParams,
  toAuditUrlParams,
  type AuditFilters,
} from "@/lib/admin/audit";
import {
  AUDITED_ENTITIES,
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditLogResponse,
  type AuditedEntity,
} from "@/lib/types/admin";
import type { PaginatedResponse } from "@/lib/types/api";

const TYPING_DEBOUNCE_MS = 350;

const FIELD =
  "h-9 px-3 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors";

const LABEL = "text-[10px] uppercase tracking-[0.15em] text-muted-foreground";

export function AuditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAuditFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const write = (next: AuditFilters) => {
    const query = toAuditUrlParams(next).toString();
    router.replace(query ? `/admin/audit?${query}` : "/admin/audit", { scroll: false });
  };

  const applyPatch = (patch: Partial<AuditFilters>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ ...filters, ...patch, page: 0 });
  };

  const goToPage = (page: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    write({ ...filters, page });
  };

  const [actorDraft, setActorDraft] = useState(filters.actor ?? "");
  const [entityIdDraft, setEntityIdDraft] = useState(filters.entityId ?? "");
  const [syncedText, setSyncedText] = useState(`${filters.actor ?? ""}|${filters.entityId ?? ""}`);
  const currentText = `${filters.actor ?? ""}|${filters.entityId ?? ""}`;
  if (syncedText !== currentText) {
    setSyncedText(currentText);
    setActorDraft(filters.actor ?? "");
    setEntityIdDraft(filters.entityId ?? "");
  }

  const debounceText = (patch: Partial<AuditFilters>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => write({ ...filters, ...patch, page: 0 }), TYPING_DEBOUNCE_MS);
  };

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["admin", "audit", "list", filters],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AuditLogResponse>>("/v1/admin/audit", {
        params: toAuditApiParams(filters),
        signal,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const entries = data?.content ?? [];
  const totalPages = data?.page.totalPages ?? 0;
  const totalElements = data?.page.totalElements ?? 0;
  const currentPage = data?.page.number ?? 0;
  const activeCount = activeAuditFilterCount(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Tipo</span>
            <select
              value={filters.entityType ?? ""}
              onChange={(event) =>
                applyPatch({ entityType: (event.target.value || undefined) as AuditedEntity | undefined })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todos</option>
              {AUDITED_ENTITIES.map((entity) => (
                <option key={entity} value={entity}>
                  {AUDITED_ENTITY_LABELS[entity]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Ação</span>
            <select
              value={filters.action ?? ""}
              onChange={(event) =>
                applyPatch({ action: (event.target.value || undefined) as AuditAction | undefined })
              }
              className={`${FIELD} cursor-pointer`}
            >
              <option value="">Todas</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Autor</span>
            <input
              type="search"
              value={actorDraft}
              onChange={(event) => {
                setActorDraft(event.target.value);
                debounceText({ actor: event.target.value.trim() || undefined });
              }}
              placeholder="trecho do e-mail"
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>Id do registro (exato)</span>
            <input
              type="search"
              value={entityIdDraft}
              onChange={(event) => {
                setEntityIdDraft(event.target.value);
                debounceText({ entityId: event.target.value.trim() || undefined });
              }}
              placeholder="ex.: 42"
              className={FIELD}
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>De</span>
            <input
              type="date"
              value={filters.createdFrom ?? ""}
              max={filters.createdTo}
              onChange={(event) => applyPatch({ createdFrom: event.target.value || undefined })}
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Até</span>
            <input
              type="date"
              value={filters.createdTo ?? ""}
              min={filters.createdFrom}
              onChange={(event) => applyPatch({ createdTo: event.target.value || undefined })}
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:ml-auto">
            <span className={LABEL}>Ordenar por</span>
            <select
              value={filters.sort}
              onChange={(event) => applyPatch({ sort: event.target.value })}
              className={`${FIELD} cursor-pointer`}
            >
              {AUDIT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => write({ sort: filters.sort, page: 0 })}
            className="self-start text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar {activeCount} {activeCount === 1 ? "filtro" : "filtros"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Falha ao carregar o histórico.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {activeCount > 0
            ? "Nenhuma alteração registrada com esses filtros."
            : "Nenhuma alteração registrada ainda."}
        </p>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
          <p className="text-xs text-muted-foreground">
            {totalElements} {totalElements === 1 ? "alteração" : "alterações"}.
          </p>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-muted">
                  <th className="py-2 pr-4 font-normal">Quando</th>
                  <th className="py-2 pr-4 font-normal">Autor</th>
                  <th className="py-2 pr-4 font-normal">Registro</th>
                  <th className="py-2 pr-4 font-normal">Ação</th>
                  <th className="py-2 pr-4 font-normal">Mudança</th>
                  <th className="py-2 font-normal">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const change = describeAuditChange(entry);
                  const reason = describeAuditReason(entry);
                  return (
                    <tr key={entry.id} className="border-b border-muted/60 align-top">
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatServerDateTime(entry.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{entry.actor}</td>
                      <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                        {AUDITED_ENTITY_LABELS[entry.entityType]}{" "}
                        <span className="text-muted-foreground font-mono text-xs">
                          #{entry.entityId}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-foreground whitespace-nowrap">
                        {AUDIT_ACTION_LABELS[entry.action]}
                        {reason && (
                          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                            {reason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-foreground">{change ?? ""}</td>
                      <td className="py-3 text-muted-foreground">{entry.details ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden flex flex-col gap-3">
            {entries.map((entry) => {
              const change = describeAuditChange(entry);
              const reason = describeAuditReason(entry);
              return (
                <li key={entry.id} className="border border-muted p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-foreground">
                      {AUDIT_ACTION_LABELS[entry.action]}
                      {reason && (
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                          {reason}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-foreground whitespace-nowrap">
                      {AUDITED_ENTITY_LABELS[entry.entityType]}{" "}
                      <span className="text-muted-foreground font-mono">#{entry.entityId}</span>
                    </span>
                  </div>

                  {change && <p className="mt-2 text-sm text-foreground">{change}</p>}
                  {entry.details && (
                    <p className="mt-1 text-xs text-muted-foreground break-words">{entry.details}</p>
                  )}

                  <div className="mt-3 flex items-baseline justify-between gap-3 text-[11px] text-muted-foreground">
                    <span className="truncate">{entry.actor}</span>
                    <span className="whitespace-nowrap tabular-nums">
                      {formatServerDateTime(entry.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl border-t border-muted pt-4">
        Só ações feitas pelo painel entram aqui. Pagamentos confirmados pelo Stripe, compras de
        clientes e o detalhe do que mudou numa edição ficam de fora — a linha diz que houve edição,
        não quais campos.
      </p>
    </div>
  );
}
