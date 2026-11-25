import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Rows3,
  Sparkles,
  Boxes,
  ListChecks,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function OverviewPage() {
  const { t, formatNum, datasets, jobs, collections, navigate, isRtl } = useApp();

  const totalRows = datasets.reduce((s, d) => s + d.rowCount, 0);
  const embeddedRows = collections.reduce((s, c) => s + c.vectorCount, 0);
  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  const kpis = [
    { labelKey: 'overview.totalDatasets', value: formatNum(datasets.length), icon: Database, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { labelKey: 'overview.totalRows', value: formatNum(totalRows), icon: Rows3, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { labelKey: 'overview.embeddedRows', value: formatNum(embeddedRows), icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    { labelKey: 'overview.vectorCollections', value: formatNum(collections.length), icon: Boxes, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { labelKey: 'overview.activeJobs', value: formatNum(activeJobs), icon: ListChecks, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t('overview.title')} subtitle={t('overview.subtitle')} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.labelKey} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', kpi.bg)}>
                  <kpi.icon className={cn('h-4.5 w-4.5', kpi.color)} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t(kpi.labelKey)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Datasets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">{t('overview.recentDatasets')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('datasets')}>
            {t('overview.viewAll')}
            <ArrowRight className={cn('h-3.5 w-3.5 ms-1', isRtl && 'rotate-180')} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('datasets.col.name')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.rows')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.columns')}</TableHead>
                  <TableHead>{t('datasets.col.status')}</TableHead>
                  <TableHead>{t('datasets.col.created')}</TableHead>
                  <TableHead>{t('datasets.col.embedding')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.slice(0, 5).map((ds) => (
                  <TableRow
                    key={ds.id}
                    className="cursor-pointer"
                    onClick={() => navigate('dataset-detail', { id: ds.id, name: ds.name })}
                  >
                    <TableCell className="font-medium font-mono text-xs">{ds.name}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(ds.rowCount)}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(ds.columnCount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={ds.status} label={t(`status.${ds.status}`)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ds.createdAt}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{ds.embeddingModel ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">{t('overview.recentJobs')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('jobs')}>
            {t('overview.viewAll')}
            <ArrowRight className={cn('h-3.5 w-3.5 ms-1', isRtl && 'rotate-180')} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('datasets.col.jobId')}</TableHead>
                  <TableHead>{t('datasets.col.name')}</TableHead>
                  <TableHead>{t('datasets.col.model')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.rows')}</TableHead>
                  <TableHead className="w-32">{t('datasets.col.progress')}</TableHead>
                  <TableHead>{t('datasets.col.status')}</TableHead>
                  <TableHead>{t('datasets.col.duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 5).map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => navigate('job-details', { id: job.id, jobId: job.id })}
                  >
                    <TableCell className="font-mono text-xs">{job.id}</TableCell>
                    <TableCell className="font-medium text-xs">{job.datasetName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{job.modelName || '—'}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(job.rowsTotal)}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
