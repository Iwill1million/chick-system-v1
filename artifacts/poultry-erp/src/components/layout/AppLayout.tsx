import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  useListNotifications,
  useMarkNotificationsRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import type { NotificationItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCheck,
  Settings,
  BarChart2,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Button, Badge } from "@/components/ui-components";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      refetchInterval: 30000,
    },
  });

  const { mutate: markRead } = useMarkNotificationsRead({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    },
  });

  const unreadCount = notifications.filter((n: NotificationItem) => !n.isRead).length;

  function getNotifPath(n: NotificationItem): string | null {
    if (n.orderId) {
      return user?.role === "admin" ? `/orders/${n.orderId}` : `/agent/orders/${n.orderId}`;
    }
    return null;
  }

  function handleNotifClick(n: NotificationItem) {
    if (!n.isRead) markRead({ data: { ids: [n.id] } });
    const path = getNotifPath(n);
    if (path) {
      setIsNotifOpen(false);
      navigate(path);
    }
  }

  const notifMobileRef = useRef<HTMLDivElement>(null);
  const notifDesktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNotifOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideMobile = notifMobileRef.current?.contains(target) ?? false;
      const insideDesktop = notifDesktopRef.current?.contains(target) ?? false;
      if (!insideMobile && !insideDesktop) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  const adminLinks = [
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/orders", label: "الطلبات", icon: ShoppingCart },
    { href: "/customers", label: "العملاء", icon: Users },
    { href: "/products", label: "المنتجات", icon: Package },
    { href: "/agents", label: "المندوبون", icon: Truck },
    { href: "/agents/report", label: "تقرير المندوبين", icon: BarChart2 },
    { href: "/settings", label: "إعدادات الشركة", icon: Settings },
  ];

  const agentLinks = [{ href: "/agent/orders", label: "طلباتي", icon: Truck }];

  const links = user?.role === "admin" ? adminLinks : agentLinks;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border z-30 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-2 text-foreground"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-display font-bold text-xl text-primary">نظام الدواجن</span>
        </div>
        <div ref={notifMobileRef} className="flex items-center gap-2 relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-foreground"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-destructive text-white text-[10px] font-bold rounded-full border-2 border-card">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Mobile notification dropdown */}
          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-xl border border-border overflow-hidden z-50"
              >
                <div className="p-3 border-b border-border flex justify-between items-center bg-secondary/30">
                  <h3 className="font-bold text-sm">الإشعارات</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markRead({ data: { all: true } })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> تعيين الكل مقروء
                    </button>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      لا توجد إشعارات حالياً
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((n: NotificationItem) => {
                        const hasLink = !!getNotifPath(n);
                        return (
                          <div
                            key={n.id}
                            className={cn(
                              "p-4 border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30",
                              !n.isRead && "bg-primary/5",
                              hasLink ? "cursor-pointer" : "cursor-default"
                            )}
                            onClick={() => handleNotifClick(n)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-foreground leading-snug">{n.message}</p>
                              {hasLink && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
                              {formatDate(n.createdAt)}
                            </p>
                            {!n.isRead && (
                              <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Sidebar (Desktop + Mobile overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop — closes sidebar on tap */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-40 w-72 bg-card border-l border-border flex flex-col md:hidden"
            >
              <SidebarContent
                user={user}
                links={links}
                location={location}
                logout={logout}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - always visible */}
      <aside className="hidden md:flex w-72 bg-card border-l border-border flex-col flex-shrink-0">
        <SidebarContent
          user={user}
          links={links}
          location={location}
          logout={logout}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-card/50 backdrop-blur-md border-b border-border/50 sticky top-0 z-20">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {links.slice().reverse().find((l) => location.startsWith(l.href))?.label || "نظام الدواجن"}
          </h1>

          <div ref={notifDesktopRef} className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2.5 rounded-full bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-destructive text-white text-[10px] font-bold rounded-full border-2 border-card">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-80 bg-card rounded-2xl shadow-xl border border-border overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-border flex justify-between items-center bg-secondary/30">
                    <h3 className="font-bold text-sm">الإشعارات</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markRead({ data: { all: true } })}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> تعيين الكل مقروء
                      </button>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        لا توجد إشعارات حالياً
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((n: NotificationItem) => {
                          const hasLink = !!getNotifPath(n);
                          return (
                            <div
                              key={n.id}
                              className={cn(
                                "p-4 border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30",
                                !n.isRead && "bg-primary/5",
                                hasLink ? "cursor-pointer" : "cursor-default"
                              )}
                              onClick={() => handleNotifClick(n)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-foreground leading-snug">{n.message}</p>
                                {hasLink && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
                                {formatDate(n.createdAt)}
                              </p>
                              {!n.isRead && (
                                <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">{children}</div>
      </main>
    </div>
  );
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarContentProps {
  user: { name: string; role: string } | null;
  links: NavLink[];
  location: string;
  logout: () => void;
  onClose?: () => void;
}

function SidebarContent({ user, links, location, logout, onClose }: SidebarContentProps) {
  return (
    <>
      <div className="p-6">
        <span className="font-display font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-l from-primary to-emerald-500">
          نظام الدواجن
        </span>
      </div>

      <div className="p-6 pt-0 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {user?.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">
              {user?.role === "admin" ? "مدير النظام" : "مندوب توصيل"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {links.map((link) => {
          const isActive = link.href === "/agents"
            ? location === "/agents" || location.startsWith("/agents/") && !location.startsWith("/agents/report")
            : location.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-foreground hover:bg-secondary hover:text-primary"
              )}
            >
              <link.icon
                className={cn(
                  "w-5 h-5",
                  isActive ? "text-primary-foreground/90" : "text-muted-foreground"
                )}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}
