"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatServerDateTime } from "@/lib/utils/format";
import { AUDIT_ACTION_LABELS } from "@/lib/admin/audit";
import type { AuditLogResponse } from "@/lib/types/admin";
import type { PaginatedResponse } from "@/lib/types/api";

const ROWS = 8;

export function CollectionHistory({ collectionId }: { collectionId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "audit", "collection", collectionId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AuditLogResponse>>("/v1/admin/audit", {
        params: {
          entityType: "COLLECTION",
          entityId: String(collectionId),
          size: ROWS,
          sort: "createdAt,desc",
        },
        signal,
      });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Carregando histórico…
      </p>
    );
  }

  if (isError || !data) {
    return <p className="text-xs text-red-600">Falha ao carregar o histórico desta coleção.</p>;
  }

  const entries = data.content;

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
        Nenhuma alteração registrada. O rastro guarda o que foi feito pelo painel — uma coleção
        criada antes desta tela existir não tem linha nenhuma.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 border-b border-muted/40 last:border-b-0 text-xs"
          >
            <span className="text-muted-foreground tabular-nums">
              {formatServerDateTime(entry.createdAt)}
            </span>

            <span className="text-foreground font-medium">
              {AUDIT_ACTION_LABELS[entry.action]}
            </span>

            {entry.details && <span className="text-muted-foreground">{entry.details}</span>}

            <span className="text-muted-foreground truncate">{entry.actor}</span>
          </li>
        ))}
      </ul>

      {data.page.totalElements > entries.length && (
        <p className="text-[11px] text-muted-foreground">
          Mostrando as {entries.length} mais recentes de {data.page.totalElements}. O restante está
          em{" "}
          <Link
            href={`/admin/audit?entityType=COLLECTION&entityId=${collectionId}`}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            histórico
          </Link>
          .
        </p>
      )}
    </div>
  );
}
