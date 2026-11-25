import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Boxes,
  Search,
  ArrowRight,
  Database,
  Cpu,
  HardDrive,
  Ruler,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CollectionsPage() {
  const { t, formatNum, collections, navigate, isRtl } = useApp();

  if (collections.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title={t('collections.title')} subtitle={t('collections.subtitle')} />
        <EmptyState
          icon={Boxes}
          title={t('collections.empty')}
          description={t('collections.emptyDesc')}
          action={
            <Button onClick={() => navigate('datasets')}>
              {t('nav.datasets')}
              <ArrowRight className={cn('h-4 w-4 ms-2', isRtl && 'rotate-180')} />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t('collections.title')} subtitle={t('collections.subtitle')} />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t('datasets.col.collection')}</TableHead>
                <TableHead>{t('datasets.col.name')}</TableHead>
                <TableHead>{t('datasets.col.model')}</TableHead>
                <TableHead className="text-end">{t('datasets.col.dimensions')}</TableHead>
                <TableHead className="text-end">{t('datasets.col.vectors')}</TableHead>
                <TableHead>{t('datasets.col.distance')}</TableHead>
                <TableHead>{t('datasets.col.status')}</TableHead>
                <TableHead>{t('datasets.col.created')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((col) => (
                <TableRow
                  key={col.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => navigate('collection-detail', { id: col.id, name: col.name })}
                >
                  <TableCell className="font-mono text-xs font-medium">{col.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{col.datasetName}</TableCell>
                  <TableCell className="text-xs font-mono">{col.modelName}</TableCell>
                  <TableCell className="text-end font-mono text-xs">{formatNum(col.dimensions)}</TableCell>
                  <TableCell className="text-end font-mono text-xs">{formatNum(col.vectorCount)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono capitalize">{col.distanceMetric}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={col.status} label={t(`status.${col.status}`)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{col.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function CollectionDetailPage() {
  const { t, formatNum, collections, pageParams, navigate, isRtl } = useApp();
  const collection = collections.find((c) => c.id === pageParams.id) ?? collections[0];

  if (!collection) return <div>{t('common.error')}</div>;

  const info = [
    { icon: Database, label: t('collections.collectionName'), value: collection.name },
    { icon: Database, label: t('job.dataset'), value: collection.datasetName },
    { icon: Cpu, label: t('collections.embeddingModel'), value: `${collection.modelName} (${collection.provider})` },
    { icon: Ruler, label: t('embedding.dimensions'), value: formatNum(collection.dimensions) },
    { icon: Boxes, label: t('collections.vectorCount'), value: formatNum(collection.vectorCount) },
    { icon: Ruler, label: t('collections.distanceMetric'), value: collection.distanceMetric },
    { icon: HardDrive, label: t('collections.storageSize'), value: collection.storageSize },
    { icon: Database, label: t('datasets.col.created'), value: collection.createdAt },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={collection.name}
        actions={
          <Button onClick={() => navigate('search', { collectionId: collection.id })}>
            <Search className="h-4 w-4 me-2" />
            {t('nav.semanticSearch')}
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={collection.status} label={t(`status.${collection.status}`)} />
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono">
          {collection.vectorDb}
        </span>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('collections.overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {info.map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <div className="text-sm font-mono font-semibold truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source columns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('collections.sourceColumns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {collection.sourceColumns.map((col) => (
                <span key={col} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-mono text-primary">
                  {col}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Indexed fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('collections.indexedFields')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {collection.indexedFields.map((field) => (
                <span key={field} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-mono">
                  {field}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata schema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('collections.metadataSchema')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t('datasets.col.name')}</TableHead>
                  <TableHead>{t('datasets.col.dataType')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collection.metadataSchema.map((field) => (
                  <TableRow key={field.field}>
                    <TableCell className="font-mono text-xs font-medium">{field.field}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{field.type}</TableCell>
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
