import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { api, ApiError } from '@/lib/api';
import { ErrorGuidancePanel } from '@/components/ErrorGuidancePanel';
import type { EmbeddingModel } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ColumnTypeBadge } from '@/components/ColumnTypeBadge';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Search,
  Star,
  GitCompare,
  Shield,
  AlertTriangle,
  ArrowRight,
  Info,
  Clock,
  DollarSign,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildEmbeddingPreviewText,
  estimateEmbeddingCostUsd,
  estimateEmbeddingTokens,
  formatTomanCost,
  formatUsdCost,
  getModelInputPrice,
} from '@/lib/embeddingCost';

export function EmbeddingConfigPage() {
  const { t, formatNum, datasets, pageParams, navigate, toast, translateError, isRtl, refreshJobs } = useApp();
  const dataset = datasets.find((d) => d.id === pageParams.datasetId) ?? datasets.find((d) => d.status === 'imported') ?? datasets[0];
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnSearch, setColumnSearch] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [usdToToman, setUsdToToman] = useState<number | null>(null);

  useEffect(() => {
    api.getSettingsStatus()
      .then((status) => setUsdToToman(status.usd_to_toman ?? null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api.listEmbeddingModels()
      .then((models) => {
        setEmbeddingModels(models);
        if (models.length > 0) setSelectedModelId(models[0].id);
      })
      .catch((error) => toast(translateError(error), 'error'));
  }, [toast, translateError]);

  useEffect(() => {
    if (dataset?.columns?.length && selectedColumns.length === 0) {
      setSelectedColumns(dataset.columns.slice(0, Math.min(2, dataset.columns.length)).map((c) => c.name));
    }
  }, [dataset, selectedColumns.length]);

  const selectedModel = embeddingModels.find((m) => m.id === selectedModelId);
  const rowCount = dataset?.rowCount ?? 0;
  const datasetColumns = dataset?.columns ?? [];

  const estimatedTokens = useMemo(
    () => estimateEmbeddingTokens(rowCount, selectedColumns, datasetColumns, dataset?.previewRows ?? []),
    [rowCount, selectedColumns, datasetColumns, dataset?.previewRows]
  );

  const estimatedCost = useMemo(
    () => estimateEmbeddingCostUsd(estimatedTokens, selectedModel),
    [estimatedTokens, selectedModel]
  );

  const estimatedCostToman = useMemo(
    () => formatTomanCost(estimatedCost, usdToToman),
    [estimatedCost, usdToToman]
  );

  const previewText = useMemo(
    () => buildEmbeddingPreviewText(dataset?.previewRows?.[0], selectedColumns),
    [dataset?.previewRows, selectedColumns]
  );

  const estimatedStorageMB = useMemo(() => {
    const dims = selectedModel?.dimensions ?? selectedModel?.max_input_tokens ?? 1024;
    return (rowCount * dims * 4) / (1024 * 1024);
  }, [rowCount, selectedModel]);

  const filteredColumns = datasetColumns.filter((c) =>
    c.name.toLowerCase().includes(columnSearch.toLowerCase())
  );

  if (!dataset) {
    return <div className="p-6 text-sm text-muted-foreground">{t('datasets.notFound')}</div>;
  }

  const toggleColumn = (name: string) => {
    setSelectedColumns((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const selectAll = () => setSelectedColumns(dataset.columns.map((c) => c.name));
  const clearAll = () => setSelectedColumns([]);

  const handleGenerate = async () => {
    if (!selectedModelId || selectedColumns.length === 0) return;
    setLastError(null);
    try {
      const job = await api.createEmbeddingJob({
        dataset_id: dataset.id,
        model_id: selectedModelId,
        selected_columns: selectedColumns,
      });
      await refreshJobs();
      navigate('job-details', { id: job.id, jobId: job.id });
      toast(t('action.startEmbedding'), 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('common.error');
      setLastError(message);
      toast(translateError(error), 'error');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={t('embedding.title')}
        subtitle={t('embedding.subtitle')}
      />

      {lastError && <ErrorGuidancePanel message={lastError} />}

      {/* Dataset summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">{t('job.dataset')}</div>
              <div className="text-sm font-mono font-medium truncate">{dataset.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('datasets.col.rows')}</div>
              <div className="text-sm font-mono font-medium">{formatNum(dataset.rowCount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('datasets.col.columns')}</div>
              <div className="text-sm font-mono font-medium">{formatNum(dataset.columnCount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('datasets.col.status')}</div>
              <StatusBadge status={dataset.status} label={t(`status.${dataset.status}`)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Model selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{t('embedding.selectModel')}</h3>
            <Button variant="outline" size="sm" onClick={() => setShowCompare(true)}>
              <GitCompare className="h-3.5 w-3.5 me-1.5" />
              {t('action.compare')}
            </Button>
          </div>

          <RadioGroup value={selectedModelId} onValueChange={setSelectedModelId} className="space-y-2">
            {embeddingModels.map((model) => (
              <label
                key={model.id}
                htmlFor={model.id}
                className={cn(
                  'block rounded-lg border p-4 cursor-pointer transition-all',
                  selectedModelId === model.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-border hover:bg-accent/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{model.name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{model.provider}</span>
                      {model.status === 'recommended' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          <Star className="h-2.5 w-2.5" />
                          {t('action.recommended')}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        {formatNum(model.dimensions ?? model.max_input_tokens ?? 0)} {t('embedding.dimensions')}
                      </span>
                      {model.pricing?.input != null && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${model.pricing.input}/1M
                      </span>
                      )}
                      {getModelInputPrice(model) > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${getModelInputPrice(model).toFixed(3)}/1M {t('embedding.tokens')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground truncate">{model.useCase}</p>
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* RIGHT: Column selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">{t('embedding.selectColumns')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('embedding.columnsDesc')}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('preview.search')}
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className="ps-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {t('action.selectAll')}
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              {t('action.clearAll')}
            </Button>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border max-h-[400px] overflow-y-auto scrollbar-thin">
            {filteredColumns.map((col) => (
              <div
                key={col.name}
                onClick={() => toggleColumn(col.name)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent/50',
                  selectedColumns.includes(col.name) && 'bg-primary/5'
                )}
              >
                <Checkbox
                  checked={selectedColumns.includes(col.name)}
                  onCheckedChange={() => toggleColumn(col.name)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium">{col.name}</span>
                    <ColumnTypeBadge type={col.type} />
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-xs font-mono text-muted-foreground">{col.nonNullPercent}%</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{col.exampleValue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedding input preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('embedding.inputPreview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">{t('embedding.selectedColumns')}</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedColumns.map((col) => (
                  <span key={col} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-mono text-primary">
                    {col}
                  </span>
                ))}
                {selectedColumns.length === 0 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">{t('embedding.generatedInput')}</div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono leading-relaxed max-h-24 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                {previewText || '—'}
              </div>
            </div>
          </div>

          {/* Estimates */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: t('embedding.rowsToEmbed'), value: formatNum(dataset.rowCount) },
              { label: t('embedding.estimatedVectors'), value: formatNum(dataset.rowCount) },
              { label: t('embedding.estimatedTokens'), value: formatNum(estimatedTokens) },
              { label: t('embedding.dimensions'), value: formatNum(selectedModel?.dimensions ?? selectedModel?.max_input_tokens ?? 0) },
              { label: t('embedding.estimatedStorage'), value: estimatedStorageMB > 1024 ? `${(estimatedStorageMB / 1024).toFixed(1)} GB` : `${estimatedStorageMB.toFixed(0)} MB` },
              {
                label: t('embedding.estimatedCost'),
                value: formatUsdCost(estimatedCost),
                subValue: estimatedCostToman ?? undefined,
                tooltip: t('embedding.costTooltip'),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  {item.label}
                  {item.tooltip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{item.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-sm font-mono font-semibold">{item.value}</div>
                {'subValue' in item && item.subValue ? (
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{item.subValue}</div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Warnings */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('embedding.warning')}</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">{t('embedding.privacyWarning')}</p>
          </div>

          {/* CTA */}
          <Button
            onClick={() => setShowConfirm(true)}
            size="lg"
            className="w-full"
            disabled={selectedColumns.length === 0}
          >
            <Sparkles className="h-4 w-4 me-2" />
            {t('action.generateEmbeddings')}
          </Button>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('embedding.confirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {[
              { label: t('job.dataset'), value: dataset.name },
              { label: t('job.model'), value: `${selectedModel?.name ?? selectedModelId} (${selectedModel?.provider ?? 'avalai'})` },
              { label: t('job.selectedColumns'), value: selectedColumns.join(', ') },
              { label: t('embedding.rowsToEmbed'), value: formatNum(dataset.rowCount) },
              { label: t('embedding.dimensions'), value: formatNum(selectedModel?.dimensions ?? selectedModel?.max_input_tokens ?? 0) },
              { label: t('embedding.estimatedCost'), value: formatUsdCost(estimatedCost) },
              ...(estimatedCostToman ? [{ label: t('embedding.estimatedCostToman'), value: estimatedCostToman }] : []),
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono font-medium">{item.value}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleGenerate}>
              {t('action.startEmbedding')}
              <ArrowRight className={cn('h-4 w-4 ms-2', isRtl && 'rotate-180')} />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison modal */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('action.compare')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('datasets.col.model')}</TableHead>
                  <TableHead>{t('datasets.col.provider')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.dimensions')}</TableHead>
                  <TableHead className="text-end">{t('embedding.maxTokens')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.price')}</TableHead>
                  <TableHead>{t('embedding.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {embeddingModels.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs font-medium">{m.name}</TableCell>
                    <TableCell className="text-xs">{m.provider}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(m.dimensions ?? m.max_input_tokens ?? 0)}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(m.max_input_tokens ?? 0)}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{m.pricing?.input != null ? `$${m.pricing.input}/1M` : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.status ?? 'available'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
