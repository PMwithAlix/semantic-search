import { AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { resolveErrorGuidance, translateErrorMessage, type ErrorActionPage } from '@/lib/errorGuidance';
import { useApp } from '@/store/AppContext';

interface ErrorGuidancePanelProps {
  message: string;
  className?: string;
  children?: React.ReactNode;
  onAction?: (page: ErrorActionPage) => void;
}

export function ErrorGuidancePanel({ message, className, children, onAction }: ErrorGuidancePanelProps) {
  const { t, lang, navigate, isRtl } = useApp();
  const guidance = resolveErrorGuidance(message);
  const translatedMessage = translateErrorMessage(message, lang);
  const isError = guidance.severity === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;

  const handleAction = () => {
    if (!guidance.action) return;
    if (onAction) {
      onAction(guidance.action.page);
    } else {
      navigate(guidance.action.page as never);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-4 space-y-3',
        isError ? 'border-destructive/40 bg-destructive/5' : 'border-amber-500/40 bg-amber-500/5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', isError ? 'text-destructive' : 'text-amber-600')} />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h4 className={cn('text-sm font-semibold', isError ? 'text-destructive' : 'text-amber-800 dark:text-amber-200')}>
              {t(guidance.titleKey)}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {guidance.summaryKey === 'errors.generic.summaryWithDetail'
                ? `${t(guidance.summaryKey)}: ${translatedMessage}`
                : t(guidance.summaryKey)}
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-background/60 px-3 py-2.5">
            <div className="text-xs font-medium text-foreground mb-1">{t('errors.whatHappened')}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t(guidance.causeKey)}</p>
            {guidance.id === 'embedding_api_failure' && (
              <p className="text-[11px] font-mono text-muted-foreground mt-2 break-all">{translatedMessage}</p>
            )}
          </div>

          <div>
            <div className="text-xs font-medium text-foreground mb-2">{t('errors.howToFix')}</div>
            <ol className="space-y-1.5 list-decimal list-inside text-xs text-muted-foreground leading-relaxed">
              {guidance.fixKeys.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ol>
          </div>

          {children}

          {guidance.action && (
            <Button
              type="button"
              variant={isError ? 'default' : 'outline'}
              size="sm"
              className="mt-1"
              onClick={handleAction}
            >
              {t(guidance.action.labelKey)}
              <ChevronRight className={cn('h-3.5 w-3.5 ms-1', isRtl && 'rotate-180')} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
