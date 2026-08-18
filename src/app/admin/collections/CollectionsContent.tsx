"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Eye, History, ImageOff, Loader2, Pencil, Plus, Shirt } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/context/AuthContext";
import { translateTargetAudience } from "@/lib/utils/translations";
import { positionSpec, showcaseSlots, sortCollections } from "@/lib/admin/collection-form";
import type { AdminCollectionResponse } from "@/lib/types/admin";

const THUMB = 48;

function thumbOf(collection: AdminCollectionResponse): string | null {
  return (
    collection.squareImageUrl ?? collection.portraitImageUrl ?? collection.heroImageUrl ?? null
  );
}

export function CollectionsContent() {
  const { canWrite } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminCollectionResponse[]>("/v1/admin/collections", {
        signal,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm tracking-widest uppercase text-muted-foreground">
        Falha ao carregar as coleções.
      </p>
    );
  }

  const collections = sortCollections(data);
  const slots = showcaseSlots(data);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-xs text-muted-foreground uppercase tracking-widest">Vitrine</h2>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
          Os cinco lugares que aceitam uma coleção só. Os demais destaques — novidades e a grade do
          menu — aceitam quantas houver e aparecem por ordem de exibição.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {slots.map((slot) => (
            <div key={slot.key} className="border border-muted p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {slot.label}
                {slot.targetAudience && ` · ${translateTargetAudience(slot.targetAudience)}`}
              </p>

              {slot.occupant ? (
                <>
                  <Link
                    href={`/admin/collections/${slot.occupant.id}`}
                    className="mt-2 block font-serif text-base text-foreground hover:underline"
                  >
                    {slot.occupant.name}
                  </Link>
                  {!slot.occupant.active && (
                    <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
                      Fora do ar: ocupa o lugar, mas a loja não mostra nada aqui.
                    </p>
                  )}
                  {slot.occupant.active && thumbOf(slot.occupant) === null && (
                    <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
                      Sem imagem: o bloco aparece vazio na loja.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Vazio</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest">
            Todas as coleções
            <span className="ml-2 normal-case tracking-normal">({collections.length})</span>
          </h2>

          {canWrite && (
            <Link
              href="/admin/collections/new"
              className="flex items-center gap-1.5 px-3 h-9 bg-foreground text-background text-[10px] font-semibold tracking-[0.15em] uppercase hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Nova coleção
            </Link>
          )}
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
          Coleções excluídas não aparecem aqui, nem marcadas. Para recuperar uma, comece a criar
          outra com o mesmo nome e público — o conflito devolvido traz o botão de restaurar.
        </p>

        {collections.length === 0 ? (
          <p className="mt-6 text-sm tracking-widest uppercase text-muted-foreground">
            Nenhuma coleção cadastrada.
          </p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto mt-6">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-muted">
                    <th className="py-2 pr-4 font-normal" scope="col">
                      <span className="sr-only">Imagem</span>
                    </th>
                    <th className="py-2 pr-4 font-normal" scope="col">Coleção</th>
                    <th className="py-2 pr-4 font-normal" scope="col">Público</th>
                    <th className="py-2 pr-4 font-normal" scope="col">Posição</th>
                    <th className="py-2 pr-4 font-normal" scope="col">Ordem</th>
                    <th className="py-2 pr-4 font-normal" scope="col">Situação</th>
                    <th className="py-2 font-normal" scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className="border-b border-muted/60 align-middle hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <Thumb collection={collection} />
                      </td>

                      <td className="py-3 pr-4 min-w-0">
                        <span className="block text-foreground">{collection.name}</span>
                        <span className="block text-xs text-muted-foreground font-mono truncate">
                          {collection.slug}
                        </span>
                      </td>

                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {translateTargetAudience(collection.targetAudience)}
                      </td>

                      <td className="py-3 pr-4 whitespace-nowrap">
                        {positionSpec(collection.displayPosition).label}
                      </td>

                      <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                        {collection.displayOrder ?? "—"}
                      </td>

                      <td className="py-3 pr-4 whitespace-nowrap">
                        <CollectionStatus collection={collection} />
                      </td>

                      <td className="py-3">
                        <CollectionActions collection={collection} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden flex flex-col gap-3 mt-6">
              {collections.map((collection) => (
                <li key={collection.id} className="border border-muted">
                  <div className="flex gap-3 p-3">
                    <Thumb collection={collection} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm text-foreground">{collection.name}</span>
                        <CollectionStatus collection={collection} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {translateTargetAudience(collection.targetAudience)} ·{" "}
                        {positionSpec(collection.displayPosition).label}
                        {collection.displayOrder !== null && ` · ordem ${collection.displayOrder}`}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-muted px-3 py-2">
                    <CollectionActions collection={collection} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Thumb({ collection }: { collection: AdminCollectionResponse }) {
  const url = thumbOf(collection);

  return (
    <div
      className={`relative bg-muted/40 overflow-hidden flex-shrink-0 ${
        collection.active ? "" : "opacity-40"
      }`}
      style={{ width: THUMB, height: THUMB }}
    >
      {url ? (
        <Image src={url} alt="" width={THUMB} height={THUMB} className="object-cover w-full h-full" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <ImageOff className="w-4 h-4" strokeWidth={1.5} />
        </span>
      )}
    </div>
  );
}

function CollectionStatus({ collection }: { collection: AdminCollectionResponse }) {
  return (
    <span className="flex-shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
      {collection.active ? "No ar" : "Fora do ar"}
    </span>
  );
}

const ACTION = "flex items-center gap-1 py-1 text-[10px] uppercase tracking-widest transition-colors";

function CollectionActions({ collection }: { collection: AdminCollectionResponse }) {
  const { canWrite } = useAuth();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link
        href={`/admin/collections/${collection.id}`}
        className={`${ACTION} text-foreground hover:underline`}
      >
        {canWrite ? (
          <Pencil className="w-3 h-3" strokeWidth={1.5} />
        ) : (
          <Eye className="w-3 h-3" strokeWidth={1.5} />
        )}
        {canWrite ? "Editar" : "Ver"}
      </Link>

      <Link
        href={`/admin/products?collectionId=${collection.id}`}
        className={`${ACTION} text-muted-foreground hover:text-foreground`}
      >
        <Shirt className="w-3 h-3" strokeWidth={1.5} />
        Produtos
      </Link>

      <Link
        href={`/admin/audit?entityType=COLLECTION&entityId=${collection.id}`}
        className={`${ACTION} text-muted-foreground hover:text-foreground`}
      >
        <History className="w-3 h-3" strokeWidth={1.5} />
        Histórico
      </Link>

      {collection.active && (
        <Link
          href={`/collections/${collection.slug}`}
          target="_blank"
          className={`${ACTION} text-muted-foreground hover:text-foreground`}
        >
          <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          Ver na loja
        </Link>
      )}
    </div>
  );
}
