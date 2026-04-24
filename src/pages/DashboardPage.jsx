import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import GroupModal from '../components/modals/GroupModal';
import BalanceText from '../components/shared/BalanceText';
import EmptyState from '../components/shared/EmptyState';
import MobileSheet from '../components/shared/MobileSheet';
import PageShell from '../components/shared/PageShell';
import SyncStatusButton from '../components/shared/SyncStatusButton';
import { useAppContext } from '../context/AppContext';
import {
  calculateBalance,
  calculateGroupBalance,
  cn,
  filterTransactions,
  formatCurrency,
  formatDisplayDate,
  getInitials,
  hasActiveFilters,
  sortTransactionsByOption,
} from '../lib/utils';

const DASHBOARD_FILTER_DEFAULTS = {
  friendId: '',
  type: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  sort: 'recent',
};

const ROWS_PER_PAGE = 20;

function FriendCard({ friend, balance, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card min-w-[17rem] flex-1 p-5 text-left transition hover:-translate-y-1 hover:border-electric-500/[0.45]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-100">{friend.name}</p>
          <p className="mt-1 text-sm text-slate-500">Tap to open ledger</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-electric-500/20 bg-electric-500/10 text-sm font-semibold text-electric-300">
          {getInitials(friend.name)}
        </div>
      </div>

      <div className="mt-6">
        <BalanceText balance={balance} zeroLabel="All settled" />
      </div>
    </button>
  );
}

function GroupPreviewCard({ group, groupBalance, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-panel w-full border border-electric-500/[0.12] p-4 text-left transition hover:border-electric-500/30 hover:bg-electric-500/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-100">{group.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {group.members.length + 1} members including you
          </p>
        </div>
        <UsersRound className="h-5 w-5 text-electric-300" />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-400">Outstanding</span>
        <span className="font-semibold text-electric-200">
          {formatCurrency(Math.abs(groupBalance))}
        </span>
      </div>

      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        Created {formatDisplayDate(group.createdAt)}
      </p>
    </button>
  );
}

function TransactionTypeToggle({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        { id: 'all', label: 'All', className: 'text-slate-300' },
        { id: 'given', label: 'Given', className: 'text-danger' },
        { id: 'received', label: 'Received', className: 'text-success' },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'rounded-full border px-3 py-2 text-sm font-medium transition',
            value === option.id
              ? 'border-electric-500/30 bg-electric-500/10 text-electric-200'
              : `border-white/10 bg-white/5 ${option.className} hover:border-electric-500/20`,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GlobalTypeChip({ type }) {
  const isGiven = type === 'given';

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
        isGiven
          ? 'border-danger/25 bg-danger/10 text-danger'
          : 'border-success/25 bg-success/10 text-success',
      )}
    >
      {isGiven ? 'Given' : 'Received'}
    </span>
  );
}

function DashboardFiltersForm({
  filters,
  friends,
  onChange,
  onClear,
  showClear,
  onApply,
  mobile,
}) {
  const containerClassName = mobile
    ? 'space-y-4'
    : 'grid gap-4 xl:grid-cols-[minmax(0,15rem),auto,minmax(0,1fr),minmax(0,13rem),minmax(0,13rem),minmax(0,10rem),auto]';

  return (
    <div className={containerClassName}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Friend
        </span>
        <select
          value={filters.friendId}
          onChange={(event) => onChange('friendId', event.target.value)}
          className="input-field"
        >
          <option value="">All friends</option>
          {friends.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.name}
            </option>
          ))}
        </select>
      </label>

      <div className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Type
        </span>
        <TransactionTypeToggle
          value={filters.type}
          onChange={(nextValue) => onChange('type', nextValue)}
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Search
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            className="input-field pl-11"
            placeholder="Purpose text"
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            From
          </span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onChange('dateFrom', event.target.value)}
            className="input-field"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            To
          </span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => onChange('dateTo', event.target.value)}
            className="input-field"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Min amount
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={filters.amountMin}
            onChange={(event) => onChange('amountMin', event.target.value)}
            className="input-field"
            placeholder="₹ 0"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Max amount
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={filters.amountMax}
            onChange={(event) => onChange('amountMax', event.target.value)}
            className="input-field"
            placeholder="₹ 0"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Sort
        </span>
        <select
          value={filters.sort}
          onChange={(event) => onChange('sort', event.target.value)}
          className="input-field"
        >
          <option value="recent">Recently Added</option>
          <option value="date-asc">Date ↑</option>
          <option value="date-desc">Date ↓</option>
          <option value="amount-asc">Amount ↑</option>
          <option value="amount-desc">Amount ↓</option>
        </select>
      </label>

      {!mobile ? (
        <div className="flex items-end">
          {showClear ? (
            <button type="button" onClick={onClear} className="btn-ghost w-full">
              Clear
            </button>
          ) : (
            <div className="h-12 w-full" />
          )}
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          {showClear ? (
            <button type="button" onClick={onClear} className="btn-ghost">
              Clear
            </button>
          ) : null}
          <button type="button" onClick={onApply} className="btn-primary">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function MobileTransactionCard({ transaction, friendName }) {
  const isGiven = transaction.type === 'given';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="surface-panel border border-white/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{transaction.purpose}</p>
          <p className="mt-1 text-sm text-slate-500">{friendName}</p>
        </div>
        <GlobalTypeChip type={transaction.type} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-slate-400">Date</p>
          <p className="mt-1 font-medium text-slate-100">
            {formatDisplayDate(transaction.date)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-slate-400">Amount</p>
          <p className={isGiven ? 'mt-1 font-semibold text-danger' : 'mt-1 font-semibold text-success'}>
            {isGiven ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const {
    friends,
    transactions,
    groups,
    groupExpenses,
    saveGroup,
    logout,
    retrySync,
    syncStatus,
  } = useAppContext();
  const { openAddFriendModal } = useOutletContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [globalFilters, setGlobalFilters] = useState(DASHBOARD_FILTER_DEFAULTS);
  const [mobileGlobalFilters, setMobileGlobalFilters] = useState(
    DASHBOARD_FILTER_DEFAULTS,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash === '#friends-section') {
      document
        .getElementById('friends-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    globalFilters.friendId,
    globalFilters.type,
    globalFilters.search,
    globalFilters.dateFrom,
    globalFilters.dateTo,
    globalFilters.amountMin,
    globalFilters.amountMax,
    globalFilters.sort,
  ]);

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const hasGlobalFilters = hasActiveFilters(globalFilters);
  const filteredTransactions = sortTransactionsByOption(
    filterTransactions(transactions, globalFilters),
    globalFilters.sort,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / ROWS_PER_PAGE),
  );
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updateGlobalFilter = (key, value) => {
    setGlobalFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const updateMobileGlobalFilter = (key, value) => {
    setMobileGlobalFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearGlobalFilters = () => {
    setGlobalFilters(DASHBOARD_FILTER_DEFAULTS);
    setMobileGlobalFilters(DASHBOARD_FILTER_DEFAULTS);
  };

  const clearMobileGlobalFilters = () => {
    setMobileGlobalFilters(DASHBOARD_FILTER_DEFAULTS);
  };

  const applyMobileFilters = () => {
    setGlobalFilters(mobileGlobalFilters);
    setIsMobileFiltersOpen(false);
  };

  return (
    <PageShell className="max-w-7xl xl:pr-[23rem]">
      <div className="space-y-6">
        <section className="glass-card overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="nav-pill w-fit">Daily money tracker</div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                HisabKitab
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Keep every udhar conversation, repayment, and group split in one
                secure ledger.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start">
              <div className="flex items-center gap-3 rounded-2xl border border-electric-500/20 bg-electric-500/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-electric-500/20 text-electric-200">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Session</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-electric-300/75">
                    Encrypted
                  </p>
                </div>
              </div>

              <SyncStatusButton status={syncStatus} onRetry={retrySync} />

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="btn-ghost hidden sm:inline-flex"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="input-field pl-11"
                placeholder="Search friends in real time..."
              />
            </label>
          </div>
        </section>

        <section id="friends-section" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="panel-title">Friends</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-100">
                Live balance cards
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-2 text-sm text-electric-200 md:flex">
                <Sparkles className="h-4 w-4" />
                Tap a card to open the full ledger
              </div>
              <button
                type="button"
                onClick={openAddFriendModal}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Add Friend
              </button>
            </div>
          </div>

          {filteredFriends.length ? (
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 xl:overflow-visible">
              {filteredFriends.map((friend) => {
                const balance = calculateBalance(
                  transactions.filter(
                    (transaction) => transaction.friendId === friend.id,
                  ),
                );

                return (
                  <div key={friend.id} className="snap-start">
                    <FriendCard
                      friend={friend}
                      balance={balance}
                      onClick={() => navigate(`/friend/${friend.id}`)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No friends match that search."
              description="Try another name or clear the search box to see everyone."
            />
          )}
        </section>

        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="panel-title">All Transactions</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-100">
                Cross-friend ledger
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Review every personal transaction in one place. Group expenses
                stay separate in the Groups area.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileGlobalFilters(globalFilters);
                setIsMobileFiltersOpen(true);
              }}
              className="btn-ghost md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
            </button>
          </div>

          <div className="mt-6 hidden md:block">
            <DashboardFiltersForm
              filters={globalFilters}
              friends={friends}
              onChange={updateGlobalFilter}
              onClear={clearGlobalFilters}
              showClear={hasGlobalFilters}
            />
          </div>

          <div className="mt-6">
            {filteredTransactions.length ? (
              <>
                <div className="space-y-3 md:hidden">
                  <AnimatePresence initial={false}>
                    {paginatedTransactions.map((transaction) => (
                      <MobileTransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        friendName={
                          friends.find((friend) => friend.id === transaction.friendId)
                            ?.name || 'Unknown'
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <div className="hidden overflow-hidden rounded-3xl border border-electric-500/[0.15] bg-slate-950/[0.55] shadow-soft backdrop-blur-xl md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5 text-left">
                      <thead className="bg-white/[0.03]">
                        <tr className="text-sm uppercase tracking-[0.18em] text-slate-400">
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">Friend</th>
                          <th className="px-6 py-4 font-medium">Purpose</th>
                          <th className="px-6 py-4 font-medium">Type</th>
                          <th className="px-6 py-4 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <AnimatePresence initial={false}>
                          {paginatedTransactions.map((transaction) => {
                            const friendName =
                              friends.find(
                                (friend) => friend.id === transaction.friendId,
                              )?.name || 'Unknown';
                            const isGiven = transaction.type === 'given';

                            return (
                              <motion.tr
                                layout
                                key={transaction.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="text-sm text-slate-300"
                              >
                                <td className="px-6 py-4 text-slate-400">
                                  {formatDisplayDate(transaction.date)}
                                </td>
                                <td className="px-6 py-4">{friendName}</td>
                                <td className="px-6 py-4">{transaction.purpose}</td>
                                <td className="px-6 py-4">
                                  <GlobalTypeChip type={transaction.type} />
                                </td>
                                <td
                                  className={
                                    isGiven
                                      ? 'px-6 py-4 text-right font-semibold text-danger'
                                      : 'px-6 py-4 text-right font-semibold text-success'
                                  }
                                >
                                  {isGiven ? '+' : '-'}
                                  {formatCurrency(transaction.amount)}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 ? (
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Page {currentPage} of {totalPages}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                        disabled={currentPage === 1}
                        className="btn-ghost px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="btn-ghost px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="No transactions match those filters."
                description="Try widening the filters or clear them to bring the full ledger back."
                action={
                  hasGlobalFilters ? (
                    <button
                      type="button"
                      onClick={clearGlobalFilters}
                      className="btn-ghost"
                    >
                      Clear filters
                    </button>
                  ) : null
                }
              />
            )}
          </div>
        </section>
      </div>

      <aside className="hidden xl:block">
        <div className="fixed right-8 top-8 w-[21rem]">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="panel-title">Groups</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-100">
                  Shared spends
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="btn-primary px-3 py-2 text-xs"
              >
                + New Group
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {groups.length ? (
                groups.map((group) => (
                  <GroupPreviewCard
                    key={group.id}
                    group={group}
                    groupBalance={calculateGroupBalance(groupExpenses, group)}
                    onClick={() => navigate(`/groups?groupId=${group.id}`)}
                  />
                ))
              ) : (
                <EmptyState
                  className="px-4 py-8"
                  title="No groups yet"
                  description="Create a group to track shared expenses separately."
                />
              )}
            </div>
          </div>
        </div>
      </aside>

      <GroupModal
        open={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        friends={friends}
        onSave={saveGroup}
      />

      <MobileSheet
        open={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="All transactions filters"
        description="Refine the combined ledger by friend, type, date, amount, or sort."
      >
        <DashboardFiltersForm
          filters={mobileGlobalFilters}
          friends={friends}
          onChange={updateMobileGlobalFilter}
          onClear={clearMobileGlobalFilters}
          showClear={hasActiveFilters(mobileGlobalFilters)}
          onApply={applyMobileFilters}
          mobile
        />
      </MobileSheet>
    </PageShell>
  );
}
