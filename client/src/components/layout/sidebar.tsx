// src/components/layout/sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Campaigns',
    href: '/dashboard/campaigns',
    icon: Megaphone,
  },
  {
    title: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
  },
  {
    title: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart,
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout, user } = useAuthStore();
  const pathname = usePathname();
  
  return (
    <aside
      className={cn(
        'bg-card border-r border-border flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-[70px]' : 'w-[250px]'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!sidebarCollapsed && (
          <div className="font-bold text-lg">Mini CRM</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(sidebarCollapsed && 'mx-auto')}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <item.icon size={18} />
                  {!sidebarCollapsed && <span>{item.title}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        {!sidebarCollapsed ? (
          <div className="flex justify-between items-center">
            <div className="truncate">
              <div className="font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut size={18} />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={logout} className="mx-auto">
            <LogOut size={18} />
          </Button>
        )}
      </div>
    </aside>
  );
}