"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Package, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { GalleryUploader } from "@/components/admin/GalleryUploader";
import { PRODUCT_SIZES, emptySku, type ColorDraft, type SkuDraft } from "@/lib/admin/product-form";
import { stockHref } from "@/lib/admin/stock-filters";

const FIELD =
  "h-9 px-3 bg-transparent border border-muted text-sm text-foreground focus:outline-none focus:border-foreground transition-colors";

const LABEL = "text-[10px] uppercase tracking-[0.15em] text-muted-foreground";

interface ProductColorCardProps {
  color: ColorDraft;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (next: ColorDraft) => void;
  onToggleRemoved: () => void;
  canRemove: boolean;
  errors: Record<string, string>;
  productName: string;
  productId?: number;
}

export function ProductColorCard({
  color,
  index,
  isOpen,
  onToggle,
  onChange,
  onToggleRemoved,
  canRemove,
  errors,
  productName,
  productId,
}: ProductColorCardProps) {
  const path = `colors.${index}`;
  const patch = (fields: Partial<ColorDraft>) => onChange({ ...color, ...fields });

  const patchSku = (skuIndex: number, fields: Partial<SkuDraft>) =>
    patch({ skus: color.skus.map((sku, i) => (i === skuIndex ? { ...sku, ...fields } : sku)) });

  const liveSkus = color.skus.filter((sku) => !sku.removed);
  const removedUnits = color.skus
    .filter((sku) => sku.removed && sku.id !== undefined)
    .reduce((sum, sku) => sum + (Number(sku.stockQuantity) || 0), 0);

  const hasInnerError = Object.keys(errors).some((key) => key.startsWith(`${path}.`));

  return (
    <div
      className={`border transition-colors ${
        color.removed ? "border-red-300 bg-red-50/40" : hasInnerError ? "border-red-400" : "border-muted"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
          )}

          <span
            aria-hidden
            className="w-4 h-4 rounded-full border border-muted flex-shrink-0"
            style={{ backgroundColor: color.colorHex }}
          />

          <span
            className={`text-sm truncate ${
              color.removed ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {color.colorName || <span className="text-muted-foreground">(sem nome)</span>}
          </span>

          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex-shrink-0">
            {liveSkus.length} {liveSkus.length === 1 ? "SKU" : "SKUs"}
          </span>

          {hasInnerError && !color.removed && (
            <span className="text-[10px] uppercase tracking-widest text-red-600 flex-shrink-0">
              revisar
            </span>
          )}
        </button>

        {color.removed ? (
          <button
            type="button"
            onClick={onToggleRemoved}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
            Desfazer
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleRemoved}
            disabled={!canRemove}
            title={canRemove ? undefined : "O produto precisa de ao menos uma cor."}
            aria-label={`Remover a cor ${color.colorName || index + 1}`}
            className="p-1.5 text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {color.removed && (
        <p className="px-4 pb-3 -mt-1 text-xs text-red-700">
          Será removida ao salvar, com {color.skus.filter((s) => s.id !== undefined).length}{" "}
          {color.skus.filter((s) => s.id !== undefined).length === 1 ? "SKU" : "SKUs"} e{" "}
          {color.skus
            .filter((s) => s.id !== undefined)
            .reduce((sum, s) => sum + (Number(s.stockQuantity) || 0), 0)}{" "}
          unidades em estoque.
        </p>
      )}

      {isOpen && !color.removed && (
        <div className="px-4 pb-5 flex flex-col gap-5 border-t border-muted pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Nome da cor *</span>
              <input
                type="text"
                value={color.colorName}
                onChange={(event) => patch({ colorName: event.target.value })}
                maxLength={100}
                className={`${FIELD} ${errors[`${path}.colorName`] ? "border-red-400" : ""}`}
              />
              {errors[`${path}.colorName`] && (
                <span className="text-xs text-red-600">{errors[`${path}.colorName`]}</span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Cor *</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(color.colorHex) ? color.colorHex : "#000000"}
                  onChange={(event) => patch({ colorHex: event.target.value })}
                  aria-label="Seletor de cor"
                  className="w-9 h-9 border border-muted bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={color.colorHex}
                  onChange={(event) => patch({ colorHex: event.target.value })}
                  placeholder="#000000"
                  className={`${FIELD} flex-1 font-mono ${
                    errors[`${path}.colorHex`] ? "border-red-400" : ""
                  }`}
                />
              </div>
              {errors[`${path}.colorHex`] && (
                <span className="text-xs text-red-600">{errors[`${path}.colorHex`]}</span>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadField
              label="Capa"
              required
              hint="A imagem do card na vitrine e a primeira da galeria. Sem ela a peça não renderiza na loja."
              value={color.coverImageUrl}
              onChange={(url) => patch({ coverImageUrl: url })}
            />
            <ImageUploadField
              label="Hover"
              hint="Troca ao passar o mouse sobre o card. Opcional — sem ela o card fica estático."
              value={color.hoverImageUrl}
              onChange={(url) => patch({ hoverImageUrl: url })}
            />
          </div>

          <GalleryUploader
            value={color.galleryImages}
            onChange={(urls) => patch({ galleryImages: urls })}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className={LABEL}>Tamanhos e SKUs *</span>
              <button
                type="button"
                onClick={() => patch({ skus: [...color.skus, emptySku()] })}
                className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3 h-3" strokeWidth={1.5} />
                Adicionar tamanho
              </button>
            </div>

            {errors[`${path}.skus`] && (
              <span className="text-xs text-red-600">{errors[`${path}.skus`]}</span>
            )}

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className={`text-left border-b border-muted ${LABEL}`}>
                    <th className="py-2 pr-3 font-normal w-24">Tam.</th>
                    <th className="py-2 pr-3 font-normal">Código</th>
                    <th className="py-2 pr-3 font-normal w-40">Estoque</th>
                    <th className="py-2 font-normal w-10" />
                  </tr>
                </thead>
                <tbody>
                  {color.skus.map((sku, skuIndex) => {
                    const skuPath = `${path}.skus.${skuIndex}`;
                    const isNew = sku.id === undefined;
                    const liveCount = liveSkus.length;
                    return (
                      <tr
                        key={sku.uid}
                        className={`border-b border-muted/50 align-top ${
                          sku.removed ? "bg-red-50/40" : ""
                        }`}
                      >
                        <td className="py-2 pr-3">
                          <select
                            value={sku.size}
                            onChange={(event) =>
                              patchSku(skuIndex, { size: event.target.value as SkuDraft["size"] })
                            }
                            disabled={sku.removed}
                            aria-label="Tamanho"
                            className={`${FIELD} w-full cursor-pointer disabled:opacity-40 ${
                              errors[`${skuPath}.size`] ? "border-red-400" : ""
                            }`}
                          >
                            {PRODUCT_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                          {errors[`${skuPath}.size`] && (
                            <span className="block mt-1 text-xs text-red-600">
                              {errors[`${skuPath}.size`]}
                            </span>
                          )}
                        </td>

                        <td className="py-2 pr-3">
                          <div className="h-9 flex items-center">
                            {sku.skuCode ? (
                              <span className="font-mono text-xs text-muted-foreground">
                                {sku.skuCode}
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                gerado ao salvar
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 pr-3">
                          {isNew ? (
                            <>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={sku.stockQuantity}
                                onChange={(event) =>
                                  patchSku(skuIndex, { stockQuantity: event.target.value })
                                }
                                disabled={sku.removed}
                                aria-label="Estoque inicial"
                                className={`${FIELD} w-full disabled:opacity-40 ${
                                  errors[`${skuPath}.stockQuantity`] ? "border-red-400" : ""
                                }`}
                              />
                              <span className="block mt-1 text-[10px] text-muted-foreground">
                                estoque inicial
                              </span>
                              {errors[`${skuPath}.stockQuantity`] && (
                                <span className="block text-xs text-red-600">
                                  {errors[`${skuPath}.stockQuantity`]}
                                </span>
                              )}
                            </>
                          ) : (
                            <div className="flex items-baseline gap-2 h-9">
                              <span className="text-foreground">{sku.stockQuantity}</span>
                              <Link
                                href={
                                  productId === undefined
                                    ? `/admin/stock?q=${encodeURIComponent(productName)}`
                                    : stockHref({ id: productId, name: productName })
                                }
                                className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Package className="w-3 h-3" strokeWidth={1.5} />
                                ajustar
                              </Link>
                            </div>
                          )}
                        </td>

                        <td className="py-2">
                          {sku.removed ? (
                            <button
                              type="button"
                              onClick={() => patchSku(skuIndex, { removed: false })}
                              aria-label="Desfazer a remoção deste SKU"
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                isNew
                                  ? patch({ skus: color.skus.filter((_, i) => i !== skuIndex) })
                                  : patchSku(skuIndex, { removed: true })
                              }
                              disabled={liveCount <= 1}
                              title={liveCount <= 1 ? "A cor precisa de ao menos um SKU." : undefined}
                              aria-label="Remover este SKU"
                              className="p-1.5 text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="sm:hidden flex flex-col gap-2">
              {color.skus.map((sku, skuIndex) => {
                const skuPath = `${path}.skus.${skuIndex}`;
                const isNew = sku.id === undefined;
                const liveCount = liveSkus.length;
                return (
                  <li
                    key={sku.uid}
                    className={`border border-muted p-3 flex flex-col gap-2 ${
                      sku.removed ? "bg-red-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={`block mb-1 ${LABEL}`}>Tamanho</span>
                        <select
                          value={sku.size}
                          onChange={(event) =>
                            patchSku(skuIndex, { size: event.target.value as SkuDraft["size"] })
                          }
                          disabled={sku.removed}
                          aria-label="Tamanho"
                          className={`${FIELD} w-full cursor-pointer disabled:opacity-40 ${
                            errors[`${skuPath}.size`] ? "border-red-400" : ""
                          }`}
                        >
                          {PRODUCT_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        {errors[`${skuPath}.size`] && (
                          <span className="block mt-1 text-xs text-red-600">
                            {errors[`${skuPath}.size`]}
                          </span>
                        )}
                      </div>

                      {sku.removed ? (
                        <button
                          type="button"
                          onClick={() => patchSku(skuIndex, { removed: false })}
                          aria-label="Desfazer a remoção deste SKU"
                          className="mt-5 p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            isNew
                              ? patch({ skus: color.skus.filter((_, i) => i !== skuIndex) })
                              : patchSku(skuIndex, { removed: true })
                          }
                          disabled={liveCount <= 1}
                          title={liveCount <= 1 ? "A cor precisa de ao menos um SKU." : undefined}
                          aria-label="Remover este SKU"
                          className="mt-5 p-2 text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`block mb-1 ${LABEL}`}>Código</span>
                        {sku.skuCode ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {sku.skuCode}
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            gerado ao salvar
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`block mb-1 ${LABEL}`}>Estoque</span>
                        {isNew ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={sku.stockQuantity}
                              onChange={(event) =>
                                patchSku(skuIndex, { stockQuantity: event.target.value })
                              }
                              disabled={sku.removed}
                              aria-label="Estoque inicial"
                              className={`${FIELD} w-24 text-right disabled:opacity-40 ${
                                errors[`${skuPath}.stockQuantity`] ? "border-red-400" : ""
                              }`}
                            />
                            {errors[`${skuPath}.stockQuantity`] && (
                              <span className="block text-xs text-red-600">
                                {errors[`${skuPath}.stockQuantity`]}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="text-foreground">{sku.stockQuantity}</span>
                            <Link
                              href={
                                productId === undefined
                                  ? `/admin/stock?q=${encodeURIComponent(productName)}`
                                  : stockHref({ id: productId, name: productName })
                              }
                              className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Package className="w-3 h-3" strokeWidth={1.5} />
                              ajustar
                            </Link>
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {removedUnits > 0 && (
              <p className="text-xs text-red-700">
                Os SKUs marcados levam {removedUnits} unidades em estoque ao serem removidos.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
