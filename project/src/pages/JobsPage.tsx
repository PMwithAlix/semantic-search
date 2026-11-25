import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListChecks, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { JobType } from '@/types';
import { cn } from '@/lib/utils';

export function JobsPage() {
  const { t, formatNum, jobs, navigate, toast, translateError, refreshAll } = useApp();
  const [tab, setTab] = useState<'all' | JobType>('all');
  const [resumingId, setResumingId] = useState<string | null>(null);

  const handleResume = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResumingId(jobId);
    try {
      await api.resumeJob(jobId);
      await refreshAll();
      toast(t('job.resumeStarted'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    } finally {
      setResumingId(null);
    }
  };

  const filtered = tab === 'all' ? jobs : jobs.filter((j) => j.type === tab);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t('jobs.title')} subtitle={t('jobs.subtitle')} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | JobType)}>
        <TabsList>
          <TabsTrigger value="all">{t('jobs.tab.all')}</TabsTrigger>
          <TabsTrigger value="embedding">{t('jobs.tab.embedding')}</TabsTrigger>
          <TabsTrigger value="import">{t('jobs.tab.import')}</TabsTrigger>
          <TabsTrigger value="search">{t('jobs.tab.search')}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={t('jobs.empty')}
              description=""
            />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t('datasets.col.jobId')}</TableHead>
                      <TableHead>{t('datasets.col.type')}</TableHead>
                      <TableHead>{t('datasets.col.name')}</TableHead>
                      <TableHead>{t('datasets.col.model')}</TableHead>
                      <TableHead className="w-32">{t('datasets.col.progress')}</TableHead>
                      <TableHead>{t('datasets.col.status')}</TableHead>
                      <TableHead>{t('datasets.col.duration')}</TableHead>
                      <TableHead>{t('datasets.col.created')}</TableHead>
                      <TableHead className="w-24">{t('datasets.col.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate('job-details', { id: job.id, jobId: job.id })}
                      >
                        <TableCell className="font-mono text-xs">{job.id}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs capitalize">
                            {job.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{job.datasetName}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{job.modelName || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={job.progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-mono w-8 text-end">{job.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} label={t(`status.${job.status}`)} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{job.duration}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{job.startedAt.split('T')[0]}</TableCell>
                        <TableCell>
                          {job.status === 'failed' && job.type === 'embedding' && job.rowsSuccessful > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={resumingId === job.id}
                              onClick={(e) => handleResume(job.id, e)}
                            >
                              <RotateCcw className={cn('h-3 w-3 me-1', resumingId === job.id && 'animate-spin')} />
                              {t('job.resume')}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
