import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Download,
  LayoutDashboard,
  LogOut,
  Plus,
  Upload,
  Users,
  UsersRound,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { APP_NAME } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useAppContext } from '../../context/AppContext';

function navClassName(isActive) {
  return cn(
    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
    isActive
      ? 'border border-electric-500/25 bg-electric-500/[0.12] text-electric-300'
      : 'border border-transparent text-slate-300 hover:border-electric-500/[0.15] hover:bg-white/5 hover:text-slate-100',
  );
}

export default function DesktopSidebar({ onAddFriend }) {
  const { exportData, friends, importData, logout } = useAppContext();
  const [isFriendsOpen, setIsFriendsOpen] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const importInputRef = useRef(null);

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[18rem] flex-col border-r border-electric-500/10 bg-slate-950/75 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <div className="glass-card overflow-hidden p-4">
          <div className="nav-pill w-fit">Personal Udhar Tracker</div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Track who owes what, split group spends, and keep every ledger
            encrypted on this device.
          </p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-2 overflow-y-auto px-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => navClassName(isActive)}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>

        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFriendsOpen((currentValue) => !currentValue)}
              className={cn(
                navClassName(location.pathname.startsWith('/friend') || isFriendsOpen),
                'flex-1',
              )}
            >
              <Users className="h-4 w-4" />
              <span className="flex-1 text-left">Friends</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition',
                  isFriendsOpen ? 'rotate-180' : '',
                )}
              />
            </button>

            <button
              type="button"
              onClick={onAddFriend}
              className="rounded-full border border-electric-500/15 bg-electric-500/10 p-2 text-electric-300 transition hover:border-electric-500/30 hover:bg-electric-500/20"
              aria-label="Add friend"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isFriendsOpen ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {friends.map((friend) => {
                  const isActive = location.pathname === `/friend/${friend.id}`;

                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => navigate(`/friend/${friend.id}`)}
                      className={cn(
                        'flex w-full items-center rounded-2xl px-4 py-2.5 text-left text-sm transition',
                        isActive
                          ? 'bg-electric-500/[0.12] text-electric-300'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                      )}
                    >
                      {friend.name}
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <NavLink
          to="/groups"
          className={({ isActive }) => navClassName(isActive)}
        >
          <UsersRound className="h-4 w-4" />
          Groups
        </NavLink>
      </nav>

      <div className="space-y-3 px-2">
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            setIsImporting(true);
            await importData(file);
            setIsImporting(false);
            event.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={exportData}
          className="btn-ghost w-full justify-center"
        >
          <Download className="h-4 w-4" />
          Export data
        </button>

        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="btn-ghost w-full justify-center"
          disabled={isImporting}
        >
          <Upload className="h-4 w-4" />
          {isImporting ? 'Importing...' : 'Import data'}
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="btn-ghost w-full justify-center"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
