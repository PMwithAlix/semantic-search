import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Boxes, RotateCcw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmbeddingJob } from '@/types';
import { api } from '@/lib/api';
import { ErrorGuidancePanel } from '@/components/ErrorGuidancePanel';

export function JobDetailsPage() {
  const { t, formatNum, pageParams, navigate, toast, translateError, isRtl, refreshAll } = useApp();
  const jobId = pageParams.id ?? pageParams.jobId;
  const [job, setJob] = useState<EmbeddingJob | null>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const data = await api.getJob(jobId);
        if (!active) return;
        setJob(data);
        if (data.status === 'completed' || data.status === 'failed') {
          if (interval) clearInterval(interval);
          await refreshAll();
        }
      } catch (error) {
        toast(translateError(error), 'error');
      }
    };

    poll();
    interval = setInterval(poll, 2000);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [jobId, refreshAll, toast, translateError]);

  if (!job) {
    return <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  const isActive = job.status === 'running' || job.status === 'queued';
  const canResume =
    job.status === 'failed' && job.type === 'embedding' && job.rowsSuccessful > 0;

  const handleResume = async () => {
    if (!jobId || !canResume) return;
    setResuming(true);
    try {
      const updated = await api.resumeJob(jobId);
      setJob(updated);
      await refreshAll();
      toast(t('job.resumeStarted'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    } finally {
      setResuming(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={t('job.details')}
        actions={
          <Button variant="outline" onClick={() => navigate('jobs')}>
            <ArrowLeft className={cn('h-4 w-4 me-2', isRtl && 'rotate-180')} />
            {t('action.back')}
          </Button>
        }
      />

      {isActive && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {t('jobs.runningHint')}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {job.datasetName}
            <StatusBadge status={job.status} label={t(`status.${job.status}`)} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={job.progress} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">{t('job.progress')}</div><div className="font-mono">{job.progress.toFixed(1)}%</div></div>
            <div><div className="text-xs text-muted-foreground">{t('job.processed')}</div><div className="font-mono">{formatNum(job.rowsProcessed)} / {formatNum(job.rowsTotal)}</div></div>
            <div><div className="text-xs text-muted-foreground">{t('job.successful')}</div><div className="font-mono">{formatNum(job.rowsSuccessful)}</div></div>
            <div><div className="text-xs text-muted-foreground">{t('job.failed')}</div><div className="font-mono">{formatNum(job.rowsFailed)}</div></div>
          </div>
          {job.estimatedRemainingSeconds != null && job.estimatedRemainingSeconds > 0 && isActive && (
            <div className="text-xs text-muted-foreground font-mono">
              {t('jobs.remaining')}: ~{formatNum(job.estimatedRemainingSeconds)}s
            </div>
          )}
          {job.errorMessage && (
            <ErrorGuidancePanel message={job.errorMessage}>
              {canResume && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {formatNum(job.rowsSuccessful)} / {formatNum(job.rowsTotal)} {t('job.processed')}
                  </p>
                  <Button onClick={handleResume} disabled={resuming} size="sm">
                    <RotateCcw className={cn('h-4 w-4 me-2', resuming && 'animate-spin')} />
                    {resuming ? t('job.resuming') : t('job.resume')}
                  </Button>
                </div>
              )}
            </ErrorGuidancePanel>
          )}
          {job.status === 'completed' && job.type === 'embedding' && job.vectorCollectionId && (
            <div className="flex gap-2">
              <Button onClick={() => navigate('collections')}><Boxes className="h-4 w-4 me-2" />{t('nav.vectorCollections')}</Button>
              <Button variant="outline" onClick={() => navigate('search', { collectionId: job.vectorCollectionId! })}><Search className="h-4 w-4 me-2" />{t('nav.semanticSearch')}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
