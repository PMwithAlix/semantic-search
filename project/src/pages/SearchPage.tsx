import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { SearchResultsMap } from '@/components/SearchResultsMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Gauge,
  Clock,
  Zap,
  Database,
  Cpu,
  ChevronRight,
  List,
  Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getDestinationCountry,
  getOtherPartyNumber,
  getResultSubtitle,
  getResultTitle,
  getRowField,
  getTerminalCountry,
} from '@/lib/searchResultDisplay';
import {
  type FilterOperator,
  formatFilterLabel,
  getDefaultOperator,
  getFilterFieldsFromCollection,
  normalizeFilterDataType,
  operatorNeedsValue,
} from '@/lib/metadataFilters';
import { inferQueryIntent } from '@/lib/queryFilterInference';
import type { SearchEvaluation, SearchIntent, SearchResult } from '@/types';
import { api, ApiError } from '@/lib/api';
import { ErrorGuidancePanel } from '@/components/ErrorGuidancePanel';
import { SearchMetadataFilter } from '@/components/SearchMetadataFilter';

function ResultCard({
  result,
  onSelect,
  isRtl,
  t,
}: {
  result: SearchResult;
  onSelect: () => void;
  isRtl: boolean;
  t: (key: string) => string;
}) {
  const title = getResultTitle(result.row);
  const subtitle = getResultSubtitle(result.row, result.embeddingText);
  const terminalCountry = getTerminalCountry(result.row);
  const destinationCountry = getDestinationCountry(result.row);
  const otherPartyNumber = getOtherPartyNumber(result.row);
  const cause = getRowField(result.row, 'EstablishmentCause');

  return (
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary shrink-0">
            #{result.rank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-1 truncate font-mono">{title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{subtitle}</p>
            {(cause || terminalCountry || destinationCountry || otherPartyNumber) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cause ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono">{cause}</span>
                ) : null}
                {destinationCountry ? (
                  <span className="rounded-md bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-mono">
                    {t('search.badge.destination')}: {destinationCountry}
                  </span>
                ) : null}
                {terminalCountry ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                    {t('search.badge.origin')}: {terminalCountry}
                  </span>
                ) : null}
                {otherPartyNumber ? (
                  <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono truncate max-w-[140px]">
                    {otherPartyNumber}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-bold font-mono">{result.score.toFixed(2)}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${result.score * 100}%` }} />
            </div>
          </div>
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0 mt-2', isRtl && 'rotate-180')} />
        </div>
      </CardContent>
    </Card>
  );
}

export function SearchPage() {
  const { t, formatNum, collections, datasets, pageParams, isRtl, toast, translateError } = useApp();
  const [collectionId, setCollectionId] = useState(pageParams.collectionId ?? collections[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(10);
  const [threshold, setThreshold] = useState(0.35);
  const [filterField, setFilterField] = useState('');
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('eq');
  const [filterValue, setFilterValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [evaluation, setEvaluation] = useState<SearchEvaluation | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [viewTab, setViewTab] = useState<'list' | 'map'>('list');
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const selectedCollection = collections.find((c) => c.id === collectionId);
  const selectedDataset = datasets.find((d) => d.id === selectedCollection?.datasetId);
  const filterFields = useMemo(
    () =>
      getFilterFieldsFromCollection(
        selectedCollection?.metadataSchema,
        selectedDataset?.columns
      ),
    [selectedCollection?.metadataSchema, selectedDataset?.columns]
  );
  useEffect(() => {
    setFilterField('');
    setFilterOperator('eq');
    setFilterValue('');
  }, [collectionId]);

  const suggestedIntent = useMemo(
    () => (query.trim() && !filterField ? inferQueryIntent(query) : null),
    [query, filterField]
  );

  const handleSearch = async () => {
    if (!query.trim() || !collectionId) return;
    setSearching(true);
    setHasSearched(true);
    setSearchError(null);
    try {
      const hasFilter =
        filterField.trim() &&
        (operatorNeedsValue(filterOperator) ? filterValue.trim() : true);
      const metadata_filters = hasFilter
        ? [
            {
              field: filterField.trim(),
              operator: filterOperator,
              value: filterValue.trim(),
              field_type: normalizeFilterDataType(
                filterFields.find((item) => item.field === filterField)?.type ?? 'string'
              ),
            },
          ]
        : undefined;

      const response = await api.search({
        collection_id: collectionId,
        query: query.trim(),
        top_k: topK,
        threshold,
        metadata_filters,
      });
      setResults(response.results);
      setEvaluation(response.evaluation);
      setSearchIntent(response.intent ?? null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('common.error');
      setSearchError(message);
      toast(translateError(error), 'error');
      setResults([]);
      setEvaluation(null);
      setSearchIntent(null);
    } finally {
      setSearching(false);
    }
  };

  const formatFilters = (filters: Record<string, string>) =>
    Object.entries(filters)
      .map(([field, value]) => formatFilterLabel({ field, operator: 'eq', value }, t))
      .join(' · ');

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.score - a.score),
    [results]
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t('search.title')} subtitle={t('search.subtitle')} />

      {searchError && <ErrorGuidancePanel message={searchError} />}

      {selectedCollection?.sourceColumns?.includes('CommonKey') && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {t('search.collectionWarning')}
        </div>
      )}

      {searchIntent?.strictFilterApplied && Object.keys(searchIntent.appliedFilters).length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {t('search.autoFilterApplied')}:{' '}
          <span className="font-mono font-medium">{formatFilters(searchIntent.appliedFilters)}</span>
          {searchIntent.filterMatchCount > 0 && (
            <span className="text-muted-foreground ms-2">
              ({formatNum(searchIntent.filterMatchCount)} {t('search.filterMatchCount')})
            </span>
          )}
        </div>
      )}

      {suggestedIntent?.strict && !filterField && !searchIntent?.strictFilterApplied && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm flex flex-wrap items-center gap-2">
          <span>{t('search.autoFilterHint')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs font-mono"
            onClick={() => {
              const [field, value] = Object.entries(suggestedIntent.filters)[0] ?? [];
              if (field && value) {
                const fieldMeta = filterFields.find((item) => item.field === field);
                setFilterField(field);
                setFilterOperator(getDefaultOperator(fieldMeta?.type ?? 'string'));
                setFilterValue(value);
              }
            }}
          >
            {formatFilters(suggestedIntent.filters)}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger className="md:w-64 shrink-0">
                <SelectValue placeholder={t('search.selectCollection')} />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <SearchIcon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="ps-9 h-10 text-sm"
              />
            </div>
            <Button onClick={handleSearch} size="lg" disabled={!query.trim() || !collectionId || searching}>
              <SearchIcon className="h-4 w-4 me-2" />
              {t('search.button')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t('search.filters')}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">{t('search.topK')}</label>
              <Select value={String(topK)} onValueChange={(v) => setTopK(Number(v))}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((k) => (
                    <SelectItem key={k} value={String(k)}>{formatNum(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-xs">
              <label className="text-xs text-muted-foreground whitespace-nowrap">{t('search.similarityThreshold')}</label>
              <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={0} max={1} step={0.05} className="flex-1" />
              <span className="text-xs font-mono w-8 text-end">{threshold.toFixed(2)}</span>
            </div>
          </div>

          <SearchMetadataFilter
            fields={filterFields}
            field={filterField}
            operator={filterOperator}
            value={filterValue}
            onFieldChange={setFilterField}
            onOperatorChange={setFilterOperator}
            onValueChange={setFilterValue}
            t={t}
            isRtl={isRtl}
          />
        </CardContent>
      </Card>

      {evaluation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              {t('search.evaluation')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { icon: Zap, label: t('search.queryEmbeddingTime'), value: `${evaluation.queryEmbeddingMs} ms` },
                { icon: Clock, label: t('search.vectorSearchTime'), value: `${evaluation.vectorSearchMs} ms` },
                { icon: Gauge, label: t('search.totalTime'), value: `${evaluation.totalMs} ms` },
                { icon: Cpu, label: t('search.modelUsed'), value: evaluation.modelUsed },
                { icon: Database, label: t('search.collectionUsed'), value: evaluation.collectionUsed },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3">
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
      )}

      {searching ? (
        <div className="flex flex-col items-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : hasSearched && sortedResults.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={
            searchIntent?.strictFilterApplied && searchIntent.filterMatchCount === 0
              ? t('search.noResultsFiltered')
              : t('search.noResults')
          }
          description={
            searchIntent?.strictFilterApplied && searchIntent.filterMatchCount === 0
              ? `${t('search.noResultsFilteredDesc')} (${formatFilters(searchIntent.appliedFilters)})`
              : t('search.noResultsDesc')
          }
        />
      ) : sortedResults.length > 0 ? (
        <div className="space-y-4">
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'list' | 'map')}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {formatNum(sortedResults.length)} {t('search.results')}
              </span>
              <TabsList>
                <TabsTrigger value="list" className="gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  {t('search.viewList')}
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-1.5">
                  <Map className="h-3.5 w-3.5" />
                  {t('search.viewMap')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="space-y-2 mt-4">
              {sortedResults.map((result) => (
                <ResultCard
                  key={`${result.rank}-${getResultTitle(result.row)}`}
                  result={result}
                  onSelect={() => setSelectedResult(result)}
                  isRtl={isRtl}
                  t={t}
                />
              ))}
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <SearchResultsMap
                results={sortedResults}
                onSelect={setSelectedResult}
                coverageLabel={t('search.mapCoverage')}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      <Sheet open={!!selectedResult} onOpenChange={(o) => !o && setSelectedResult(null)}>
        <SheetContent side={isRtl ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto scrollbar-thin">
          {selectedResult && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-sm">{getResultTitle(selectedResult.row)}</SheetTitle>
                <SheetDescription>{t('datasets.col.score')}: {selectedResult.score.toFixed(4)}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {(getDestinationCountry(selectedResult.row) || getTerminalCountry(selectedResult.row)) && (
                  <div className="flex flex-wrap gap-2">
                    {getDestinationCountry(selectedResult.row) ? (
                      <span className="rounded-md bg-primary/15 text-primary px-2 py-1 text-xs font-mono">
                        {t('search.badge.destination')}: {getDestinationCountry(selectedResult.row)}
                      </span>
                    ) : null}
                    {getTerminalCountry(selectedResult.row) ? (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono">
                        {t('search.badge.origin')}: {getTerminalCountry(selectedResult.row)}
                      </span>
                    ) : null}
                    {getOtherPartyNumber(selectedResult.row) ? (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono">
                        {getOtherPartyNumber(selectedResult.row)}
                      </span>
                    ) : null}
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">{t('search.storyExcerpt')}</div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                    {getResultSubtitle(selectedResult.row, selectedResult.embeddingText)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">{t('embedding.generatedInput')}</div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono leading-relaxed max-h-40 overflow-y-auto scrollbar-thin">
                    {selectedResult.embeddingText}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">Metadata</div>
                  <div className="rounded-md border border-border p-3 space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
                    {Object.entries(selectedResult.row).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground font-mono">{k}</span>
                        <span className="font-mono text-end break-all">{String(v ?? '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
