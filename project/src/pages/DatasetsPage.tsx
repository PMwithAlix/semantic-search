import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Upload,
  MoreHorizontal,
  Eye,
  FileSpreadsheet,
  Download,
  Sparkles,
  Trash2,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function DatasetsPage() {
  const { t, formatNum, datasets, navigate, refreshDatasets, toast, translateError, isRtl } = useApp();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteDataset(deleteId);
      await refreshDatasets();
      toast(t('action.delete'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    }
    setDeleteId(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={t('datasets.title')}
        subtitle={t('datasets.subtitle')}
        actions={
          <Button onClick={() => navigate('upload')}>
            <Upload className="h-4 w-4 me-2" />
            {t('datasets.upload')}
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('header.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title={t('datasets.empty')}
          description={t('datasets.emptyDesc')}
          action={
            <Button onClick={() => navigate('upload')}>
              <Upload className="h-4 w-4 me-2" />
              {t('datasets.emptyCta')}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t('datasets.col.name')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.fileSize')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.rows')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.columns')}</TableHead>
                  <TableHead>{t('datasets.col.status')}</TableHead>
                  <TableHead>{t('datasets.col.created')}</TableHead>
                  <TableHead>{t('datasets.col.updated')}</TableHead>
                  <TableHead className="text-end">{t('datasets.col.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ds) => (
                  <TableRow
                    key={ds.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate('dataset-detail', { id: ds.id, name: ds.name })}
                  >
                    <TableCell className="font-mono text-xs font-medium">{ds.name}</TableCell>
                    <TableCell className="text-end font-mono text-xs text-muted-foreground">{ds.fileSize}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(ds.rowCount)}</TableCell>
                    <TableCell className="text-end font-mono text-xs">{formatNum(ds.columnCount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={ds.status} label={t(`status.${ds.status}`)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ds.createdAt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ds.updatedAt}</TableCell>
                    <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate('dataset-detail', { id: ds.id, name: ds.name })}>
                            <Eye className="h-3.5 w-3.5 me-2" />
                            {t('action.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('dataset-detail', { id: ds.id, name: ds.name })}>
                            <FileSpreadsheet className="h-3.5 w-3.5 me-2" />
                            {t('action.preview')}
                          </DropdownMenuItem>
                          {ds.status === 'ready' && (
                            <DropdownMenuItem onClick={() => navigate('import', { id: ds.id, name: ds.name })}>
                              <Download className="h-3.5 w-3.5 me-2" />
                              {t('action.import')}
                            </DropdownMenuItem>
                          )}
                          {ds.status === 'imported' && (
                            <DropdownMenuItem onClick={() => navigate('embedding-config', { datasetId: ds.id })}>
                              <Sparkles className="h-3.5 w-3.5 me-2" />
                              {t('action.configureEmbedding')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(ds.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 me-2" />
                            {t('action.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.no')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
