import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ColumnTypeBadge } from '@/components/ColumnTypeBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Sparkles,
  Search,
  FileSpreadsheet,
  Database as DatabaseIcon,
  HardDrive,
  Code2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DatasetDetailPage() {
  const { t, formatNum, datasets, pageParams, navigate, isRtl } = useApp();
  const [search, setSearch] = useState('');
  const dataset = datasets.find((d) => d.id === pageParams.id) ?? datasets[0];

  if (!dataset) {
    return <div>{t('common.error')}</div>;
  }

  const metadata = [
    { icon: DatabaseIcon, label: t('datasets.col.rows'), value: formatNum(dataset.rowCount) },
    { icon: FileSpreadsheet, label: t('datasets.col.columns'), value: formatNum(dataset.columnCount) },
    { icon: HardDrive, label: t('datasets.col.fileSize'), value: dataset.fileSize },
    { icon: Code2, label: t('upload.encoding'), value: dataset.encoding },
  { icon: Type, label: t('upload.delimiter'), value: dataset.delimiter },
  { icon: DatabaseIcon, label: t('import.table'), value: dataset.tableName ?? '—' },
  { icon: DatabaseIcon, label: t('import.database'), value: dataset.database ?? '—' },
    { icon: DatabaseIcon, label: t('import.destination'), value: dataset.destination ?? '—' },
  ];

  const filteredColumns = dataset.columns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={dataset.name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('datasets')}>
              <ArrowLeft className={cn('h-4 w-4 me-2', isRtl && 'rotate-180')} />
              {t('action.back')}
            </Button>
            {dataset.status === 'imported' && (
              <Button onClick={() => navigate('embedding-config', { datasetId: dataset.id })}>
                <Sparkles className="h-4 w-4 me-2" />
                {t('action.configureEmbedding')}
              </Button>
            )}
          </div>
        }
      />

      {/* Status + metadata */}
      <div className="flex items-center gap-3">
        <StatusBadge status={dataset.status} label={t(`status.${dataset.status}`)} />
        <span className="text-xs text-muted-foreground">{t('datasets.col.created')}: {dataset.createdAt}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{t('datasets.col.updated')}: {dataset.updatedAt}</span>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metadata.map((m, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </div>
              <div className="text-sm font-mono font-semibold truncate">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">{t('preview.title')}</TabsTrigger>
          <TabsTrigger value="columns">{t('datasets.col.columns')}</TabsTrigger>
        </TabsList>

        {/* Data preview */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('preview.firstRows')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dataset.previewRows.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">#</TableHead>
                        {Object.keys(dataset.previewRows[0]).map((key) => (
                          <TableHead key={key} className="font-mono text-xs whitespace-nowrap">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataset.previewRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                          {Object.keys(dataset.previewRows[0]).map((key) => (
                            <TableCell key={key} className="text-xs font-mono max-w-xs truncate">
                              {row[key] !== null ? String(row[key]) : '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {t('common.loading')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Column statistics */}
        <TabsContent value="columns">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('preview.columnStats')}</CardTitle>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('preview.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-9 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredColumns.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t('datasets.col.name')}</TableHead>
                        <TableHead>{t('datasets.col.dataType')}</TableHead>
                        <TableHead className="text-end">{t('datasets.col.nonNull')}</TableHead>
                        <TableHead className="text-end">{t('datasets.col.unique')}</TableHead>
                        <TableHead className="text-end">{t('datasets.col.avgLength')}</TableHead>
                        <TableHead className="text-end">{t('preview.nullValues')}</TableHead>
                        <TableHead>{t('datasets.col.example')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredColumns.map((col) => (
                        <TableRow key={col.name}>
                          <TableCell className="font-mono text-xs font-medium">{col.name}</TableCell>
                          <TableCell><ColumnTypeBadge type={col.type} /></TableCell>
                          <TableCell className="text-end font-mono text-xs">{col.nonNullPercent}%</TableCell>
                          <TableCell className="text-end font-mono text-xs">{formatNum(col.uniqueValues)}</TableCell>
                          <TableCell className="text-end font-mono text-xs">{col.avgLength}</TableCell>
                          <TableCell className="text-end font-mono text-xs text-muted-foreground">{formatNum(col.nullCount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{col.exampleValue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {t('common.loading')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
