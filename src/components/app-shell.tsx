"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-env";
import { useSyncExternalStore } from "react";
import {
  Activity,
  ChartLine,
  Dumbbell,
  LayoutDashboard,
  Menu,
  PanelLeft,
  Scale,
  Settings,
  Target,
  Timer,
  Utensils,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/plans", label: "Training Plans", icon: Activity },
  { href: "/body", label: "Body Progress", icon: Scale },
  { href: "/hyrox", label: "HYROX", icon: Timer },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/workouts", label: "Workout", icon: Dumbbell },
  { href: "/nutrition", label: "Food", icon: Utensils },
  { href: "/body", label: "Progress", icon: Scale },
];

const listeners = new Set<() => void>();

function collapsedNow() {
  return window.localStorage.getItem("forge-sidebar") === "collapsed";
}

function subscribeCollapsed(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setCollapsed(next: boolean) {
  window.localStorage.setItem("forge-sidebar", next ? "collapsed" : "open");
  listeners.forEach((listener) => listener());
}

function SignOut({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) return null;
  async function signOut() {
    const supabase = createBrowserClient(url, key);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <Button variant="ghost" className="w-full" onClick={signOut}>
      {collapsed ? <span className="sr-only">Sign out</span> : "Sign out"}
    </Button>
  );
}

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, collapsedNow, () => false);
  if (pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth/")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  function toggle() {
    setCollapsed(!collapsed);
  }

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar md:flex",
          collapsed ? "w-[76px]" : "w-60",
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 py-5", collapsed && "justify-center px-2")}>
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">F</div>
          {collapsed ? null : (
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-primary">FORGE</p>
              <p className="text-xs text-muted-foreground">Personal Fitness OS</p>
            </div>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                  on && "bg-sidebar-accent text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className={cn("size-4", on && "text-primary")} />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2">
          <SignOut collapsed={collapsed} />
          <Button variant="ghost" className="w-full" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <PanelLeft />
            {collapsed ? null : "Collapse"}
          </Button>
        </div>
      </aside>

      <div className={cn("min-h-screen pb-32 transition-[padding] md:pb-0", collapsed ? "md:pl-[76px]" : "md:pl-60")}>
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile">
        <div className="grid grid-cols-5">
          {MOBILE.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", on ? "text-primary" : "text-muted-foreground")}>
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          <Sheet>
            <SheetTrigger className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground" render={<button type="button" />}>
              <Menu className="size-5" />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh]">
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 p-4">
                {NAV.slice(3).map((item) => (
                  <Link key={item.href} href={item.href} className="flex h-12 items-center rounded-xl bg-muted px-4 text-sm">
                    {item.label}
                  </Link>
                ))}
                <SignOut />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
