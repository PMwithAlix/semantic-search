import { useApp } from '@/store/AppContext';
import { useTheme } from 'next-themes';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  Languages,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  overview: 'nav.overview',
  datasets: 'nav.datasets',
  upload: 'datasets.upload',
  'dataset-detail': 'nav.datasets',
  import: 'import.title',
  'embedding-config': 'embedding.title',
  'job-details': 'job.title',
  collections: 'nav.vectorCollections',
  'collection-detail': 'nav.vectorCollections',
  search: 'nav.semanticSearch',
  jobs: 'nav.jobs',
  settings: 'nav.settings',
};

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({ onMenuClick, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { t, lang, setLang, page, pageParams, navigate, isRtl } = useApp();
  const { theme, setTheme } = useTheme();

  const titleKey = pageTitles[page] ?? 'nav.overview';
  const breadcrumbs: { label: string; page?: string }[] = [{ label: t('app.title') }];

  if (page === 'upload') {
    breadcrumbs.push({ label: t('nav.datasets'), page: 'datasets' });
    breadcrumbs.push({ label: t('upload.title') });
  } else if (page === 'dataset-detail') {
    breadcrumbs.push({ label: t('nav.datasets'), page: 'datasets' });
    breadcrumbs.push({ label: pageParams.name ?? '' });
  } else if (page === 'import') {
    breadcrumbs.push({ label: t('nav.datasets'), page: 'datasets' });
    breadcrumbs.push({ label: t('import.title') });
  } else if (page === 'embedding-config') {
    breadcrumbs.push({ label: t('nav.datasets'), page: 'datasets' });
    breadcrumbs.push({ label: t('embedding.title') });
  } else if (page === 'job-details') {
    breadcrumbs.push({ label: t('nav.jobs'), page: 'jobs' });
    breadcrumbs.push({ label: pageParams.jobId?.slice(0, 8) ?? '' });
  } else if (page === 'collection-detail') {
    breadcrumbs.push({ label: t('nav.vectorCollections'), page: 'collections' });
    breadcrumbs.push({ label: pageParams.name ?? '' });
  } else {
    breadcrumbs.push({ label: t(titleKey) });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar toggle (tablet/desktop when sidebar visible) */}
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 shrink-0 md:inline-flex"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Breadcrumb + Title */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="hidden items-center gap-1 overflow-hidden text-xs text-muted-foreground sm:flex">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <ChevronRight className={cn('h-3 w-3 shrink-0', isRtl && 'rotate-180')} />
              )}
              {bc.page ? (
                <button
                  type="button"
                  onClick={() => navigate(bc.page as never)}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {bc.label}
                </button>
              ) : (
                <span className="truncate">{bc.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 className="truncate text-base font-bold leading-tight sm:text-lg">{t(titleKey)}</h1>
      </div>

      {/* Global search */}
      <div className="hidden w-48 shrink-0 lg:block xl:w-64">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('header.search')} className="h-9 bg-background ps-9" />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLang('en')} className={cn(lang === 'en' && 'bg-accent')}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('fa')} className={cn(lang === 'fa' && 'bg-accent')}>
              فارسی
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 me-2" /> {t('settings.light')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 me-2" /> {t('settings.dark')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4 me-2" /> {t('settings.system')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  );
}
