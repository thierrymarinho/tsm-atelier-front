"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { revalidateCollections, revalidateProducts } from "@/lib/api/revalidate";
import { useToast } from "@/lib/context/ToastContext";
import { formatAdminError, readFieldErrors, readProblem } from "@/lib/admin/errors";
import { translateTargetAudience } from "@/lib/utils/translations";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CollectionHistory } from "@/components/admin/CollectionHistory";
import { FormSection } from "@/components/admin/FormSection";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  COLLECTION_FORM_SECTIONS,
  POSITION_SPECS,
  describeCollectionConflict,
  emptyDraft,
  findOccupant,
  orderRivals,
  parseRestorableCollectionId,
  positionSpec,
  sectionState,
  toDraft,
  toPayload,
  validateDraft,
  type CollectionDraft,
  type FormSectionSpec,
  type SectionId,
} from "@/lib/admin/collection-form";
import type {
  AdminCollectionResponse,
  AdminProductSummary,
  CollectionRequest,
} from "@/lib/types/admin";
import {
  TARGET_AUDIENCES,
  type DisplayPosition,
  type PaginatedResponse,
  type TargetAudience,
} from "@/lib/types/api";

const FIELD =
  "h-9 px-3 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors";

const LABEL = "text-[10px] uppercase tracking-[0.15em] text-muted-foreground";

const SPEC = Object.fromEntries(COLLECTION_FORM_SECTIONS.map((spec) => [spec.id, spec])) as Record<
  SectionId,
  FormSectionSpec
>;

const COUNT_SAMPLE = 100;

interface CollectionFormProps {
  collectionId?: number;
}

export function CollectionForm({ collectionId }: CollectionFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isEdit = collectionId !== undefined;

  const {
    data: collection,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "collection", collectionId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminCollectionResponse>(
        `/v1/admin/collections/${collectionId}`,
        { signal },
      );
      return response.data;
    },
    enabled: isEdit,
  });

  const { data: collections } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminCollectionResponse[]>("/v1/admin/collections", {
        signal,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [draft, setDraft] = useState<CollectionDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [cascade, setCascade] = useState(false);
  const [restorableId, setRestorableId] = useState<number | undefined>(undefined);

  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(toPayload(emptyDraft())));

  const [synced, setSynced] = useState<AdminCollectionResponse | null>(null);
  if (collection && synced !== collection) {
    setSynced(collection);
    const next = toDraft(collection);
    setDraft(next);
    setBaseline(JSON.stringify(toPayload(next)));
    setErrors({});
  }

  const isDirty = JSON.stringify(toPayload(draft)) !== baseline;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const { data: productCount } = useQuery({
    queryKey: ["admin", "products", "byCollection", collectionId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<PaginatedResponse<AdminProductSummary>>(
        "/v1/admin/products",
        { params: { collectionId, size: COUNT_SAMPLE }, signal },
      );
      return {
        total: response.data.page.totalElements,
        living: response.data.content.filter((product) => product.deletedAt === null).length,
        capped: response.data.page.totalElements > response.data.content.length,
      };
    },
    enabled: isEdit && showDelete,
  });

  const patch = (fields: Partial<CollectionDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "collections"] });
    if (collectionId !== undefined) {
      void queryClient.invalidateQueries({ queryKey: ["admin", "collection", collectionId] });
    }
    void queryClient.invalidateQueries({ queryKey: ["collections"] });

    void revalidateCollections();
    void revalidateProducts();
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
  };

  const save = useMutation({
    mutationFn: async (payload: CollectionRequest) => {
      const response = isEdit
        ? await apiClient.put<AdminCollectionResponse>(
            `/v1/admin/collections/${collectionId}`,
            payload,
          )
        : await apiClient.post<AdminCollectionResponse>("/v1/admin/collections", payload);
      return response.data;
    },
    onSuccess: (saved) => {
      invalidate();
      setServerError(null);
      setRestorableId(undefined);

      if (isEdit) {
        const next = toDraft(saved);
        setDraft(next);
        setBaseline(JSON.stringify(toPayload(next)));
        toast("Coleção salva.", "success");
      } else {
        setBaseline(JSON.stringify(toPayload(draft)));
        toast("Coleção criada.", "success");
        router.replace(`/admin/collections/${saved.id}`);
      }
    },
    onError: (error) => {
      const fields = readFieldErrors(error);
      if (fields) setErrors((current) => ({ ...current, ...fields }));

      const problem = readProblem(error);
      setRestorableId(
        problem?.status === 409 ? parseRestorableCollectionId(problem.detail) : undefined,
      );

      const blocking = findOccupant(
        collections ?? [],
        draft.displayPosition,
        draft.targetAudience,
        collectionId,
      );
      const translated =
        problem?.status === 409
          ? describeCollectionConflict(problem.detail, blocking?.name)
          : null;

      setServerError(translated ?? formatAdminError(error, "Não foi possível salvar a coleção."));
    },
  });

  const restore = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<AdminCollectionResponse>(
        `/v1/admin/collections/${id}/restore`,
      );
      return response.data;
    },
    onSuccess: (restored) => {
      invalidate();
      setRestorableId(undefined);
      setServerError(null);
      toast(
        "Coleção restaurada — fora do ar, sem posição na vitrine e sem os produtos de antes.",
        "info",
      );
      router.replace(`/admin/collections/${restored.id}`);
    },
    onError: (error) => {
      const problem = readProblem(error);
      if (problem?.status === 400 && /is not deleted/i.test(problem.detail ?? "")) {
        setRestorableId(undefined);
        setServerError(
          "Esta coleção não está mais removida — alguém já a restaurou. Ela deve aparecer na listagem, fora do ar.",
        );
        return;
      }
      setServerError(formatAdminError(error, "Não foi possível restaurar a coleção."));
    },
  });

  const remove = useMutation({
    mutationFn: async (cascadeProducts: boolean) => {
      await apiClient.delete(`/v1/admin/collections/${collectionId}`, {
        params: { cascadeProducts },
      });
      return cascadeProducts;
    },
    onSuccess: (cascadeProducts) => {
      invalidate();
      setConfirmDelete(false);
      toast(
        cascadeProducts
          ? "Coleção e produtos removidos. Cada produto se restaura pela listagem, um a um."
          : "Coleção removida. Os produtos continuaram no catálogo, sem coleção.",
        "success",
      );
      router.push("/admin/collections");
    },
    onError: (error) => {
      setConfirmDelete(false);
      setServerError(formatAdminError(error, "Não foi possível remover a coleção."));
    },
  });

  const submit = () => {
    setServerError(null);
    setRestorableId(undefined);
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setServerError("Revise os campos marcados.");
      return;
    }
    save.mutate(toPayload(draft));
  };

  const cancel = () => {
    if (isDirty && !window.confirm("Descartar as alterações não salvas?")) return;
    router.push("/admin/collections");
  };

  if (isEdit && isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEdit && (isError || !collection)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Coleção não encontrada.
        </p>
        <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
          Ou o endereço está errado, ou a coleção foi excluída — uma coleção removida não aparece em
          listagem nenhuma. Para recuperá-la, tente criar outra com o mesmo nome e público: o
          conflito devolvido traz o botão de restaurar.
        </p>
        <Link
          href="/admin/collections"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const others = collections ?? [];
  const stateOf = (id: SectionId) => sectionState(id, draft, errors);
  const chosen = positionSpec(draft.displayPosition);
  const occupant = findOccupant(others, draft.displayPosition, draft.targetAudience, collectionId);
  const rivals = orderRivals(others, draft, collectionId);
  const hasImage = Boolean(
    draft.heroImageUrl.trim() || draft.portraitImageUrl.trim() || draft.squareImageUrl.trim(),
  );

  return (
    <div className="pb-28">
      <div className="flex flex-col gap-6 min-w-0">
        <FormSection spec={SPEC.identificacao} state={stateOf("identificacao")}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Nome *</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  maxLength={255}
                  className={`${FIELD} ${errors.name ? "border-red-400" : ""}`}
                />
                {errors.name ? (
                  <span className="text-xs text-red-600">{errors.name}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Único por público — o mesmo nome pode existir em Feminino e em Masculino.
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Público *</span>
                <select
                  value={draft.targetAudience}
                  onChange={(event) =>
                    patch({ targetAudience: event.target.value as TargetAudience | "" })
                  }
                  className={`${FIELD} cursor-pointer ${errors.targetAudience ? "border-red-400" : ""}`}
                >
                  <option value="">Selecione</option>
                  {TARGET_AUDIENCES.map((audience) => (
                    <option key={audience} value={audience}>
                      {translateTargetAudience(audience)}
                    </option>
                  ))}
                </select>
                {errors.targetAudience && (
                  <span className="text-xs text-red-600">{errors.targetAudience}</span>
                )}
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Descrição</span>
              <textarea
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                maxLength={5000}
                rows={4}
                className={`px-3 py-2 bg-transparent border text-sm text-foreground focus:outline-none focus:border-foreground transition-colors resize-y ${
                  errors.description ? "border-red-400" : "border-muted"
                }`}
              />
              {errors.description ? (
                <span className="text-xs text-red-600">{errors.description}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {draft.description.length}/5000 — em branco apaga a descrição.
                </span>
              )}
            </label>

            {collection && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
                <span className={LABEL}>Endereço</span>
                <span className="text-xs font-mono text-foreground">/collections/{collection.slug}</span>
                <span className="text-[10px] text-muted-foreground">
                  gerado na criação; renomear a coleção não muda o endereço
                </span>
                {collection.active && (
                  <Link
                    href={`/collections/${collection.slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    Ver na loja
                  </Link>
                )}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection spec={SPEC.imagens} state={stateOf("imagens")}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <ImageUploadField
              label="Paisagem"
              hint="A capa da home no desktop. Larga; o texto entra por cima."
              value={draft.heroImageUrl}
              onChange={(heroImageUrl) => patch({ heroImageUrl })}
              folder="collections"
              error={errors.heroImageUrl}
            />
            <ImageUploadField
              label="Retrato"
              hint="Os blocos da home, a capa no celular e os cartões do menu."
              value={draft.portraitImageUrl}
              onChange={(portraitImageUrl) => patch({ portraitImageUrl })}
              folder="collections"
              error={errors.portraitImageUrl}
            />
            <ImageUploadField
              label="Quadrada"
              hint="O cartão em destaque do menu principal."
              value={draft.squareImageUrl}
              onChange={(squareImageUrl) => patch({ squareImageUrl })}
              folder="collections"
              error={errors.squareImageUrl}
            />
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
            A loja usa o recorte que existir: faltando o preferido de cada tela, ela cai para outro.
            Uma imagem só já cobre todos os lugares — as três faltando, o bloco da vitrine aparece
            vazio.
          </p>
        </FormSection>

        <FormSection spec={SPEC.vitrine} state={stateOf("vitrine")}>
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => patch({ active: event.target.checked })}
                className="w-4 h-4 mt-0.5 accent-foreground"
              />
              <span>
                <span className="block text-sm text-foreground">No ar</span>
                <span className="block text-[11px] text-muted-foreground leading-relaxed">
                  Fora do ar, a coleção some da loja inteira — inclusive da posição que estiver
                  ocupando.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Posição na loja</span>
                <select
                  value={draft.displayPosition}
                  onChange={(event) =>
                    patch({ displayPosition: event.target.value as DisplayPosition })
                  }
                  className={`${FIELD} cursor-pointer`}
                >
                  {POSITION_SPECS.map((spec) => (
                    <option key={spec.position} value={spec.position}>
                      {spec.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  {chosen.where}
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Ordem</span>
                <input
                  type="number"
                  step={1}
                  value={draft.displayOrder}
                  onChange={(event) => patch({ displayOrder: event.target.value })}
                  placeholder="—"
                  className={`${FIELD} ${errors.displayOrder ? "border-red-400" : ""}`}
                />
                {errors.displayOrder ? (
                  <span className="text-xs text-red-600">{errors.displayOrder}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Crescente. Em branco vai para o fim.
                  </span>
                )}
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {occupant && chosen.onConflict === "demote" && (
                <Notice tone="warn">
                  <strong className="font-medium">{occupant.name}</strong> ocupa esta posição hoje
                  {chosen.exclusivity === "audience" && draft.targetAudience
                    ? ` em ${translateTargetAudience(draft.targetAudience as TargetAudience)}`
                    : ""}
                  . Ao salvar, o servidor a rebaixa para <em>Nenhuma</em> — sem avisar, e sem deixar
                  rastro na tela dela.
                </Notice>
              )}

              {occupant && chosen.onConflict === "reject" && (
                <Notice tone="error">
                  <strong className="font-medium">{occupant.name}</strong> já está em{" "}
                  {chosen.label}
                  {draft.targetAudience
                    ? ` para ${translateTargetAudience(draft.targetAudience as TargetAudience)}`
                    : ""}
                  . Esta posição não rebaixa a ocupante: salvar devolve conflito. Tire a outra
                  coleção daí primeiro.
                </Notice>
              )}

              {!draft.active && draft.displayPosition !== "NONE" && (
                <Notice tone="warn">
                  A coleção está fora do ar. Ela continua ocupando <em>{chosen.label}</em> — nenhuma
                  outra pode entrar —, mas a loja não mostra nada ali.
                </Notice>
              )}

              {draft.active && draft.displayPosition !== "NONE" && !hasImage && (
                <Notice tone="warn">
                  Sem nenhuma imagem, esta posição renderiza um bloco vazio na loja.
                </Notice>
              )}

              {draft.displayPosition === "HEADER" && draft.targetAudience === "MEN" && (
                <Notice tone="info">
                  A loja lê o destaque do menu apenas para o público Mulher. Uma coleção masculina nesta
                  posição ocupa o lugar sem aparecer em nenhuma tela.
                </Notice>
              )}

              {rivals.length > 0 && (
                <Notice tone="info">
                  {rivals.length === 1 ? (
                    <>
                      <strong className="font-medium">{rivals[0].name}</strong> já usa a ordem{" "}
                      {draft.displayOrder} nesta mesma posição.
                    </>
                  ) : (
                    <>
                      Outras {rivals.length} coleções já usam a ordem {draft.displayOrder} nesta
                      mesma posição.
                    </>
                  )}{" "}
                  A ordem não é única no servidor; empatadas, a sequência entre elas fica indefinida.
                </Notice>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl border-t border-muted pt-4">
              A vitrine muda assim que você salva. Quem já estava navegando no site pode continuar
              vendo a versão anterior por até 5 minutos — essa cópia é do navegador dele, e
              recarregar a página resolve.
            </p>
          </div>
        </FormSection>

        {restorableId !== undefined && (
          <div className="border border-foreground/40 bg-muted/30 p-4">
            <p className="text-sm text-foreground leading-relaxed">
              Existe uma coleção <strong className="font-medium">removida</strong> com este nome e
              público (nº {restorableId}). Ela não aparece em listagem nenhuma, mas continua
              segurando o nome — este é o único caminho até ela.
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Restaurar traz a coleção de volta fora do ar e sem posição na vitrine. Os produtos
              dela <strong className="font-medium">não</strong> voltam: se a exclusão foi a padrão,
              eles ficaram sem coleção; se foi em cascata, cada um precisa ser restaurado pela
              listagem de produtos.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => restore.mutate(restorableId)}
                disabled={restore.isPending}
                className="flex items-center gap-2 px-4 h-9 bg-foreground text-background text-[10px] font-semibold tracking-[0.15em] uppercase hover:bg-foreground/90 disabled:opacity-40 transition-colors"
              >
                {restore.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                Restaurar a coleção {restorableId}
              </button>
              <button
                type="button"
                onClick={() => setRestorableId(undefined)}
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Prefiro outro nome
              </button>
            </div>
          </div>
        )}

        {isEdit && collectionId !== undefined && (
          <section className="border-t border-muted pt-6">
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest">Histórico</h2>
            <div className="mt-3">
              <CollectionHistory collectionId={collectionId} />
            </div>
          </section>
        )}

        {isEdit && (
          <section className="border-t border-muted pt-6">
            {!showDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                Excluir coleção
              </button>
            ) : (
              <div className="border border-muted p-4 max-w-2xl">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Excluir coleção
                </p>

                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {productCount === undefined
                    ? "Contando os produtos desta coleção…"
                    : productCount.living === 0
                      ? "Nenhum produto está nesta coleção."
                      : `${productCount.capped ? "Ao menos " : ""}${productCount.living} ${
                          productCount.living === 1 ? "produto está" : "produtos estão"
                        } nesta coleção.`}
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cascade"
                      checked={!cascade}
                      onChange={() => setCascade(false)}
                      className="w-4 h-4 mt-0.5 accent-foreground"
                    />
                    <span>
                      <span className="block text-sm text-foreground">Manter os produtos</span>
                      <span className="block text-[11px] text-muted-foreground leading-relaxed">
                        Eles ficam sem coleção e continuam à venda. O vínculo se perde — restaurar a
                        coleção depois não o reconstrói.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cascade"
                      checked={cascade}
                      onChange={() => setCascade(true)}
                      className="w-4 h-4 mt-0.5 accent-foreground"
                    />
                    <span>
                      <span className="block text-sm text-foreground">
                        Remover os produtos junto
                      </span>
                      <span className="block text-[11px] text-muted-foreground leading-relaxed">
                        Cada produto sai do catálogo, e cada um volta pela própria restauração — uma
                        a uma, na listagem de produtos.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 h-9 border border-red-300 text-[10px] font-semibold tracking-[0.15em] uppercase text-red-700 hover:bg-red-50 transition-colors"
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDelete(false)}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-60 z-40 border-t border-muted bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-2">
          {serverError && (
            <div className="flex items-start gap-2 text-xs text-red-600">
              <p className="flex-1 leading-relaxed">{serverError}</p>
              <button
                type="button"
                onClick={() => setServerError(null)}
                aria-label="Dispensar o erro"
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="text-[11px] text-muted-foreground">
              {isDirty ? "Alterações não salvas" : isEdit ? "Tudo salvo" : "Nova coleção"}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={cancel}
                className="flex items-center gap-1.5 px-3 h-9 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={save.isPending}
                className="flex items-center gap-2 px-5 h-9 bg-foreground text-background text-xs font-semibold tracking-[0.15em] uppercase hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEdit ? "Salvar" : "Criar coleção"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir coleção"
        description={describeDeletion(draft.name, cascade, productCount)}
        warning={
          cascade
            ? "Restaurar a coleção depois NÃO traz os produtos de volta: cada um precisa da própria restauração, na listagem de produtos."
            : undefined
        }
        confirmLabel={cascade ? "Excluir tudo" : "Excluir coleção"}
        isPending={remove.isPending}
        onConfirm={() => remove.mutate(cascade)}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function describeDeletion(
  name: string,
  cascade: boolean,
  count: { living: number; capped: boolean } | undefined,
): string {
  const label = name.trim() || "Esta coleção";
  const quantity =
    count === undefined
      ? "os produtos"
      : `${count.capped ? "ao menos " : ""}${count.living} ${count.living === 1 ? "produto" : "produtos"}`;

  if (cascade) {
    return `"${label}" sai do ar, e ${quantity} ${
      count?.living === 1 ? "é removido" : "são removidos"
    } do catálogo junto.\n\nA remoção é lógica nos dois casos: os produtos continuam na listagem do painel, marcados como removidos.`;
  }

  return `"${label}" é removida e ${quantity} ${
    count?.living === 1 ? "fica" : "ficam"
  } sem coleção — continuam no catálogo e à venda.\n\nA coleção some de toda listagem do painel; ela só reaparece quando alguém tenta criar outra com este mesmo nome e público.`;
}

function Notice({ tone, children }: { tone: "info" | "warn" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "border-muted text-muted-foreground",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-300 bg-red-50 text-red-800",
  } as const;

  return (
    <div className={`flex gap-2.5 border p-3 ${styles[tone]}`}>
      {tone !== "info" && (
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
      )}
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}
