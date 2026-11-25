import { cn } from '@/lib/utils';
import type {
  DatasetStatus,
  JobStatus,
  CollectionStatus,
  EmbeddingModelStatus,
} from '@/types';

type Status = DatasetStatus | JobStatus | CollectionStatus | EmbeddingModelStatus;

interface StatusBadgeProps {
  status: Status;
  label: string;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  uploaded: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  validating: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  ready: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  importing: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500 animate-pulse' },
  imported: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  error: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  queued: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  running: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500 animate-pulse' },
  completed: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  failed: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  paused: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  building: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500 animate-pulse' },
  degraded: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  available: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  recommended: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  beta: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  deprecated: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.available;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {label}
    </span>
  );
}
