import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Dataset, EmbeddingJob, VectorCollection } from '@/types';
import { translations } from '@/i18n/translations';
import { ThemeProvider } from 'next-themes';
import { api, ApiError } from '@/lib/api';
import { resolveErrorGuidance, translateErrorMessage } from '@/lib/errorGuidance';

type Page =
  | 'overview'
  | 'datasets'
  | 'upload'
  | 'dataset-detail'
  | 'import'
  | 'embedding-config'
  | 'job-details'
  | 'collections'
  | 'collection-detail'
  | 'search'
  | 'jobs'
  | 'settings';

interface AppContextValue {
  page: Page;
  pageParams: Record<string, string>;
  navigate: (page: Page, params?: Record<string, string>) => void;
  lang: 'en' | 'fa';
  setLang: (l: 'en' | 'fa') => void;
  t: (key: string) => string;
  isRtl: boolean;
  formatNum: (n: number) => string;
  datasets: Dataset[];
  jobs: EmbeddingJob[];
  collections: VectorCollection[];
  refreshDatasets: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshCollections: () => Promise<void>;
  refreshAll: () => Promise<void>;
  loading: boolean;
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  translateError: (error: unknown) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>('overview');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [lang, setLangState] = useState<'en' | 'fa'>('fa');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<EmbeddingJob[]>([]);
  const [collections, setCollections] = useState<VectorCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const isRtl = lang === 'fa';

  const navigate = useCallback((p: Page, params: Record<string, string> = {}) => {
    setPage(p);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setLang = useCallback((l: 'en' | 'fa') => {
    setLangState(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [lang, isRtl]);

  const t = useCallback(
    (key: string): string => translations[lang][key] ?? key,
    [lang]
  );

  const formatNum = useCallback(
    (n: number): string => {
      const formatted = n.toLocaleString('en-US');
      if (lang === 'fa') {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return formatted.replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
      }
      return formatted;
    },
    [lang]
  );

  const toast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type } }));
  }, []);

  const translateError = useCallback(
    (error: unknown): string => {
      const message = error instanceof ApiError ? error.message : t('common.error');
      const guidance = resolveErrorGuidance(message);
      return `${t(guidance.titleKey)}: ${translateErrorMessage(message, lang)}`;
    },
    [lang, t]
  );

  const refreshDatasets = useCallback(async () => {
    setDatasets(await api.listDatasets());
  }, []);

  const refreshJobs = useCallback(async () => {
    setJobs(await api.listJobs());
  }, []);

  const refreshCollections = useCallback(async () => {
    setCollections(await api.listCollections());
  }, []);

  const refreshAll = useCallback(async () => {
    const [datasetData, jobData, collectionData] = await Promise.all([
      api.listDatasets(),
      api.listJobs(),
      api.listCollections(),
    ]);
    setDatasets(datasetData);
    setJobs(jobData);
    setCollections(collectionData);
  }, []);

  useEffect(() => {
    refreshAll()
      .catch((error) => toast(translateError(error), 'error'))
      .finally(() => setLoading(false));
  }, [refreshAll, toast, translateError]);

  const activeJobCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;
  const prevActiveCount = useRef(0);

  useEffect(() => {
    if (activeJobCount === 0) return undefined;

    const interval = setInterval(() => {
      refreshJobs().catch((error) => toast(translateError(error), 'error'));
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobCount > 0, refreshJobs, toast, translateError]);

  useEffect(() => {
    if (prevActiveCount.current > 0 && activeJobCount === 0) {
      refreshAll().catch((error) => toast(translateError(error), 'error'));
    }
    prevActiveCount.current = activeJobCount;
  }, [activeJobCount, refreshAll, toast, translateError]);

  const value: AppContextValue = {
    page,
    pageParams,
    navigate,
    lang,
    setLang,
    t,
    isRtl,
    formatNum,
    datasets,
    jobs,
    collections,
    refreshDatasets,
    refreshJobs,
    refreshCollections,
    refreshAll,
    loading,
    toast,
    translateError,
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </ThemeProvider>
  );
}
