import React, { useState } from 'react';
import { NavLink, useLocation, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileStack,
  UploadCloud,
  CheckSquare,
  BarChart3,
  PlusCircle,
  History,
  Menu,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ThemeToggle from '@/components/common/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/papers', label: 'Papers', icon: FileStack },
  { to: '/upload', label: 'Upload Paper', icon: UploadCloud },
  { to: '/review', label: 'Review Questions', icon: CheckSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/create-mock', label: 'Create Mock', icon: PlusCircle },
  { to: '/history', label: 'History', icon: History },
];

function getBreadcrumbLabel(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/papers')) return 'Papers';
  if (pathname.startsWith('/upload')) return 'Upload Paper';
  if (pathname.startsWith('/review')) return 'Review Questions';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/create-mock')) return 'Create Mock';
  if (pathname.startsWith('/history')) return 'History';
  if (pathname.startsWith('/instructions')) return 'Instructions';
  if (pathname.startsWith('/result')) return 'Result';
  return 'Page';
}

function NavLinks({ onItemClick }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onItemClick}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children }) {
  const location = useLocation();
  const currentLabel = getBreadcrumbLabel(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/60 backdrop-blur shrink-0 sticky top-0 h-screen">
        <div className="flex h-16 items-center gap-2.5 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-tight">AI Mock Test</span>
            <span className="text-[11px] text-muted-foreground font-medium">RRB NTPC CBT-II</span>
          </div>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <NavLinks />
        </div>

        <div className="p-4 border-t">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Exam Profile</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">Active</Badge>
            </div>
            <p className="truncate font-medium text-foreground/80">RRB NTPC UG CBT-II</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header - Breadcrumb ONLY, No duplicate title */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 sm:px-6 lg:px-8 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-muted-foreground" aria-label="Open navigation menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="h-16 flex-row items-center gap-2.5 border-b px-6 text-left space-y-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <SheetTitle className="font-bold text-sm tracking-tight leading-tight">AI Mock Test</SheetTitle>
                    <span className="text-[11px] text-muted-foreground font-medium">RRB NTPC CBT-II</span>
                  </div>
                </SheetHeader>
                <div className="flex-1 py-4">
                  <NavLinks onItemClick={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Breadcrumb (Home / Current Page) */}
            <nav className="flex items-center text-xs font-medium text-muted-foreground gap-1.5" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              {location.pathname !== '/' && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-foreground font-semibold">{currentLabel}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Global Toaster for sonner with close button */}
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
