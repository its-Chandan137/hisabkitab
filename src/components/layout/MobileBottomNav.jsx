import {
  LayoutDashboard,
  LogOut,
  Users,
  UsersRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAppContext } from '../../context/AppContext';

function MobileNavItem({ to, active, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
        active
          ? 'bg-electric-500/[0.14] text-electric-300'
          : 'text-slate-400 hover:text-slate-100',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAppContext();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-electric-500/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="glass-card flex items-center gap-2 p-2">
        <MobileNavItem
          to="/dashboard"
          active={
            location.pathname === '/dashboard' &&
            location.hash !== '#friends-section'
          }
          icon={LayoutDashboard}
          label="Dashboard"
        />
        <MobileNavItem
          to="/dashboard#friends-section"
          active={
            location.pathname.startsWith('/friend') ||
            location.hash === '#friends-section'
          }
          icon={Users}
          label="Friends"
        />
        <MobileNavItem
          to="/groups"
          active={location.pathname === '/groups'}
          icon={UsersRound}
          label="Groups"
        />

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-slate-400 transition hover:text-slate-100"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
