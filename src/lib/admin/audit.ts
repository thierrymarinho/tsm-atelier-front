import type { QueryParams } from '@/lib/api/client';
import { formatBRL } from '@/lib/utils/format';
import { translateOrderStatus } from '@/lib/admin/order-status';
import { STOCK_CHANGE_REASON_LABELS } from '@/lib/admin/stock';
import {
  AUDITED_ENTITIES,
  AUDIT_ACTIONS,
  ORDER_STATUSES,
  type AuditAction,
  type AuditLogResponse,
  type AuditedEntity,
  type OrderStatus,
} from '@/lib/types/admin';

export const AUDITED_ENTITY_LABELS: Record<AuditedEntity, string> = {
  PRODUCT: 'Produto',
  PRODUCT_SKU: 'SKU',
  COLLECTION: 'Coleção',
  ORDER: 'Pedido',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATED: 'Criado',
  UPDATED: 'Editado',
  DELETED: 'Removido',
  RESTORED: 'Restaurado',
  STATUS_CHANGED: 'Status alterado',
  STOCK_ADJUSTED: 'Estoque ajustado',
  PROMOTIONAL_PRICE_CHANGED: 'Promoção alterada',
};

function money(raw: string): string {
  const value = Number(raw);
  return Number.isFinite(value) ? formatBRL(value) : raw;
}

function statusLabel(raw: string): string {
  return (ORDER_STATUSES as readonly string[]).includes(raw)
    ? translateOrderStatus(raw as OrderStatus)
    : raw;
}

export function describeAuditChange(entry: AuditLogResponse): string | null {
  const { previousValue: from, newValue: to } = entry;

  switch (entry.action) {
    case 'STOCK_ADJUSTED':
      return from !== null && to !== null ? `${from} → ${to}` : null;

    case 'STATUS_CHANGED':
      return from !== null && to !== null ? `${statusLabel(from)} → ${statusLabel(to)}` : null;

    case 'PROMOTIONAL_PRICE_CHANGED':
      if (from === null && to !== null) return `Promoção criada: ${money(to)}`;
      if (from !== null && to === null) return `Promoção retirada (era ${money(from)})`;
      if (from !== null && to !== null) return `${money(from)} → ${money(to)}`;
      return null;

    default:
      return null;
  }
}

export function describeAuditReason(entry: AuditLogResponse): string | null {
  return entry.reason ? STOCK_CHANGE_REASON_LABELS[entry.reason] : null;
}

export interface AuditFilters {
  entityType?: AuditedEntity;
  entityId?: string;
  actor?: string;
  action?: AuditAction;
  createdFrom?: string;
  createdTo?: string;
  sort: string;
  page: number;
}

export const DEFAULT_AUDIT_SORT = 'createdAt,desc';

export const AUDIT_PAGE_SIZE = 20;

export const AUDIT_SORT_OPTIONS = [
  { value: DEFAULT_AUDIT_SORT, label: 'Mais recentes' },
  { value: 'createdAt,asc', label: 'Mais antigos' },
  { value: 'actor,asc', label: 'Autor (A-Z)' },
  { value: 'action,asc', label: 'Ação (A-Z)' },
  { value: 'entityType,asc', label: 'Tipo (A-Z)' },
] as const;

const SORT_VALUES: ReadonlySet<string> = new Set(AUDIT_SORT_OPTIONS.map((o) => o.value));

const MAX_TEXT_LENGTH = 100;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(raw: string | null): string | undefined {
  if (!raw || !ISO_DATE.test(raw)) return undefined;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10) === raw ? raw : undefined;
}

export function parseAuditFilters(params: URLSearchParams): AuditFilters {
  const rawEntity = params.get('entityType')?.trim().toUpperCase();
  const entityType = (AUDITED_ENTITIES as readonly string[]).includes(rawEntity ?? '')
    ? (rawEntity as AuditedEntity)
    : undefined;

  const rawAction = params.get('action')?.trim().toUpperCase();
  const action = (AUDIT_ACTIONS as readonly string[]).includes(rawAction ?? '')
    ? (rawAction as AuditAction)
    : undefined;

  const entityId = params.get('entityId')?.trim().slice(0, MAX_TEXT_LENGTH) || undefined;
  const actor = params.get('actor')?.trim().slice(0, MAX_TEXT_LENGTH) || undefined;

  const createdFrom = parseIsoDate(params.get('createdFrom'));
  let createdTo = parseIsoDate(params.get('createdTo'));

  if (createdFrom && createdTo && createdFrom > createdTo) createdTo = undefined;

  const rawSort = params.get('sort');
  const sort = rawSort && SORT_VALUES.has(rawSort) ? rawSort : DEFAULT_AUDIT_SORT;

  const rawPage = Number(params.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 0;

  return { entityType, entityId, actor, action, createdFrom, createdTo, sort, page };
}

export function toAuditUrlParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId) params.set('entityId', filters.entityId);
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.action) params.set('action', filters.action);
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) params.set('createdTo', filters.createdTo);
  if (filters.sort !== DEFAULT_AUDIT_SORT) params.set('sort', filters.sort);
  if (filters.page > 0) params.set('page', String(filters.page));
  return params;
}

export function toAuditApiParams(filters: AuditFilters): QueryParams {
  return {
    entityType: filters.entityType,
    entityId: filters.entityId,
    actor: filters.actor,
    action: filters.action,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    sort: filters.sort,
    page: filters.page,
    size: AUDIT_PAGE_SIZE,
  };
}

export function activeAuditFilterCount(filters: AuditFilters): number {
  return [
    filters.entityType,
    filters.entityId,
    filters.actor,
    filters.action,
    filters.createdFrom,
    filters.createdTo,
  ].filter(Boolean).length;
}
