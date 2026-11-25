import type { ColumnMetadata, DatasetRow, EmbeddingModel } from '@/types';

const CHARS_PER_TOKEN = 4;
const COLUMN_SEPARATOR_OVERHEAD = 1;

export function estimateColumnAvgLength(
  column: ColumnMetadata,
  previewRows: DatasetRow[]
): number {
  const fromPreview = previewRows
    .map((row) => String(row[column.name] ?? '').trim().length)
    .filter((length) => length > 0);
  if (fromPreview.length > 0) {
    return fromPreview.reduce((sum, length) => sum + length, 0) / fromPreview.length;
  }
  return column.avgLength > 0 ? column.avgLength : 20;
}

export function buildEmbeddingPreviewText(
  row: DatasetRow | undefined,
  selectedColumns: string[]
): string {
  if (!row || selectedColumns.length === 0) return '';
  const parts = selectedColumns
    .map((column) => String(row[column] ?? '').trim())
    .filter(Boolean);
  return parts.join('\n');
}

export function estimateEmbeddingTokens(
  rowCount: number,
  selectedColumns: string[],
  columns: ColumnMetadata[],
  previewRows: DatasetRow[]
): number {
  if (rowCount <= 0 || selectedColumns.length === 0) return 0;

  const avgCharsPerRow = selectedColumns.reduce((sum, columnName) => {
    const column = columns.find((item) => item.name === columnName);
    const avgLength = column ? estimateColumnAvgLength(column, previewRows) : 20;
    return sum + avgLength + COLUMN_SEPARATOR_OVERHEAD;
  }, 0);

  const tokensPerRow = Math.max(1, Math.ceil(avgCharsPerRow / CHARS_PER_TOKEN));
  return Math.round(rowCount * tokensPerRow);
}

export function getModelInputPrice(model: EmbeddingModel | undefined): number {
  if (!model) return 0;
  return model.pricing?.input ?? model.pricePerMillion ?? 0;
}

export function estimateEmbeddingCostUsd(
  estimatedTokens: number,
  model: EmbeddingModel | undefined
): number {
  const pricePerMillion = getModelInputPrice(model);
  if (!pricePerMillion || estimatedTokens <= 0) return 0;
  return (estimatedTokens / 1_000_000) * pricePerMillion;
}

export function formatUsdCost(costUsd: number): string {
  if (costUsd <= 0) return '$0.00';
  if (costUsd < 0.01) return `$${costUsd.toFixed(4)}`;
  return `$${costUsd.toFixed(2)}`;
}

export function formatTomanCost(costUsd: number, usdToToman: number | null | undefined): string | null {
  if (!usdToToman || usdToToman <= 0 || costUsd <= 0) return null;
  const toman = Math.round(costUsd * usdToToman);
  return `${toman.toLocaleString('en-US')} تومان`;
}
