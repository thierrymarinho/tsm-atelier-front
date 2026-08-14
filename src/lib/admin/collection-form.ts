import type { AdminCollectionResponse, CollectionRequest } from '@/lib/types/admin';
import type { DisplayPosition, TargetAudience } from '@/lib/types/api';
import type {
  FormSectionSpec as BaseFormSectionSpec,
  SectionState,
} from '@/lib/admin/form-section';
import { translateTargetAudience } from '@/lib/utils/translations';

const MAX_NAME = 255;
const MAX_DESCRIPTION = 5000;
const MAX_IMAGE_URL = 255;

export interface CollectionDraft {
  name: string;
  description: string;
  active: boolean;
  heroImageUrl: string;
  portraitImageUrl: string;
  squareImageUrl: string;
  displayPosition: DisplayPosition;
  displayOrder: string;
  targetAudience: TargetAudience | '';
}

export function emptyDraft(): CollectionDraft {
  return {
    name: '',
    description: '',
    active: false,
    heroImageUrl: '',
    portraitImageUrl: '',
    squareImageUrl: '',
    displayPosition: 'NONE',
    displayOrder: '',
    targetAudience: '',
  };
}

export function toDraft(collection: AdminCollectionResponse): CollectionDraft {
  return {
    name: collection.name,
    description: collection.description ?? '',
    active: collection.active,
    heroImageUrl: collection.heroImageUrl ?? '',
    portraitImageUrl: collection.portraitImageUrl ?? '',
    squareImageUrl: collection.squareImageUrl ?? '',
    displayPosition: collection.displayPosition ?? 'NONE',
    displayOrder: collection.displayOrder === null ? '' : String(collection.displayOrder),
    targetAudience: collection.targetAudience,
  };
}

export function toPayload(draft: CollectionDraft): CollectionRequest {
  const payload: CollectionRequest = {
    name: draft.name.trim().slice(0, MAX_NAME),
    active: draft.active,
    displayPosition: draft.displayPosition,
    targetAudience: draft.targetAudience as TargetAudience,
  };

  const description = optionalText(draft.description, MAX_DESCRIPTION);
  if (description) payload.description = description;

  const hero = optionalText(draft.heroImageUrl, MAX_IMAGE_URL);
  if (hero) payload.heroImageUrl = hero;

  const portrait = optionalText(draft.portraitImageUrl, MAX_IMAGE_URL);
  if (portrait) payload.portraitImageUrl = portrait;

  const square = optionalText(draft.squareImageUrl, MAX_IMAGE_URL);
  if (square) payload.squareImageUrl = square;

  const order = draft.displayOrder.trim();
  if (order) payload.displayOrder = Math.trunc(Number(order));

  return payload;
}

function optionalText(value: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function validateDraft(draft: CollectionDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'O nome é obrigatório.';
  else if (name.length > MAX_NAME) errors.name = `No máximo ${MAX_NAME} caracteres.`;

  if (!draft.targetAudience) errors.targetAudience = 'Escolha o público.';

  if (draft.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `No máximo ${MAX_DESCRIPTION} caracteres.`;
  }

  (
    [
      ['heroImageUrl', draft.heroImageUrl],
      ['portraitImageUrl', draft.portraitImageUrl],
      ['squareImageUrl', draft.squareImageUrl],
    ] as const
  ).forEach(([field, value]) => {
    if (value.trim().length > MAX_IMAGE_URL) {
      errors[field] = `No máximo ${MAX_IMAGE_URL} caracteres — a URL está longa demais.`;
    }
  });

  const order = draft.displayOrder.trim();
  if (order && !/^-?\d+$/.test(order)) {
    errors.displayOrder = 'Use um número inteiro, ou deixe em branco.';
  }

  return errors;
}

export interface PositionSpec {
  position: DisplayPosition;
  label: string;
  where: string;
  exclusivity: 'site' | 'audience' | 'none';
  onConflict: 'demote' | 'reject' | 'none';
}

export const POSITION_SPECS: readonly PositionSpec[] = [
  {
    position: 'HOME_MAIN',
    label: 'Capa da home',
    where: 'A imagem grande do topo da home. Uma só no site inteiro, para os dois públicos.',
    exclusivity: 'site',
    onConflict: 'demote',
  },
  {
    position: 'HOME_SECONDARY',
    label: 'Blocos da home',
    where: 'Os dois blocos abaixo do carrossel da home — um por público.',
    exclusivity: 'audience',
    onConflict: 'demote',
  },
  {
    position: 'HEADER',
    label: 'Destaque do menu',
    where:
      'O cartão em destaque no menu principal. Hoje a loja só lê a coleção do público Mulher nessa posição.',
    exclusivity: 'audience',
    onConflict: 'reject',
  },
  {
    position: 'NEW_ARRIVALS',
    label: 'Novidades',
    where: 'A lista "Novidades" do menu — aparecem as 5 primeiras, por ordem de exibição.',
    exclusivity: 'none',
    onConflict: 'none',
  },
  {
    position: 'FEATURED',
    label: 'Grade do menu',
    where:
      'A grade dentro de Feminino e Masculino no menu — aparecem as 4 primeiras de cada público.',
    exclusivity: 'none',
    onConflict: 'none',
  },
  {
    position: 'NONE',
    label: 'Nenhuma',
    where:
      'Fora da home e dos destaques do menu. A coleção continua acessível pela busca e pelo endereço dela.',
    exclusivity: 'none',
    onConflict: 'none',
  },
] as const;

const POSITION_BY_ID = new Map(POSITION_SPECS.map((spec) => [spec.position, spec]));

export function positionSpec(position: DisplayPosition | null): PositionSpec {
  return POSITION_BY_ID.get(position ?? 'NONE') ?? POSITION_BY_ID.get('NONE')!;
}

export function findOccupant(
  collections: readonly AdminCollectionResponse[],
  position: DisplayPosition,
  targetAudience: TargetAudience | '',
  ignoreId?: number,
): AdminCollectionResponse | undefined {
  const spec = positionSpec(position);
  if (spec.exclusivity === 'none') return undefined;

  return collections.find(
    (collection) =>
      collection.id !== ignoreId &&
      collection.displayPosition === position &&
      (spec.exclusivity === 'site' || collection.targetAudience === targetAudience),
  );
}

export interface ShowcaseSlot {
  key: string;
  label: string;
  spec: PositionSpec;
  targetAudience?: TargetAudience;
  occupant?: AdminCollectionResponse;
}

export function showcaseSlots(
  collections: readonly AdminCollectionResponse[],
): ShowcaseSlot[] {
  const audiences: TargetAudience[] = ['WOMEN', 'MEN'];
  const slots: ShowcaseSlot[] = [
    {
      key: 'HOME_MAIN',
      label: 'Capa da home',
      spec: positionSpec('HOME_MAIN'),
      occupant: findOccupant(collections, 'HOME_MAIN', ''),
    },
  ];

  (['HOME_SECONDARY', 'HEADER'] as const).forEach((position) => {
    audiences.forEach((audience) => {
      slots.push({
        key: `${position}-${audience}`,
        label: positionSpec(position).label,
        spec: positionSpec(position),
        targetAudience: audience,
        occupant: findOccupant(collections, position, audience),
      });
    });
  });

  return slots;
}

export function sortCollections(
  collections: readonly AdminCollectionResponse[],
): AdminCollectionResponse[] {
  return [...collections].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      if (a.displayOrder === null) return 1;
      if (b.displayOrder === null) return -1;
      return a.displayOrder - b.displayOrder;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function orderRivals(
  collections: readonly AdminCollectionResponse[],
  draft: CollectionDraft,
  ignoreId?: number,
): AdminCollectionResponse[] {
  const order = draft.displayOrder.trim();
  if (!order || draft.displayPosition === 'NONE') return [];

  const value = Math.trunc(Number(order));
  return collections.filter(
    (collection) =>
      collection.id !== ignoreId &&
      collection.displayOrder === value &&
      collection.displayPosition === draft.displayPosition &&
      collection.targetAudience === draft.targetAudience,
  );
}

export function describeCollectionConflict(
  detail: string | undefined,
  occupantName?: string,
): string | null {
  if (!detail) return null;

  const identifier = /already exists with identifier:\s*(.+)$/is.exec(detail)?.[1]?.trim();
  if (!identifier) return null;

  const deletedId = parseRestorableCollectionId(identifier);
  const core = identifier.replace(/\s*\(.*\)\s*$/s, '').trim();

  const match = /^(.*)\s+for\s+(WOMEN|MEN)$/s.exec(core);
  if (!match) return null;

  const [, subject, rawAudience] = match;
  const audience = translateTargetAudience(rawAudience);

  const position = POSITION_SPECS.find((spec) => spec.position === subject);
  if (position) {
    const who = occupantName ? `“${occupantName}” já está` : 'Já existe uma coleção';
    return (
      `${who} em ${position.label} para ${audience}. ` +
      'Diferente das posições da home, esta não rebaixa a ocupante — tire a outra coleção de lá ' +
      'antes de salvar esta.'
    );
  }

  if (deletedId !== undefined) {
    return (
      `O nome “${subject}” está preso por uma coleção removida (nº ${deletedId}) de ${audience}. ` +
      'Ela não aparece em listagem nenhuma, mas continua ocupando o nome.'
    );
  }

  return (
    `Já existe uma coleção chamada “${subject}” em ${audience}. ` +
    'O nome é único por público — escolha outro, ou edite a que já existe.'
  );
}

export function parseRestorableCollectionId(detail: string | undefined): number | undefined {
  if (!detail) return undefined;

  const phrase = /deleted collection (\d+)/i.exec(detail);
  const route = /collections\/(\d+)\/restore/i.exec(detail);
  const raw = phrase?.[1] ?? route?.[1];
  if (!raw) return undefined;

  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export type SectionId = 'identificacao' | 'imagens' | 'vitrine';

export type FormSectionSpec = BaseFormSectionSpec & { id: SectionId };

export type { SectionState };

export const COLLECTION_FORM_SECTIONS: readonly FormSectionSpec[] = [
  {
    id: 'identificacao',
    number: 1,
    title: 'Identificação',
    hint: 'O nome que aparece na vitrine, o público e o texto da página da coleção.',
  },
  {
    id: 'imagens',
    number: 2,
    title: 'Imagens',
    hint: 'Três recortes da mesma campanha. A loja usa o que existir, na ordem de cada tela.',
  },
  {
    id: 'vitrine',
    number: 3,
    title: 'Vitrine',
    hint: 'Se está no ar, em que posição da loja aparece e em que ordem.',
  },
] as const;

const SECTION_ERROR_KEYS: Record<SectionId, readonly string[]> = {
  identificacao: ['name', 'targetAudience', 'description'],
  imagens: ['heroImageUrl', 'portraitImageUrl', 'squareImageUrl'],
  vitrine: ['displayOrder'],
};

export function sectionState(
  id: SectionId,
  draft: CollectionDraft,
  errors: Record<string, string>,
): SectionState {
  const keys = SECTION_ERROR_KEYS[id];
  if (Object.keys(errors).some((key) => keys.includes(key))) return 'error';

  switch (id) {
    case 'identificacao':
      return draft.name.trim() && draft.targetAudience ? 'done' : 'empty';

    case 'imagens':
      return draft.heroImageUrl.trim() || draft.portraitImageUrl.trim() || draft.squareImageUrl.trim()
        ? 'done'
        : 'empty';

    case 'vitrine':
      return draft.active || draft.displayPosition !== 'NONE' ? 'done' : 'empty';
  }
}
