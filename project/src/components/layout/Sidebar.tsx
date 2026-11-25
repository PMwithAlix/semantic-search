import { cn } from '@/lib/utils';
import { useApp } from '@/store/AppContext';
import {
  LayoutDashboard,
  Database,
  Sparkles,
  Boxes,
  Search,
  ListChecks,
  Settings,
  ChevronsUpDown,
  CircleUser,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { id: 'overview', icon: LayoutDashboard, labelKey: 'nav.overview' },
  { id: 'datasets', icon: Database, labelKey: 'nav.datasets' },
  { id: 'embedding-config', icon: Sparkles, labelKey: 'nav.embeddings' },
  { id: 'collections', icon: Boxes, labelKey: 'nav.vectorCollections' },
  { id: 'search', icon: Search, labelKey: 'nav.semanticSearch' },
  { id: 'jobs', icon: ListChecks, labelKey: 'nav.jobs' },
  { id: 'settings', icon: Settings, labelKey: 'nav.settings' },
] as const;

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  showCollapseToggle = true,
}: SidebarProps) {
  const { t, page, navigate, isRtl, jobs, formatNum } = useApp();
  const activeJobCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const isActive = (id: string): boolean => {
    if (id === 'datasets') return page === 'datasets' || page === 'upload' || page === 'dataset-detail' || page === 'import';
    if (id === 'embedding-config') return page === 'embedding-config' || page === 'job-details';
    if (id === 'collections') return page === 'collections' || page === 'collection-detail';
    if (id === 'search') return page === 'search';
    if (id === 'jobs') return page === 'jobs' || page === 'job-details';
    if (id === 'settings') return page === 'settings';
    if (id === 'overview') return page === 'overview';
    return false;
  };

  const handleNav = (id: string) => {
    navigate(id as never);
    onNavigate?.();
  };

  const tooltipSide = isRtl ? 'left' : 'right';

  const NavButton = ({ item }: { item: (typeof navItems)[number] }) => {
    const active = isActive(item.id);
    const label = t(item.labelKey);
    const showBadge = item.id === 'jobs' && activeJobCount > 0;

    const button = (
      <button
        type="button"
        onClick={() => handleNav(item.id)}
        className={cn(
          'relative flex w-full items-center rounded-md text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        aria-label={label}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
        {showBadge && !collapsed && (
          <span
            className={cn(
              'rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground',
              isRtl ? 'mr-auto' : 'ml-auto'
            )}
          >
            {formatNum(activeJobCount)}
          </span>
        )}
        {showBadge && collapsed && (
          <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        )}
        {active && !showBadge && !collapsed && (
          <span className={cn('h-1 w-1 rounded-full bg-primary', isRtl ? 'mr-auto' : 'ml-auto')} />
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={tooltipSide} className="font-medium">
            {label}
            {showBadge ? ` (${formatNum(activeJobCount)})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-border bg-card transition-[width] duration-200 ease-in-out',
        isRtl ? 'border-s' : 'border-e',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-5'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold leading-tight">{t('app.title')}</span>
            <span className="truncate text-[10px] leading-tight text-muted-foreground">{t('app.subtitle')}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-2 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="shrink-0 space-y-1 border-t border-border px-2 py-3">
        {showCollapseToggle && onToggleCollapse && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  collapsed ? 'justify-center px-2' : 'gap-3'
                )}
                aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              >
                {collapsed ? (
                  <PanelLeftOpen className={cn('h-4 w-4', isRtl && 'scale-x-[-1]')} />
                ) : (
                  <>
                    <PanelLeftClose className={cn('h-4 w-4 shrink-0', isRtl && 'scale-x-[-1]')} />
                    <span className="truncate text-xs font-medium">{t('nav.collapseSidebar')}</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side={tooltipSide}>{t('nav.expandSidebar')}</TooltipContent>
            )}
          </Tooltip>
        )}

        {!collapsed ? (
          <>
            <button
              type="button"
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-blue-600 text-xs font-bold text-white">
                SA
              </div>
              <div className="min-w-0 flex-1 text-start">
                <div className="truncate text-xs font-semibold">Support Analytics</div>
                <div className="truncate text-[10px] text-muted-foreground">Enterprise Plan</div>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('settings')}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <CircleUser className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1 text-start">
                <div className="truncate text-xs font-semibold">Admin User</div>
                <div className="truncate text-[10px] text-muted-foreground">admin@vectorforge.io</div>
              </div>
            </button>
          </>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleNav('settings')}
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent"
                aria-label={t('nav.settings')}
              >
                <CircleUser className="h-5 w-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>Admin User</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
