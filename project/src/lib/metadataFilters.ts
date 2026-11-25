import type { ColumnType } from '@/types';

export type FilterDataType = 'string' | 'text' | 'number' | 'boolean' | 'datetime' | 'time';

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'starts_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

export interface MetadataFilterField {
  field: string;
  type: ColumnType | string;
  exampleValue?: string;
}

export interface MetadataFilterCondition {
  field: string;
  operator: FilterOperator;
  value: string;
  fieldType?: FilterDataType;
}

const STRING_OPERATORS: FilterOperator[] = ['eq', 'ne', 'contains', 'starts_with', 'is_empty', 'is_not_empty'];
const NUMBER_OPERATORS: FilterOperator[] = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];
const BOOLEAN_OPERATORS: FilterOperator[] = ['eq'];
const DATETIME_OPERATORS: FilterOperator[] = ['eq', 'gt', 'gte', 'lt', 'lte'];
const TIME_OPERATORS: FilterOperator[] = ['eq', 'gt', 'gte', 'lt', 'lte'];

export function normalizeFilterDataType(type: string): FilterDataType {
  switch (type) {
    case 'integer':
    case 'float':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'datetime':
      return 'datetime';
    case 'time':
      return 'time';
    case 'text':
      return 'text';
    default:
      return 'string';
  }
}

export function getOperatorsForType(type: string): FilterOperator[] {
  switch (normalizeFilterDataType(type)) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'boolean':
      return BOOLEAN_OPERATORS;
    case 'datetime':
      return DATETIME_OPERATORS;
    case 'time':
      return TIME_OPERATORS;
    case 'text':
    case 'string':
    default:
      return STRING_OPERATORS;
  }
}

export function getDefaultOperator(type: string): FilterOperator {
  return getOperatorsForType(type)[0] ?? 'eq';
}

export function operatorNeedsValue(operator: FilterOperator): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty';
}

export function getOperatorLabelKey(dataType: FilterDataType, operator: FilterOperator): string {
  if (dataType === 'datetime') {
    if (operator === 'eq') return 'search.operator.onDate';
    if (operator === 'gt') return 'search.operator.afterDate';
    if (operator === 'gte') return 'search.operator.onOrAfterDate';
    if (operator === 'lt') return 'search.operator.beforeDate';
    if (operator === 'lte') return 'search.operator.onOrBeforeDate';
  }
  if (dataType === 'time') {
    if (operator === 'eq') return 'search.operator.atTime';
    if (operator === 'gt') return 'search.operator.afterTime';
    if (operator === 'gte') return 'search.operator.atOrAfterTime';
    if (operator === 'lt') return 'search.operator.beforeTime';
    if (operator === 'lte') return 'search.operator.atOrBeforeTime';
  }
  return `search.operator.${operator}`;
}

export function getFilterFieldsFromCollection(
  metadataSchema: { field: string; type: string }[] | undefined,
  datasetColumns: { name: string; type: ColumnType | string; exampleValue?: string }[] | undefined
): MetadataFilterField[] {
  if (datasetColumns?.length) {
    return datasetColumns.map((column) => ({
      field: column.name,
      type: column.type,
      exampleValue: column.exampleValue,
    }));
  }
  if (metadataSchema?.length) {
    return metadataSchema.map((item) => ({
      field: item.field,
      type: item.type,
    }));
  }
  return [];
}

export function formatFilterLabel(
  condition: MetadataFilterCondition,
  t: (key: string) => string
): string {
  const dataType = normalizeFilterDataType(condition.fieldType ?? 'string');
  const opLabel = t(getOperatorLabelKey(dataType, condition.operator));
  if (!operatorNeedsValue(condition.operator)) {
    return `${condition.field} ${opLabel}`;
  }
  return `${condition.field} ${opLabel} ${condition.value}`;
}

export function datetimeHasTimeComponent(exampleValue?: string): boolean {
  if (!exampleValue) return false;
  return /T\d{2}:\d{2}/.test(exampleValue) || /\d{2}:\d{2}:\d{2}/.test(exampleValue);
}

export function parseFilterDate(value: string): Date | undefined {
  if (!value) return undefined;
  const datePart = value.split('T')[0];
  const parsed = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseFilterTime(value: string): string {
  if (!value) return '';
  const timeMatch = value.match(/T(\d{2}:\d{2}(?::\d{2})?)/);
  if (timeMatch) return timeMatch[1].slice(0, 5);
  const plainTime = value.match(/^(\d{2}:\d{2}(?::\d{2})?)$/);
  return plainTime ? plainTime[1].slice(0, 5) : '';
}

export function buildDatetimeFilterValue(date: Date | undefined, time: string, includeTime: boolean): string {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  if (includeTime && time) return `${dateStr}T${time}:00`;
  return dateStr;
}
