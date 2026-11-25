import { cn } from '@/lib/utils';
import type { ColumnType } from '@/types';

const typeConfig: Record<ColumnType, { label: string; className: string }> = {
  string: { label: 'string', className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' },
  text: { label: 'text', className: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400' },
  integer: { label: 'integer', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
  float: { label: 'float', className: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400' },
  boolean: { label: 'boolean', className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' },
  datetime: { label: 'datetime', className: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400' },
  time: { label: 'time', className: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400' },
};

export function ColumnTypeBadge({ type }: { type: ColumnType }) {
  const config = typeConfig[type] ?? typeConfig.string;
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium', config.className)}>
      {config.label}
    </span>
  );
}
