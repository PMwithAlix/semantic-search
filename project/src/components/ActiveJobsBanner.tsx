import { Loader2, ChevronRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function ActiveJobsBanner() {
  const { t, formatNum, jobs, navigate, isRtl } = useApp();

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  if (activeJobs.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {t('jobs.activeBannerTitle')} ({formatNum(activeJobs.length)})
      </div>
      {activeJobs.map((job) => (
        <button
          key={job.id}
          type="button"
          onClick={() => navigate('job-details', { id: job.id, jobId: job.id })}
          className="w-full rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-start hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-sm font-medium truncate">{job.datasetName}</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono capitalize">
                  {job.type}
                </span>
                <span className="rounded-md bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-mono">
                  {t(`status.${job.status}`)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={job.progress} className="h-1.5 flex-1" />
                <span className="text-xs font-mono shrink-0 w-10 text-end">{job.progress.toFixed(0)}%</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                {formatNum(job.rowsProcessed)} / {formatNum(job.rowsTotal)} {t('job.processed')}
                {job.estimatedRemainingSeconds != null && job.estimatedRemainingSeconds > 0 && (
                  <span className="ms-2">
                    · ~{formatNum(job.estimatedRemainingSeconds)}s {t('jobs.remaining')}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground', isRtl && 'rotate-180')} />
          </div>
        </button>
      ))}
    </div>
  );
}
