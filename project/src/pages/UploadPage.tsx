import { useCallback, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Dataset } from '@/types';

type Step = 'upload' | 'preview' | 'validate' | 'import';

export function UploadPage() {
  const { t, navigate, toast, translateError, refreshDatasets, isRtl } = useApp();
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedDataset, setUploadedDataset] = useState<Dataset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: t('upload.step.upload') },
    { id: 'preview', label: t('upload.step.preview') },
    { id: 'validate', label: t('upload.step.validate') },
    { id: 'import', label: t('upload.step.import') },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast(t('upload.invalidType'), 'error');
      return;
    }
    setUploading(true);
    try {
      const dataset = await api.uploadDataset(file);
      setUploadedDataset(dataset);
      await refreshDatasets();
      setStep('preview');
      toast(t('upload.success'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    } finally {
      setUploading(false);
    }
  }, [refreshDatasets, t, toast, translateError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const startImport = async () => {
    if (!uploadedDataset) return;
    try {
      const job = await api.createImportJob(uploadedDataset.id);
      navigate('import', { id: uploadedDataset.id, jobId: job.id });
    } catch (error) {
      toast(translateError(error), 'error');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t('upload.title')} subtitle={t('upload.subtitle')} />

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', idx <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {idx + 1}
            </div>
            <span className={cn('text-sm', idx <= currentStepIndex ? 'font-medium' : 'text-muted-foreground')}>{s.label}</span>
            {idx < steps.length - 1 && <ArrowRight className={cn('h-4 w-4 text-muted-foreground', isRtl && 'rotate-180')} />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <Card>
          <CardContent className="p-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn('flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors', dragging ? 'border-primary bg-primary/5' : 'border-border')}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">{t('upload.dragDrop')}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('upload.orBrowse')}</p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? t('common.loading') : t('upload.browse')}
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedDataset && step !== 'upload' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium">{uploadedDataset.name}</div>
                <div className="text-xs text-muted-foreground">{uploadedDataset.fileSize} · {uploadedDataset.rowCount} rows · {uploadedDataset.columnCount} columns</div>
              </div>
            </div>

            {step === 'preview' && (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>{uploadedDataset.columns.map((c) => <th key={c.name} className="p-2 text-start font-medium">{c.name}</th>)}</tr>
                    </thead>
                    <tbody>
                      {uploadedDataset.previewRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">{uploadedDataset.columns.map((c) => <td key={c.name} className="p-2 font-mono">{String(row[c.name] ?? '')}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('upload')}><ArrowLeft className={cn('h-4 w-4 me-2', isRtl && 'rotate-180')} />{t('action.back')}</Button>
                  <Button onClick={() => setStep('validate')}>{t('action.continue')}<ArrowRight className={cn('h-4 w-4 ms-2', isRtl && 'rotate-180')} /></Button>
                </div>
              </>
            )}

            {step === 'validate' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uploadedDataset.columns.map((col) => (
                    <div key={col.name} className="rounded-lg border p-3 text-xs">
                      <div className="font-medium">{col.name}</div>
                      <div className="text-muted-foreground mt-1">{col.type} · {col.nonNullPercent}% non-null · example: {col.exampleValue}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />{t('upload.validationPassed')}</div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('preview')}>{t('action.back')}</Button>
                  <Button onClick={() => setStep('import')}>{t('action.continue')}</Button>
                </div>
              </>
            )}

            {step === 'import' && (
              <>
                <div className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />{t('upload.importHint')}</div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('validate')}>{t('action.back')}</Button>
                  <Button onClick={startImport}>{t('upload.startImport')}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
