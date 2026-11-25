import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ActiveJobsBanner } from '@/components/ActiveJobsBanner';
import { ApiKeyWarningBanner } from '@/components/ApiKeyWarningBanner';
import { useApp } from '@/store/AppContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';

const SIDEBAR_STORAGE_KEY = 'vectorforge-sidebar-collapsed';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isRtl, page } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [page]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        {/* Desktop / tablet sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            showCollapseToggle
          />
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side={isRtl ? 'right' : 'left'}
            className="w-[min(280px,85vw)] p-0"
          >
            <Sidebar
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              showCollapseToggle={false}
            />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            onMenuClick={() => setMobileOpen(true)}
            sidebarCollapsed={collapsed}
            onToggleSidebar={toggleCollapsed}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <ApiKeyWarningBanner />
            <ActiveJobsBanner />
            {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
