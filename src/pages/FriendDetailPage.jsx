import { AnimatePresence, motion } from 'framer-motion';
import {
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddTransactionModal from '../components/modals/AddTransactionModal';
import DeleteTransactionModal from '../components/modals/DeleteTransactionModal';
import FriendOptionsModal from '../components/modals/FriendOptionsModal';
import BalanceText from '../components/shared/BalanceText';
import EmptyState from '../components/shared/EmptyState';
import MobileSheet from '../components/shared/MobileSheet';
import PageBreadcrumbs from '../components/shared/PageBreadcrumbs';
import PageShell from '../components/shared/PageShell';
import SyncStatusButton from '../components/shared/SyncStatusButton';
import { useAppContext } from '../context/AppContext';
import {
  buildRunningBalances,
  calculateBalance,
  cn,
  filterTransactions,
  formatCurrency,
  formatDisplayDate,
  hasActiveFilters,
  sortTransactionsNewestFirst,
} from '../lib/utils';

const FRIEND_FILTER_DEFAULTS = {
  type: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
};

function FilterToggle({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        { id: 'all', label: 'All', tone: 'text-slate-300' },
        { id: 'given', label: 'Given', tone: 'text-danger' },
        { id: 'received', label: 'Received', tone: 'text-success' },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'rounded-full border px-3 py-2 text-sm font-medium transition',
            value === option.id
              ? 'border-electric-500/30 bg-electric-500/10 text-electric-200'
              : `border-white/10 bg-white/5 ${option.tone} hover:border-electric-500/20`,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FriendFiltersForm({
  filters,
  onChange,
  onClear,
  showClear,
  onApply,
  mobile,
}) {
  const containerClassName = mobile
    ? 'space-y-4'
    : 'grid gap-4 xl:grid-cols-[auto,minmax(0,1fr),minmax(0,13rem),minmax(0,13rem),auto]';

  return (
    <div className={containerClassName}>
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Type
        </span>
        <FilterToggle
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
            placeholder="Search purpose"
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

      {!mobile ? (
        <div className="flex items-end">
          {showClear ? (
            <button type="button" onClick={onClear} className="btn-ghost w-full">
              Clear Filters
            </button>
          ) : (
            <div className="h-12 w-full" />
          )}
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          {showClear ? (
            <button type="button" onClick={onClear} className="btn-ghost">
              Clear Filters
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

function MobileTransactionCard({ transaction, balance, onDelete }) {
  const isGiven = transaction.type === 'given';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="surface-panel border border-white/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {transaction.purpose}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDisplayDate(transaction.date)}
          </p>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-danger/25 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-slate-400">Amount</p>
          <p className={isGiven ? 'mt-1 font-semibold text-danger' : 'mt-1 font-semibold text-success'}>
            {isGiven ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-slate-400">Balance</p>
          <p
            className={
              balance > 0
                ? 'mt-1 font-semibold text-success'
                : balance < 0
                  ? 'mt-1 font-semibold text-danger'
                  : 'mt-1 font-semibold text-slate-200'
            }
          >
            {balance > 0 ? '+' : balance < 0 ? '-' : ''}
            {formatCurrency(Math.abs(balance))}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function FriendDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    friends,
    transactions,
    groups,
    groupExpenses,
    addTransaction,
    deleteTransaction,
    updateFriend,
    deleteFriend,
    retrySync,
    syncStatus,
  } = useAppContext();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [filters, setFilters] = useState(FRIEND_FILTER_DEFAULTS);
  const [mobileFilters, setMobileFilters] = useState(FRIEND_FILTER_DEFAULTS);

  const friend = friends.find((entry) => entry.id === id);
  const friendTransactionsSource = transactions.filter(
    (transaction) => transaction.friendId === id,
  );
  const filteredTransactions = sortTransactionsNewestFirst(
    filterTransactions(friendTransactionsSource, filters),
  );
  const runningBalances = buildRunningBalances(filteredTransactions);
  const balance = calculateBalance(friendTransactionsSource);
  const isDeleteBlocked =
    groups.some((group) =>
      group.members.some((member) => member.friendId === id),
    ) || groupExpenses.some((expense) => expense.paidBy === id);
  const hasFilters = hasActiveFilters(filters);

  useEffect(() => {
    setMobileFilters(filters);
  }, [filters]);

  if (!friend) {
    return (
      <PageShell className="max-w-4xl">
        <EmptyState
          title="Friend not found"
          description="This ledger does not exist anymore. Head back to the dashboard to pick another one."
          action={
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Back to dashboard
            </button>
          }
        />
      </PageShell>
    );
  }

  const updateFilters = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const updateMobileFilters = (key, value) => {
    setMobileFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(FRIEND_FILTER_DEFAULTS);
    setMobileFilters(FRIEND_FILTER_DEFAULTS);
  };

  const clearMobileFilters = () => {
    setMobileFilters(FRIEND_FILTER_DEFAULTS);
  };

  const applyMobileFilters = () => {
    setFilters(mobileFilters);
    setIsFilterSheetOpen(false);
  };

  return (
    <PageShell className="max-w-5xl">
      <PageBreadcrumbs
        mobileBackTo="/dashboard"
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Friends', to: '/dashboard#friends-section' },
          { label: friend.name, to: `/friend/${friend.id}` },
        ]}
      />

      <div className="space-y-6">
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="panel-title">Friend ledger</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                {friend.name}
              </h1>
              <div className="mt-3">
                <BalanceText balance={balance} />
              </div>
            </div>

            <div className="flex items-center gap-3 self-start">
              <SyncStatusButton status={syncStatus} onRetry={retrySync} />
              <button
                type="button"
                onClick={() => setIsTransactionModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Add Transaction
              </button>
              <button
                type="button"
                onClick={() => setIsOptionsModalOpen(true)}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:border-electric-500/25 hover:text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {friendTransactionsSource.length ? (
          <>
            <section className="glass-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="panel-title">Filters</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-100">
                    Refine this ledger
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(true)}
                  className="btn-ghost md:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                </button>
              </div>

              <div className="mt-6 hidden md:block">
                <FriendFiltersForm
                  filters={filters}
                  onChange={updateFilters}
                  onClear={clearFilters}
                  showClear={hasFilters}
                />
              </div>
            </section>

            {filteredTransactions.length ? (
              <>
                <div className="space-y-3 md:hidden">
                  <AnimatePresence initial={false}>
                    {filteredTransactions.map((transaction) => (
                      <MobileTransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        balance={runningBalances.get(transaction.id) || 0}
                        onDelete={() => setTransactionToDelete(transaction)}
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
                          <th className="px-6 py-4 font-medium">Purpose</th>
                          <th className="px-6 py-4 font-medium">Amount</th>
                          <th className="px-6 py-4 font-medium">Balance</th>
                          <th className="px-6 py-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <AnimatePresence initial={false}>
                          {filteredTransactions.map((transaction) => {
                            const isGiven = transaction.type === 'given';
                            const transactionBalance =
                              runningBalances.get(transaction.id) || 0;

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
                                <td className="px-6 py-4">{transaction.purpose}</td>
                                <td
                                  className={
                                    isGiven
                                      ? 'px-6 py-4 font-semibold text-danger'
                                      : 'px-6 py-4 font-semibold text-success'
                                  }
                                >
                                  {isGiven ? '+' : '-'}
                                  {formatCurrency(transaction.amount)}
                                </td>
                                <td
                                  className={
                                    transactionBalance > 0
                                      ? 'px-6 py-4 font-semibold text-success'
                                      : transactionBalance < 0
                                        ? 'px-6 py-4 font-semibold text-danger'
                                        : 'px-6 py-4 font-semibold text-slate-200'
                                  }
                                >
                                  {transactionBalance > 0
                                    ? '+'
                                    : transactionBalance < 0
                                      ? '-'
                                      : ''}
                                  {formatCurrency(Math.abs(transactionBalance))}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setTransactionToDelete(transaction)}
                                    className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-danger/25 hover:text-danger"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title="No transactions match those filters."
                description="Try widening the filter range or clear everything to see the full ledger again."
                action={
                  hasFilters ? (
                    <button type="button" onClick={clearFilters} className="btn-ghost">
                      Clear filters
                    </button>
                  ) : null
                }
              />
            )}
          </>
        ) : (
          <EmptyState
            title="No transactions yet. Add one!"
            description="Start with a given or received entry and this running balance view will fill in automatically."
            action={
              <button
                type="button"
                onClick={() => setIsTransactionModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Add transaction
              </button>
            }
          />
        )}
      </div>

      <AddTransactionModal
        open={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        friend={friend}
        onSave={addTransaction}
      />

      <DeleteTransactionModal
        open={Boolean(transactionToDelete)}
        onClose={() => setTransactionToDelete(null)}
        transaction={transactionToDelete}
        onDelete={deleteTransaction}
      />

      <FriendOptionsModal
        open={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        friend={friend}
        canDelete={!isDeleteBlocked}
        deleteHint={
          isDeleteBlocked
            ? 'This friend is still linked to a group. Remove them from the group first.'
            : undefined
        }
        onSaveName={(nextName) => updateFriend(friend.id, nextName)}
        onDelete={() => {
          const result = deleteFriend(friend.id);

          if (result.success) {
            navigate('/dashboard');
          }

          return result;
        }}
      />

      <MobileSheet
        open={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title={`${friend.name} filters`}
        description="Filter this friend ledger by type, purpose, date, and amount."
      >
        <FriendFiltersForm
          filters={mobileFilters}
          onChange={updateMobileFilters}
          onClear={clearMobileFilters}
          showClear={hasActiveFilters(mobileFilters)}
          onApply={applyMobileFilters}
          mobile
        />
      </MobileSheet>
    </PageShell>
  );
}
