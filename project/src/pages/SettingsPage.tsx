import { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Palette,
  Database,
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';

export function SettingsPage() {
  const { t, lang, setLang, toast, translateError } = useApp();
  const { theme, setTheme } = useTheme();
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [usdToToman, setUsdToToman] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    api.getSettingsStatus()
      .then((status) => {
        setConfigured(status.avalai_configured);
        if (status.usd_to_toman) setUsdToToman(String(status.usd_to_toman));
      })
      .catch((error) => toast(translateError(error), 'error'));
  }, [toast, translateError]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const status = await api.saveToken(apiKey.trim());
      setConfigured(status.avalai_configured);
      setApiKey('');
      toast(t('settings.saved'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRate = async () => {
    setSavingRate(true);
    try {
      const parsed = usdToToman.trim() ? Number(usdToToman.replace(/,/g, '')) : null;
      if (usdToToman.trim() && (!Number.isFinite(parsed) || (parsed ?? 0) <= 0)) {
        toast(t('settings.exchangeRateInvalid'), 'error');
        return;
      }
      const status = await api.saveGeneralSettings({ usd_to_toman: parsed });
      if (status.usd_to_toman) setUsdToToman(String(status.usd_to_toman));
      else setUsdToToman('');
      toast(t('settings.saved'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    } finally {
      setSavingRate(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const status = await api.clearToken();
      setConfigured(status.avalai_configured);
      toast(t('settings.cleared'), 'success');
    } catch (error) {
      toast(translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('settings.general')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('settings.language')}</label>
              <Select value={lang} onValueChange={(v) => setLang(v as 'en' | 'fa')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fa">فارسی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('settings.theme')}</label>
              <Select value={theme ?? 'system'} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('settings.light')}</SelectItem>
                  <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                  <SelectItem value="system">{t('settings.system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('settings.pricing')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('settings.exchangeRateHint')}</p>
          <div className="flex items-center gap-2 max-w-md">
            <Input
              type="number"
              min={0}
              step={1000}
              placeholder={t('settings.exchangeRatePlaceholder')}
              value={usdToToman}
              onChange={(e) => setUsdToToman(e.target.value)}
              className="font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={handleSaveRate} disabled={savingRate}>
              {t('settings.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('settings.database')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background w-fit">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-success font-medium">PostgreSQL + pgvector</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t('settings.embeddingProviders')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">AvalAI</span>
                {configured ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-xs text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('settings.connected')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <XCircle className="h-3 w-3" />
                    {t('settings.notConnected')}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t('settings.tokenHint')}</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pe-9 font-mono text-xs"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !apiKey.trim()}>
                {t('settings.save')}
              </Button>
              {configured && (
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving}>
                  {t('settings.clear')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
