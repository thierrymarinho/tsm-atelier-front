import type {
  AdminProductResponse,
  FabricCompositionRequest,
  ProductColorRequest,
  ProductRequest,
  ProductSize,
  ProductSkuRequest,
} from '@/lib/types/admin';
import type { CareInstruction, Category, Material, TargetAudience } from '@/lib/types/api';
import type {
  FormSectionSpec as BaseFormSectionSpec,
  SectionState,
} from '@/lib/admin/form-section';

export const PRODUCT_SIZES: readonly ProductSize[] = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

const HEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const MAX_NAME = 255;
const MAX_DESCRIPTION = 5000;
const MAX_COLOR_NAME = 100;
const MAX_IMAGE_URL = 500;

export interface SkuDraft {
  uid: string;
  id?: number;
  size: ProductSize;
  skuCode: string;
  stockQuantity: string;
  removed: boolean;
}

export interface ColorDraft {
  uid: string;
  id?: number;
  colorName: string;
  colorHex: string;
  coverImageUrl: string;
  hoverImageUrl: string;
  galleryImages: string[];
  skus: SkuDraft[];
  removed: boolean;
}

export interface CompositionDraft {
  uid: string;
  material: Material | '';
  percentage: string;
}

export interface ProductDraft {
  name: string;
  description: string;
  fabricCompositions: CompositionDraft[];
  careInstructions: CareInstruction[];
  price: string;
  promotionalPrice: string;
  collectionId: string;
  category: Category | '';
  targetAudience: TargetAudience | '';
  active: boolean;
  featured: boolean;
  colors: ColorDraft[];
}

let uidSeq = 0;

export function nextUid(prefix = 'n'): string {
  return `${prefix}${uidSeq++}`;
}

export function emptySku(): SkuDraft {
  return { uid: nextUid('s'), size: 'M', skuCode: '', stockQuantity: '0', removed: false };
}

export function emptyColor(): ColorDraft {
  return {
    uid: nextUid('c'),
    colorName: '',
    colorHex: '#000000',
    coverImageUrl: '',
    hoverImageUrl: '',
    galleryImages: [],
    skus: [emptySku()],
    removed: false,
  };
}

export function emptyDraft(): ProductDraft {
  return {
    name: '',
    description: '',
    fabricCompositions: [],
    careInstructions: [],
    price: '',
    promotionalPrice: '',
    collectionId: '',
    category: '',
    targetAudience: '',
    active: true,
    featured: false,
    colors: [emptyColor()],
  };
}

export function toDraft(product: AdminProductResponse): ProductDraft {
  return {
    name: product.name,
    description: product.description ?? '',
    fabricCompositions: (product.fabricCompositions ?? []).map((entry) => ({
      uid: nextUid('f'),
      material: entry.material,
      percentage: String(entry.percentage),
    })),
    careInstructions: (product.careInstructions ?? []).map((entry) => entry.instruction),
    price: String(product.price),
    promotionalPrice: product.promotionalPrice === null ? '' : String(product.promotionalPrice),
    collectionId: product.collection ? String(product.collection.id) : '',
    category: product.category,
    targetAudience: product.targetAudience,
    active: product.active,
    featured: product.featured,
    colors: product.colors.map((color) => ({
      uid: nextUid('c'),
      id: color.id,
      colorName: color.colorName,
      colorHex: color.colorHex,
      coverImageUrl: color.coverImageUrl ?? '',
      hoverImageUrl: color.hoverImageUrl ?? '',
      galleryImages: [...(color.galleryImages ?? [])],
      skus: color.skus.map((sku) => ({
        uid: nextUid('s'),
        id: sku.id,
        size: sku.size,
        skuCode: sku.skuCode,
        stockQuantity: String(sku.stockQuantity),
        removed: false,
      })),
      removed: false,
    })),
  };
}

function optionalText(value: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function liveColors(draft: ProductDraft): ColorDraft[] {
  return draft.colors.filter((color) => !color.removed);
}

function liveSkus(color: ColorDraft): SkuDraft[] {
  return color.skus.filter((sku) => !sku.removed);
}

export function toPayload(draft: ProductDraft): ProductRequest {
  const colors: ProductColorRequest[] = liveColors(draft).map((color) => {
    const skus: ProductSkuRequest[] = liveSkus(color).map((sku) => {
      const base: ProductSkuRequest = { size: sku.size };
      if (sku.id !== undefined) {
        base.id = sku.id;
        return base;
      }
      base.stockQuantity = Math.max(0, Math.trunc(Number(sku.stockQuantity) || 0));
      return base;
    });

    const color_: ProductColorRequest = {
      colorName: color.colorName.trim().slice(0, MAX_COLOR_NAME),
      colorHex: color.colorHex.trim(),
      skus,
    };
    if (color.id !== undefined) color_.id = color.id;

    const cover = optionalText(color.coverImageUrl, MAX_IMAGE_URL);
    if (cover) color_.coverImageUrl = cover;
    const hover = optionalText(color.hoverImageUrl, MAX_IMAGE_URL);
    if (hover) color_.hoverImageUrl = hover;

    color_.galleryImages = color.galleryImages
      .map((url) => url.trim().slice(0, MAX_IMAGE_URL))
      .filter(Boolean);

    return color_;
  });

  const compositions: FabricCompositionRequest[] = draft.fabricCompositions
    .filter((entry) => entry.material !== '')
    .map((entry) => ({
      material: entry.material as Material,
      percentage: Math.trunc(Number(entry.percentage) || 0),
    }));

  const payload: ProductRequest = {
    name: draft.name.trim().slice(0, MAX_NAME),
    price: Number(draft.price),
    category: draft.category as Category,
    targetAudience: draft.targetAudience as TargetAudience,
    active: draft.active,
    featured: draft.featured,
    colors,
  };

  const description = optionalText(draft.description, MAX_DESCRIPTION);
  if (description) payload.description = description;

  payload.fabricCompositions = compositions;
  payload.careInstructions = Array.from(new Set(draft.careInstructions));

  const promotional = optionalNumber(draft.promotionalPrice);
  if (promotional !== undefined) payload.promotionalPrice = promotional;

  const collectionId = optionalNumber(draft.collectionId);
  if (collectionId !== undefined) payload.collectionId = collectionId;

  return payload;
}

export function toRequest(product: AdminProductResponse): ProductRequest {
  return toPayload(toDraft(product));
}

export function validateDraft(draft: ProductDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.name.trim()) errors.name = 'Obrigatório.';
  else if (draft.name.trim().length > MAX_NAME) errors.name = `Máximo de ${MAX_NAME} caracteres.`;

  const price = Number(draft.price);
  if (!draft.price.trim()) errors.price = 'Obrigatório.';
  else if (!Number.isFinite(price) || price <= 0) errors.price = 'Precisa ser maior que zero.';
  else if (price >= 100_000_000) errors.price = 'Máximo de 8 dígitos inteiros.';

  if (draft.promotionalPrice.trim()) {
    const promotional = Number(draft.promotionalPrice);
    if (!Number.isFinite(promotional) || promotional <= 0) {
      errors.promotionalPrice = 'Precisa ser maior que zero.';
    } else if (Number.isFinite(price) && promotional >= price) {
      errors.promotionalPrice = 'Precisa ser menor que o preço.';
    }
  }

  if (!draft.category) errors.category = 'Obrigatório.';
  if (!draft.targetAudience) errors.targetAudience = 'Obrigatório.';

  if (draft.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `Máximo de ${MAX_DESCRIPTION} caracteres.`;
  }

  const compositions = draft.fabricCompositions;
  if (compositions.length > 0) {
    if (compositions.some((entry) => entry.material === '')) {
      errors.fabricCompositions = 'Escolha o material de cada linha.';
    }

    if (
      compositions.some((entry) => {
        const value = Number(entry.percentage);
        return (
          entry.percentage.trim() === '' || !Number.isInteger(value) || value < 1 || value > 100
        );
      })
    ) {
      errors.fabricCompositions = 'Cada percentual é um número inteiro de 1 a 100.';
    }

    const total = compositions.reduce((sum, entry) => sum + (Number(entry.percentage) || 0), 0);
    if (total !== 100) {
      errors.fabricCompositions = `A composição soma ${total}%. Precisa somar exatamente 100%.`;
    }

    const materials = compositions.map((entry) => entry.material).filter(Boolean);
    if (new Set(materials).size !== materials.length) {
      errors.fabricCompositions = 'Material repetido na composição.';
    }
  }

  const colors = liveColors(draft);
  if (colors.length === 0) {
    errors.colors = 'O produto precisa de ao menos uma cor.';
  }

  draft.colors.forEach((color, colorIndex) => {
    if (color.removed) return;
    const path = `colors.${colorIndex}`;

    if (!color.colorName.trim()) errors[`${path}.colorName`] = 'Obrigatório.';
    if (!HEX.test(color.colorHex.trim())) errors[`${path}.colorHex`] = 'Use #RRGGBB.';

    const skus = liveSkus(color);
    if (skus.length === 0) errors[`${path}.skus`] = 'A cor precisa de ao menos um SKU.';

    const seenSizes = new Map<string, string>();

    color.skus.forEach((sku, skuIndex) => {
      if (sku.removed) return;
      const skuPath = `${path}.skus.${skuIndex}`;

      const previous = seenSizes.get(sku.size);
      if (previous) {
        errors[`${skuPath}.size`] = 'Este tamanho já está nesta cor.';
        errors[`${previous}.size`] = 'Este tamanho já está nesta cor.';
      } else {
        seenSizes.set(sku.size, skuPath);
      }

      if (sku.id === undefined) {
        const quantity = Number(sku.stockQuantity);
        if (!sku.stockQuantity.trim() || !Number.isInteger(quantity) || quantity < 0) {
          errors[`${skuPath}.stockQuantity`] = 'Inteiro maior ou igual a zero.';
        }
      }
    });
  });

  return errors;
}

export type SectionId = 'identificacao' | 'preco' | 'classificacao' | 'etiqueta' | 'cores';

export type FormSectionSpec = BaseFormSectionSpec & { id: SectionId };

export type { SectionState };

export const PRODUCT_FORM_SECTIONS: readonly FormSectionSpec[] = [
  {
    id: 'identificacao',
    number: 1,
    title: 'Identificação',
    hint: 'O nome que aparece na vitrine e o texto da página do produto.',
  },
  {
    id: 'preco',
    number: 2,
    title: 'Preço',
    hint: 'O preço de tabela e, se houver, o promocional que o substitui.',
  },
  {
    id: 'classificacao',
    number: 3,
    title: 'Classificação',
    hint: 'Onde a peça aparece: público, categoria, coleção e a publicação.',
  },
  {
    id: 'etiqueta',
    number: 4,
    title: 'Etiqueta',
    hint: 'Composição do tecido e cuidados. Opcional, mas some da página se ficar vazia.',
  },
  {
    id: 'cores',
    number: 5,
    title: 'Cores e tamanhos',
    hint: 'Cada cor com suas imagens e seus SKUs. Ao menos uma, com ao menos um tamanho.',
  },
] as const;

const SECTION_ERROR_KEYS: Record<SectionId, readonly string[]> = {
  identificacao: ['name', 'description'],
  preco: ['price', 'promotionalPrice'],
  classificacao: ['targetAudience', 'category'],
  etiqueta: ['fabricCompositions'],
  cores: ['colors'],
};

export function sectionState(
  id: SectionId,
  draft: ProductDraft,
  errors: Record<string, string>,
): SectionState {
  const keys = SECTION_ERROR_KEYS[id];
  const hasError = Object.keys(errors).some((key) =>
    keys.some((prefix) => key === prefix || key.startsWith(`${prefix}.`)),
  );
  if (hasError) return 'error';

  switch (id) {
    case 'identificacao':
      return draft.name.trim() ? 'done' : 'empty';

    case 'preco':
      return draft.price.trim() ? 'done' : 'empty';

    case 'classificacao':
      return draft.targetAudience && draft.category ? 'done' : 'empty';

    case 'etiqueta':
      return draft.fabricCompositions.length > 0 || draft.careInstructions.length > 0
        ? 'done'
        : 'empty';

    case 'cores': {
      const live = draft.colors.filter((color) => !color.removed);
      return live.length > 0 && live.every((color) => color.skus.some((sku) => !sku.removed))
        ? 'done'
        : 'empty';
    }
  }
}

export interface RemovedSku {
  skuCode: string;
  size: ProductSize;
  stockQuantity: number;
}

export interface RemovedColor {
  colorName: string;
  skus: RemovedSku[];
}

export interface Removals {
  colors: RemovedColor[];
  skus: RemovedSku[];
  total: number;
}

export function diffRemovals(original: AdminProductResponse, draft: ProductDraft): Removals {
  const keptColorIds = new Set(
    draft.colors.filter((color) => !color.removed && color.id !== undefined).map((color) => color.id),
  );
  const keptSkuIds = new Set(
    draft.colors
      .filter((color) => !color.removed)
      .flatMap((color) => color.skus.filter((sku) => !sku.removed && sku.id !== undefined))
      .map((sku) => sku.id),
  );

  const describe = (sku: {
    skuCode: string;
    size: ProductSize;
    stockQuantity: number;
  }): RemovedSku => ({
    skuCode: sku.skuCode,
    size: sku.size,
    stockQuantity: sku.stockQuantity,
  });

  const colors: RemovedColor[] = [];
  const skus: RemovedSku[] = [];

  for (const color of original.colors) {
    if (color.deletedAt !== null) continue;

    if (!keptColorIds.has(color.id)) {
      colors.push({
        colorName: color.colorName,
        skus: color.skus.filter((sku) => sku.deletedAt === null).map(describe),
      });
      continue;
    }

    for (const sku of color.skus) {
      if (sku.deletedAt !== null) continue;
      if (!keptSkuIds.has(sku.id)) skus.push(describe(sku));
    }
  }

  const total = colors.reduce((sum, color) => sum + color.skus.length, 0) + skus.length;
  return { colors, skus, total };
}

export function removedUnits(removals: Removals): number {
  const fromColors = removals.colors.flatMap((color) => color.skus);
  return [...fromColors, ...removals.skus].reduce((sum, sku) => sum + sku.stockQuantity, 0);
}
