"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { revalidateProducts } from "@/lib/api/revalidate";
import { useToast } from "@/lib/context/ToastContext";
import { formatAdminError, readFieldErrors } from "@/lib/admin/errors";
import { translateCategory, translateTargetAudience } from "@/lib/utils/translations";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FormSection } from "@/components/admin/FormSection";
import { ProductColorCard } from "@/components/admin/ProductColorCard";
import {
  PRODUCT_FORM_SECTIONS,
  sectionState,
  type FormSectionSpec,
  type SectionId,
  diffRemovals,
  emptyColor,
  emptyDraft,
  nextUid,
  removedUnits,
  toDraft,
  toPayload,
  validateDraft,
  type ColorDraft,
  type CompositionDraft,
  type ProductDraft,
  type Removals,
} from "@/lib/admin/product-form";
import type {
  AdminCollectionResponse,
  AdminProductResponse,
  ProductRequest,
} from "@/lib/types/admin";
import {
  CATEGORIES,
  TARGET_AUDIENCES,
  type CareAxisOptions,
  type CareInstruction,
  type Category,
  type Material,
  type MaterialOption,
  type TargetAudience,
} from "@/lib/types/api";

const FIELD =
  "h-9 px-3 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors";

const LABEL = "text-[10px] uppercase tracking-[0.15em] text-muted-foreground";

const SECTION_TITLE = "text-xs text-muted-foreground uppercase tracking-widest";

const SPEC = Object.fromEntries(PRODUCT_FORM_SECTIONS.map((spec) => [spec.id, spec])) as Record<
  SectionId,
  FormSectionSpec
>;

interface ProductFormProps {
  productId?: number;
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isEdit = productId !== undefined;

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AdminProductResponse>(
        `/v1/admin/products/${productId}`,
        { signal },
      );
      return response.data;
    },
    enabled: isEdit,
  });

  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [openColors, setOpenColors] = useState<Set<string>>(new Set());
  const [pendingRemovals, setPendingRemovals] = useState<Removals | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(toPayload(emptyDraft())));

  const [syncedProduct, setSyncedProduct] = useState<AdminProductResponse | null>(null);
  if (product && syncedProduct !== product) {
    setSyncedProduct(product);
    const next = toDraft(product);
    setDraft(next);
    setBaseline(JSON.stringify(toPayload(next)));
    setOpenColors(new Set(next.colors.length === 1 ? [next.colors[0].uid] : []));
    setErrors({});
  }

  const isDirty = JSON.stringify(toPayload(draft)) !== baseline;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const { data: categories } = useQuery({
    queryKey: ["catalog", "categories", draft.targetAudience],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<Category[]>("/v1/catalog/products/categories", {
        params: { targetAudience: draft.targetAudience || undefined },
        signal,
      });
      return response.data;
    },
    enabled: draft.targetAudience !== "",
    staleTime: 10 * 60 * 1000,
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

  const categoryOptions = draft.targetAudience ? (categories ?? []) : CATEGORIES;

  const patch = (fields: Partial<ProductDraft>) => setDraft((current) => ({ ...current, ...fields }));

  const patchColor = (index: number, next: ColorDraft) =>
    setDraft((current) => ({
      ...current,
      colors: current.colors.map((color, i) => (i === index ? next : color)),
    }));

  const invalidate = (savedId: number) => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "product", savedId] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void revalidateProducts();
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
  };

  const save = useMutation({
    mutationFn: async (payload: ProductRequest) => {
      const response = isEdit
        ? await apiClient.put<AdminProductResponse>(`/v1/admin/products/${productId}`, payload)
        : await apiClient.post<AdminProductResponse>("/v1/admin/products", payload);
      return response.data;
    },
    onSuccess: (saved) => {
      invalidate(saved.id);
      setPendingRemovals(null);
      setServerError(null);

      if (isEdit) {
        const next = toDraft(saved);
        setDraft(next);
        setBaseline(JSON.stringify(toPayload(next)));
        toast("Produto salvo.", "success");
      } else {
        setBaseline(JSON.stringify(toPayload(draft)));
        toast("Produto criado.", "success");
        router.replace(`/admin/products/${saved.id}`);
      }
    },
    onError: (error) => {
      setPendingRemovals(null);
      const fields = readFieldErrors(error);
      if (fields) setErrors((current) => ({ ...current, ...fields }));
      setServerError(formatAdminError(error, "Não foi possível salvar o produto."));
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/v1/admin/products/${productId}`);
    },
    onSuccess: () => {
      if (productId !== undefined) invalidate(productId);
      setConfirmDelete(false);
      toast("Produto removido. Dá para restaurar pela listagem.", "success");
      router.push("/admin/products");
    },
    onError: (error) => {
      setConfirmDelete(false);
      setServerError(formatAdminError(error, "Não foi possível remover o produto."));
    },
  });

  const submit = () => {
    setServerError(null);
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setOpenColors((current) => {
        const next = new Set(current);
        draft.colors.forEach((color, index) => {
          if (Object.keys(found).some((key) => key.startsWith(`colors.${index}.`))) next.add(color.uid);
        });
        return next;
      });
      setServerError("Revise os campos marcados.");
      return;
    }

    if (product) {
      const removals = diffRemovals(product, draft);
      if (removals.total > 0) {
        setPendingRemovals(removals);
        return;
      }
    }

    save.mutate(toPayload(draft));
  };

  const cancel = () => {
    if (isDirty && !window.confirm("Descartar as alterações não salvas?")) return;
    router.push("/admin/products");
  };

  if (isEdit && isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEdit && (isError || !product)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm tracking-widest uppercase text-muted-foreground">
          Produto não encontrado.
        </p>
        <Link
          href="/admin/products"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const isGone = product?.deletedAt != null;
  const liveColors = draft.colors.filter((color) => !color.removed);

  const stateOf = (id: SectionId) => sectionState(id, draft, errors);

  return (
    <div className="pb-28">
      <div className="flex flex-col gap-6 min-w-0">
        {isGone && (
          <div className="border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800 leading-relaxed">
              Este produto está removido. Restaure-o pela listagem antes de editar — salvar agora
              devolve <span className="font-mono">404</span>.
            </p>
          </div>
        )}

        <FormSection spec={SPEC.identificacao} state={stateOf("identificacao")}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Nome *</span>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                maxLength={255}
                className={`${FIELD} ${errors.name ? "border-red-400" : ""}`}
              />
              {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Descrição</span>
              <textarea
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                maxLength={5000}
                rows={4}
                className="px-3 py-2 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors resize-y"
              />
              <span className="text-[10px] text-muted-foreground">
                {draft.description.length}/5000 — em branco apaga a descrição.
              </span>
            </label>
          </div>
        </FormSection>

        <FormSection spec={SPEC.preco} state={stateOf("preco")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Preço *</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.price}
                onChange={(event) => patch({ price: event.target.value })}
                className={`${FIELD} ${errors.price ? "border-red-400" : ""}`}
              />
              {errors.price && <span className="text-xs text-red-600">{errors.price}</span>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Preço promocional</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.promotionalPrice}
                onChange={(event) => patch({ promotionalPrice: event.target.value })}
                placeholder="sem promoção"
                className={`${FIELD} ${errors.promotionalPrice ? "border-red-400" : ""}`}
              />
              {errors.promotionalPrice ? (
                <span className="text-xs text-red-600">{errors.promotionalPrice}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Em branco retira a promoção. Precisa ser menor que o preço.
                </span>
              )}
            </label>
          </div>
        </FormSection>

        <FormSection spec={SPEC.classificacao} state={stateOf("classificacao")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Público *</span>
              <select
                value={draft.targetAudience}
                onChange={(event) =>
                  patch({
                    targetAudience: event.target.value as TargetAudience | "",
                    category: "",
                  })
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

            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Categoria *</span>
              <select
                value={draft.category}
                onChange={(event) => patch({ category: event.target.value as Category | "" })}
                disabled={!draft.targetAudience}
                className={`${FIELD} cursor-pointer disabled:opacity-40 ${
                  errors.category ? "border-red-400" : ""
                }`}
              >
                <option value="">{draft.targetAudience ? "Selecione" : "Escolha o público antes"}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {translateCategory(category)}
                  </option>
                ))}
              </select>
              {errors.category && <span className="text-xs text-red-600">{errors.category}</span>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Coleção</span>
              <select
                value={draft.collectionId}
                onChange={(event) => patch({ collectionId: event.target.value })}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="">Sem coleção</option>
                {(collections ?? []).map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                    {collection.active ? "" : " (inativa)"}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <div className="mt-5 pt-4 border-t border-muted flex flex-wrap items-center gap-x-8 gap-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => patch({ active: event.target.checked })}
                className="w-4 h-4 accent-foreground"
              />
              <span className="text-sm text-foreground">No ar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(event) => patch({ featured: event.target.checked })}
                className="w-4 h-4 accent-foreground"
              />
              <span className="text-sm text-foreground">Destaque</span>
            </label>
          </div>
        </FormSection>

        <FormSection spec={SPEC.etiqueta} state={stateOf("etiqueta")}>
          <CompositionEditor
            value={draft.fabricCompositions}
            onChange={(fabricCompositions) => patch({ fabricCompositions })}
            error={errors.fabricCompositions}
          />

          <div className="mt-6 pt-6 border-t border-muted">
            <CareEditor
              value={draft.careInstructions}
              onChange={(careInstructions) => patch({ careInstructions })}
            />
          </div>
        </FormSection>

        <FormSection spec={SPEC.cores} state={stateOf("cores")}>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className={SECTION_TITLE}>
                {liveColors.length} {liveColors.length === 1 ? "cor" : "cores"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const color = emptyColor();
                  setDraft((current) => ({ ...current, colors: [...current.colors, color] }));
                  setOpenColors((current) => new Set(current).add(color.uid));
                }}
                className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                Nova cor
              </button>
            </div>

            {errors.colors && <p className="text-xs text-red-600">{errors.colors}</p>}

            {draft.colors.map((color, index) => (
              <ProductColorCard
                key={color.uid}
                color={color}
                index={index}
                productName={draft.name}
                productId={productId}
                isOpen={openColors.has(color.uid)}
                onToggle={() =>
                  setOpenColors((current) => {
                    const next = new Set(current);
                    if (next.has(color.uid)) next.delete(color.uid);
                    else next.add(color.uid);
                    return next;
                  })
                }
                onChange={(next) => patchColor(index, next)}
                onToggleRemoved={() => {
                  if (color.id === undefined && !color.removed) {
                    setDraft((current) => ({
                      ...current,
                      colors: current.colors.filter((_, i) => i !== index),
                    }));
                    return;
                  }
                  patchColor(index, { ...color, removed: !color.removed });
                }}
                canRemove={liveColors.length > 1 || color.id === undefined}
                errors={errors}
              />
            ))}
          </div>
        </FormSection>

        {isEdit && !isGone && (
          <section className="border-t border-muted pt-6">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Excluir produto
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground max-w-xl leading-relaxed">
              A remoção é lógica: a peça sai do catálogo e continua na listagem do painel, de onde pode
              ser restaurada.
            </p>
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
              {isDirty ? "Alterações não salvas" : isEdit ? "Tudo salvo" : "Novo produto"}
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
                disabled={save.isPending || isGone}
                className="flex items-center gap-2 px-5 h-9 bg-foreground text-background text-xs font-semibold tracking-[0.15em] uppercase hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEdit ? "Salvar" : "Criar produto"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemovals !== null}
        title="Confirmar remoções"
        description={describeRemovals(pendingRemovals)}
        warning={
          pendingRemovals && removedUnits(pendingRemovals) > 0
            ? `O estoque desses SKUs — ${removedUnits(pendingRemovals)} unidades — some junto, e não volta pela restauração do produto.`
            : undefined
        }
        confirmLabel="Remover e salvar"
        isPending={save.isPending}
        onConfirm={() => save.mutate(toPayload(draft))}
        onCancel={() => setPendingRemovals(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir produto"
        description={`"${draft.name}" sai do catálogo e da vitrine, com todas as cores e SKUs. A remoção é lógica: ele continua aparecendo na listagem do painel, marcado como removido.`}
        warning="Ao restaurar, a peça volta fora do ar — publicar de novo é um segundo passo."
        confirmLabel="Excluir"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function describeRemovals(removals: Removals | null): string {
  if (!removals) return "";

  const lines: string[] = [];
  for (const color of removals.colors) {
    const units = color.skus.reduce((sum, sku) => sum + sku.stockQuantity, 0);
    lines.push(
      `cor ${color.colorName} — ${color.skus.length} ${color.skus.length === 1 ? "SKU" : "SKUs"}, ${units} unidades`,
    );
  }
  for (const sku of removals.skus) {
    lines.push(`${sku.skuCode} (${sku.size}) — ${sku.stockQuantity} unidades`);
  }

  return `Esta gravação vai remover:\n\n${lines.map((line) => `• ${line}`).join("\n")}`;
}

function CompositionEditor({
  value,
  onChange,
  error,
}: {
  value: ProductDraft["fabricCompositions"];
  onChange: (next: ProductDraft["fabricCompositions"]) => void;
  error?: string;
}) {
  const {
    data: materials,
    isLoading: isLoadingMaterials,
    isError: isMaterialsError,
  } = useQuery({
    queryKey: ["catalog", "materials"],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<MaterialOption[]>("/v1/catalog/products/materials", {
        signal,
      });
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const options = materials ?? [];

  const total = value.reduce((sum, entry) => sum + (Number(entry.percentage) || 0), 0);
  const remaining = 100 - total;
  const isComplete = value.length === 0 || total === 100;

  const used = new Set(value.map((entry) => entry.material).filter(Boolean));

  const patchAt = (index: number, fields: Partial<CompositionDraft>) =>
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...fields } : entry)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL}>Composição do tecido</span>
        <div className="flex items-center gap-3">

          {value.length > 0 && (
            <span className={`text-xs ${isComplete ? "text-muted-foreground" : "text-red-600"}`}>
              {total}% de 100%
              {remaining > 0 && ` — faltam ${remaining}`}
              {remaining < 0 && ` — passou ${-remaining}`}
            </span>
          )}
        </div>
      </div>

      {value.map((entry, index) => {
        const isKnown = options.some((option) => option.name === entry.material);
        const canFill = remaining > 0 && entry.percentage.trim() === "";

        return (
          <div key={entry.uid} className="flex items-center gap-2">
            <select
              value={entry.material}
              onChange={(event) =>
                patchAt(index, { material: event.target.value as Material | "" })
              }
              aria-label="Material"
              className={`${FIELD} flex-1 cursor-pointer`}
            >
              <option value="">
                {isLoadingMaterials ? "Carregando…" : "Selecione o material"}
              </option>

              {entry.material !== "" && !isKnown && (
                <option value={entry.material}>{entry.material}</option>
              )}

              {options.map((option) => (
                <option
                  key={option.name}
                  value={option.name}
                  disabled={option.name !== entry.material && used.has(option.name)}
                >
                  {option.label}
                  {option.name !== entry.material && used.has(option.name) ? " (já usado)" : ""}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={entry.percentage}
              onChange={(event) => patchAt(index, { percentage: event.target.value })}
              placeholder="0"
              aria-label="Percentual"
              className={`${FIELD} w-24`}
            />
            <span className="text-sm text-muted-foreground">%</span>

            {canFill && (
              <button
                type="button"
                onClick={() => patchAt(index, { percentage: String(remaining) })}
                className="px-2 h-9 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground border border-muted hover:border-foreground transition-colors whitespace-nowrap"
              >
                usar {remaining}
              </button>
            )}

            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label="Remover material"
              className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        );
      })}

      {isMaterialsError && (
        <span className="text-xs text-red-600">
          Não foi possível carregar a lista de materiais. As linhas já gravadas continuam valendo e
          serão salvas como estão.
        </span>
      )}

      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : (
        value.length === 0 && (
          <span className="text-[10px] text-muted-foreground">
            Opcional — mas se preenchida, tem que somar exatamente 100%, em números inteiros.
          </span>
        )
      )}

      <button
        type="button"
        onClick={() => onChange([...value, { uid: nextUid("f"), material: "", percentage: "" }])}
        className="self-start flex items-center gap-1 mt-1 px-2 py-1.5 -ml-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3 h-3" strokeWidth={1.5} />
        Material
      </button>
    </div>
  );
}

function CareEditor({
  value,
  onChange,
}: {
  value: CareInstruction[];
  onChange: (next: CareInstruction[]) => void;
}) {
  const {
    data: careAxes,
    isLoading: isLoadingCare,
    isError: isCareError,
  } = useQuery({
    queryKey: ["catalog", "care-instructions"],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<CareAxisOptions[]>(
        "/v1/catalog/products/care-instructions",
        { signal },
      );
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const axes = careAxes ?? [];

  const chosenIn = (axis: CareAxisOptions): CareInstruction | "" =>
    value.find((instruction) => axis.options.some((option) => option.name === instruction)) ?? "";

  const select = (axis: CareAxisOptions, next: CareInstruction | "") => {
    const current = chosenIn(axis);
    if (next === "") {
      onChange(value.filter((instruction) => instruction !== current));
      return;
    }
    if (current === "") {
      onChange([...value, next]);
      return;
    }
    onChange(value.map((instruction) => (instruction === current ? next : instruction)));
  };

  const filled = axes.filter((axis) => chosenIn(axis) !== "").length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL}>Cuidados</span>
        <span className="text-xs text-muted-foreground">
          {isLoadingCare
            ? "Carregando…"
            : axes.length > 0
              ? `${filled} de ${axes.length} preenchidos — cada eixo aceita uma instrução`
              : ""}
        </span>
      </div>

      {isCareError ? (
        <p className="text-xs text-red-600">
          Falha ao carregar as opções de cuidado.
          {value.length > 0 &&
            ` As ${value.length === 1 ? "instrução já gravada" : `${value.length} instruções já gravadas`} serão mantidas ao salvar.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {axes.map((axis) => {
            const chosen = chosenIn(axis);
            return (
              <label key={axis.axis} className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {axis.label}
                </span>
                <select
                  value={chosen}
                  onChange={(event) => select(axis, event.target.value as CareInstruction | "")}
                  className={`${FIELD} cursor-pointer`}
                >
                  <option value="">Não informar</option>
                  {axis.options.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
