import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function ImportPage() {
  const { t, formatNum, datasets, pageParams, navigate, toast, translateError, refreshAll, isRtl } = useApp();
  const dataset = datasets.find((d) => d.id === pageParams.id);
  const jobId = pageParams.jobId;
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('running');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const poll = async () => {
      try {
        const job = await api.getJob(jobId);
        if (!active) return;
        setProgress(job.progress);
        setStatus(job.status);
        if (job.status === 'completed') {
          setDone(true);
          await refreshAll();
          toast(t('import.success'), 'success');
        } else if (job.status === 'failed') {
          toast(job.errorMessage ?? t('common.error'), 'error');
        }
      } catch (error) {
        toast(translateError(error), 'error');
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId, refreshAll, t, toast, translateError]);

  if (!dataset) {
    return <div className="p-6 text-sm text-muted-foreground">{t('datasets.notFound')}</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={t('import.title')}
        actions={
          <Button variant="outline" onClick={() => navigate('datasets')}>
            <ArrowLeft className={cn('h-4 w-4 me-2', isRtl && 'rotate-180')} />
            {t('action.back')}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">{t('job.dataset')}</div><div className="font-mono">{dataset.name}</div></div>
            <div><div className="text-xs text-muted-foreground">{t('datasets.col.rows')}</div><div className="font-mono">{formatNum(dataset.rowCount)}</div></div>
            <div><div className="text-xs text-muted-foreground">{t('datasets.col.status')}</div><div className="font-mono">{status}</div></div>
            <div><div className="text-xs text-muted-foreground">{t('job.progress')}</div><div className="font-mono">{progress.toFixed(0)}%</div></div>
          </div>
          <Progress value={progress} />
          {done && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              {t('import.success')}
              <Button size="sm" className="ms-auto" onClick={() => navigate('embedding-config', { datasetId: dataset.id })}>
                {t('action.configureEmbedding')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
