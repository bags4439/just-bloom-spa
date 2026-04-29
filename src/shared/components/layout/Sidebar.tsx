import React, { useCallback } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Permission } from '@/features/auth/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { useAuthStore, selectUser } from '@/stores/authStore';
import { cn } from '@/shared/utils/cn';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  permission?: Permission;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
  { id: 'new-transaction', label: 'New transaction', icon: Plus, path: ROUTES.NEW_TRANSACTION },
  { id: 'transactions', label: 'Transactions', icon: Receipt, path: ROUTES.TRANSACTIONS },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    path: ROUTES.CUSTOMERS,
    permission: Permission.MANAGE_CUSTOMERS,
  },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: ROUTES.REPORTS, permission: Permission.VIEW_REPORTS },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: ROUTES.SETTINGS,
    permission: Permission.MANAGE_SETTINGS,
  },
];

const LotusIcon: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = '#C4962A' }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <path
      d="M22 36C22 36 8 28 8 17C8 11 14 6 22 6C30 6 36 11 36 17C36 28 22 36 22 36Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M22 36C22 36 4 26 4 13C4 7 11 3 22 7"
      stroke={color}
      strokeWidth="1"
      fill="none"
      opacity="0.5"
    />
    <path
      d="M22 36C22 36 40 26 40 13C40 7 33 3 22 7"
      stroke={color}
      strokeWidth="1"
      fill="none"
      opacity="0.5"
    />
    <circle cx="22" cy="18" r="3.5" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);

const NavLink: React.FC<{ item: NavItem; isActive: boolean; onClick: () => void }> = React.memo(
  ({ item, isActive, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-left text-sm transition-all',
        isActive
          ? 'border-accent bg-accent/10 font-semibold text-accent'
          : 'border-transparent font-normal text-white/60 hover:bg-white/5 hover:text-white/80',
      )}
    >
      <item.icon size={15} />
      <span>{item.label}</span>
    </button>
  ),
);
NavLink.displayName = 'NavLink';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(selectUser);
  const { logout } = useAuth();
  const canViewReports = usePermission(Permission.VIEW_REPORTS);
  const canManageSettings = usePermission(Permission.MANAGE_SETTINGS);

  const isVisible = useCallback(
    (item: NavItem): boolean => {
      if (!item.permission) return true;
      if (item.permission === Permission.VIEW_REPORTS) return canViewReports;
      if (item.permission === Permission.MANAGE_SETTINGS) return canManageSettings;
      return true;
    },
    [canViewReports, canManageSettings],
  );

  const isActive = useCallback(
    (path: string): boolean => {
      if (path === ROUTES.DASHBOARD) return location.pathname === '/';
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  }, [logout, navigate]);

  const visibleItems = ALL_NAV_ITEMS.filter(isVisible);

  return (
    <aside className="flex h-full w-[216px] shrink-0 flex-col" style={{ background: '#142E20' }}>
      <div className="border-b border-white/[0.07] px-5 py-6">
        <div className="flex items-center gap-2.5">
          <LotusIcon size={26} />
          <div>
            <div className="text-sm font-bold leading-tight text-white">Just Bloom</div>
            <div
              className="text-[9px] font-semibold uppercase tracking-widest"
              style={{ color: '#C4962A' }}
            >
              Spa · Adenta, Accra
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            isActive={isActive(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      <div className="border-t border-white/[0.07] px-5 py-4">
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {user?.role}
        </div>
        <div className="text-sm font-semibold text-white">{user?.name}</div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-3 flex items-center gap-1.5 text-xs text-white/35 transition-colors hover:text-white/60"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </aside>
  );
};
