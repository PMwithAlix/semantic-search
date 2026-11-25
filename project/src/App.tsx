import { AppProvider, useApp } from '@/store/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { OverviewPage } from '@/pages/OverviewPage';
import { DatasetsPage } from '@/pages/DatasetsPage';
import { UploadPage } from '@/pages/UploadPage';
import { DatasetDetailPage } from '@/pages/DatasetDetailPage';
import { ImportPage } from '@/pages/ImportPage';
import { EmbeddingConfigPage } from '@/pages/EmbeddingConfigPage';
import { JobDetailsPage } from '@/pages/JobDetailsPage';
import { CollectionsPage, CollectionDetailPage } from '@/pages/CollectionsPage';
import { SearchPage } from '@/pages/SearchPage';
import { JobsPage } from '@/pages/JobsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toaster } from '@/components/ui/sonner';
import { useEffect, useState } from 'react';
import { toast as sonnerToast } from 'sonner';

function ToastListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.type === 'error') {
        sonnerToast.error(detail.msg);
      } else if (detail.type === 'info') {
        sonnerToast.info(detail.msg);
      } else {
        sonnerToast.success(detail.msg);
      }
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);
  return null;
}

function PageRouter() {
  const { page } = useApp();

  switch (page) {
    case 'overview':
      return <OverviewPage />;
    case 'datasets':
      return <DatasetsPage />;
    case 'upload':
      return <UploadPage />;
    case 'dataset-detail':
      return <DatasetDetailPage />;
    case 'import':
      return <ImportPage />;
    case 'embedding-config':
      return <EmbeddingConfigPage />;
    case 'job-details':
      return <JobDetailsPage />;
    case 'collections':
      return <CollectionsPage />;
    case 'collection-detail':
      return <CollectionDetailPage />;
    case 'search':
      return <SearchPage />;
    case 'jobs':
      return <JobsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <OverviewPage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <ToastListener />
      <AppLayout>
        <PageRouter />
      </AppLayout>
      <Toaster position="bottom-right" />
    </AppProvider>
  );
}
