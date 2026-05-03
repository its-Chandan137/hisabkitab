import { useEffect, useState } from 'react';
import { Plus, ReceiptIndianRupee, UsersRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ExpenseModal from '../components/modals/ExpenseModal';
import GroupModal from '../components/modals/GroupModal';
import BalanceText from '../components/shared/BalanceText';
import EmptyState from '../components/shared/EmptyState';
import ModalShell from '../components/shared/ModalShell';
import PageBreadcrumbs from '../components/shared/PageBreadcrumbs';
import PageShell from '../components/shared/PageShell';
import SyncStatusButton from '../components/shared/SyncStatusButton';
import { useAppContext } from '../context/AppContext';
import {
  calculateGroupBalance,
  calculateGroupMemberBalance,
  formatCurrency,
  formatDisplayDate,
  getTodayInputValue,
  resolveMemberName,
} from '../lib/utils';

function GroupCard({ group, active, summary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'glass-card w-full p-5 text-left'
          : 'surface-panel w-full border border-white/5 p-5 text-left transition hover:border-electric-500/25 hover:bg-electric-500/5'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-100">{group.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {group.members.length + 1} members including you
          </p>
        </div>
        <UsersRound className="h-5 w-5 text-electric-300" />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-400">Group balance</span>
        <span className="font-semibold text-electric-200">{summary}</span>
      </div>

      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
        Created {formatDisplayDate(group.createdAt)}
      </p>
    </button>
  );
}

function MemberPaymentModal({
  open,
  onClose,
  memberName,
  balance,
  onSubmit,
}) {
  const [date, setDate] = useState(getTodayInputValue());
  const [amountMode, setAmountMode] = useState('full');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setDate(getTodayInputValue());
    setAmountMode('full');
    setCustomAmount('');
  }, [open]);

  const amount = amountMode === 'full' ? balance : Number(customAmount);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!amount || amount <= 0) {
      return;
    }

    onSubmit({
      date,
      amount,
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Record payment"
      className="max-w-lg"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="surface-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Member</span>
            <span className="text-right text-slate-100">{memberName}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Outstanding</span>
            <span className="text-slate-100">{formatCurrency(balance)}</span>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="input-field"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Amount
          </span>
          <select
            value={amountMode}
            onChange={(event) => setAmountMode(event.target.value)}
            className="input-field"
          >
            <option value="full">Full Amount</option>
            <option value="custom">Custom Amount</option>
          </select>
        </label>

        {amountMode === 'full' ? (
          <div className="surface-panel p-4">
            <p className="text-sm text-slate-400">Full Amount</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {formatCurrency(balance)}
            </p>
          </div>
        ) : (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Custom Amount
            </span>
            <input
              type="number"
              min="0"
              max={balance}
              step="0.01"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              className="input-field"
              placeholder="0"
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Submit
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function GroupsPage() {
  const {
    friends,
    groups,
    groupExpenses,
    groupPayments,
    saveGroup,
    deleteGroup,
    addGroupExpense,
    addGroupPayment,
    retrySync,
    syncStatus,
  } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [payingMember, setPayingMember] = useState(null);

  const selectedGroupId = searchParams.get('groupId');
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) || groups[0] || null;

  useEffect(() => {
    if (!selectedGroupId && groups[0]) {
      setSearchParams({ groupId: groups[0].id }, { replace: true });
    }
  }, [groups, selectedGroupId, setSearchParams]);

  const selectedExpenses = selectedGroup
    ? groupExpenses
        .filter((expense) => expense.groupId === selectedGroup.id)
        .sort((left, right) => new Date(right.date) - new Date(left.date))
    : [];
  const selectedPayments = selectedGroup
    ? groupPayments
        .filter((payment) => payment.groupId === selectedGroup.id)
        .sort(
          (left, right) =>
            new Date(right.createdAt || right.date) -
            new Date(left.createdAt || left.date),
        )
    : [];
  const totalSpent = selectedExpenses.reduce(
    (total, expense) => total + Number(expense.totalAmount || 0),
    0,
  );

  const handlePaymentSubmit = ({ amount, date }) => {
    if (!selectedGroup || !payingMember) {
      return;
    }

    const result = addGroupPayment({
      groupId: selectedGroup.id,
      friendId: payingMember.friendId,
      amount,
      date,
      balanceBefore: payingMember.balance,
    });

    if (result.success) {
      setPayingMember(null);
    }
  };

  return (
    <PageShell className="max-w-7xl">
      <PageBreadcrumbs
        mobileBackTo="/dashboard"
        items={
          selectedGroup
            ? [
                { label: 'Home', to: '/dashboard' },
                { label: 'Groups', to: '/groups' },
                { label: selectedGroup.name, to: `/groups?groupId=${selectedGroup.id}` },
              ]
            : [
                { label: 'Home', to: '/dashboard' },
                { label: 'Groups', to: '/groups' },
              ]
        }
      />

      <div className="space-y-6">
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="panel-title">Groups</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                Shared expenses
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Build a group, split every bill, and keep these balances separate
                from your personal friend ledgers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingGroup(null);
                setIsGroupModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              New Group
            </button>
          </div>
        </section>

        {groups.length ? (
          <div className="grid gap-6 xl:grid-cols-[22rem,minmax(0,1fr)]">
            <div className="space-y-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  active={selectedGroup?.id === group.id}
                  summary={formatCurrency(
                    Math.abs(
                      calculateGroupBalance(groupExpenses, group, groupPayments),
                    ),
                  )}
                  onClick={() => setSearchParams({ groupId: group.id })}
                />
              ))}
            </div>

            {selectedGroup ? (
              <div className="space-y-6">
                <section className="glass-card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="panel-title">Group detail</p>
                      <h2 className="mt-2 text-3xl font-bold text-white">
                        {selectedGroup.name}
                      </h2>
                      <p className="mt-3 text-sm text-slate-400">
                        {selectedGroup.members.length + 1} members including you
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <SyncStatusButton status={syncStatus} onRetry={retrySync} />
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroup(selectedGroup);
                          setIsGroupModalOpen(true);
                        }}
                        className="btn-ghost"
                      >
                        Edit group
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="btn-primary"
                      >
                        <Plus className="h-4 w-4" />
                        Add Expense
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-panel p-4">
                      <p className="text-sm text-slate-400">Total spent</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-100">
                        {formatCurrency(totalSpent)}
                      </p>
                    </div>

                    <div className="surface-panel p-4">
                      <p className="text-sm text-slate-400">Outstanding</p>
                      <p className="mt-3 text-2xl font-semibold text-electric-200">
                        {formatCurrency(
                          Math.abs(
                            calculateGroupBalance(
                              groupExpenses,
                              selectedGroup,
                              groupPayments,
                            ),
                          ),
                        )}
                      </p>
                    </div>

                    {selectedGroup.members.map((member) => {
                      const memberName = resolveMemberName(member, friends);
                      const balance = calculateGroupMemberBalance(
                        groupExpenses,
                        selectedGroup,
                        member.friendId,
                        groupPayments,
                      );

                      return (
                        <div key={member.friendId} className="surface-panel p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-slate-400">{memberName}</p>
                            {balance > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPayingMember({
                                    friendId: member.friendId,
                                    name: memberName,
                                    balance,
                                  })
                                }
                                className="btn-ghost px-3 py-2 text-xs"
                              >
                                Paid
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-3">
                            <BalanceText balance={balance} zeroLabel="Settled" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="panel-title">Expenses</p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-100">
                        Group ledger
                      </h3>
                    </div>
                    <div className="hidden rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-2 text-sm text-electric-200 sm:block">
                      Total outstanding{' '}
                      {formatCurrency(
                        Math.abs(
                          calculateGroupBalance(
                            groupExpenses,
                            selectedGroup,
                            groupPayments,
                          ),
                        ),
                      )}
                    </div>
                  </div>

                  {selectedExpenses.length ? (
                    <div className="grid gap-4">
                      {selectedExpenses.map((expense) => {
                        const paidByName =
                          expense.paidBy === 'me'
                            ? 'Me'
                            : friends.find((friend) => friend.id === expense.paidBy)?.name ||
                              'Unknown';

                        return (
                          <div
                            key={expense.id}
                            className="surface-panel border border-white/5 p-5"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="flex items-center gap-2 text-electric-300">
                                  <ReceiptIndianRupee className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {expense.item}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-slate-400">
                                  Paid by {paidByName} on{' '}
                                  {formatDisplayDate(expense.date)}
                                </p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white/5 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Total
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-100">
                                    {formatCurrency(expense.totalAmount)}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-white/5 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Split
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-100">
                                    {formatCurrency(expense.splitAmount)}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-white/5 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                    Members
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-100">
                                    {selectedGroup.members.length + 1}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="No expenses yet."
                      description="Add one and the split will stay inside this group view without changing your personal friend ledgers."
                      action={
                        <button
                          type="button"
                          onClick={() => setIsExpenseModalOpen(true)}
                          className="btn-primary"
                        >
                          <Plus className="h-4 w-4" />
                          Add expense
                        </button>
                      }
                    />
                  )}
                </section>

                <section className="space-y-4">
                  <div>
                    <p className="panel-title">Payments</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-100">
                      {selectedGroup.name} Track Record
                    </h3>
                  </div>

                  {selectedPayments.length ? (
                    <>
                      <div className="hidden overflow-hidden rounded-3xl border border-electric-500/[0.15] bg-slate-950/[0.55] shadow-soft backdrop-blur-xl md:block">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-white/5 text-left">
                            <thead className="bg-white/[0.03]">
                              <tr className="text-sm uppercase tracking-[0.18em] text-slate-400">
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Amount Paid</th>
                                <th className="px-6 py-4 font-medium">
                                  Balance Remaining
                                </th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {selectedPayments.map((payment) => {
                                const memberName =
                                  friends.find(
                                    (friend) => friend.id === payment.friendId,
                                  )?.name || 'Unknown';
                                const remaining =
                                  Number(payment.balanceRemaining) || 0;

                                return (
                                  <tr
                                    key={payment.id}
                                    className="text-sm text-slate-300"
                                  >
                                    <td className="px-6 py-4">{memberName}</td>
                                    <td className="px-6 py-4">
                                      {formatCurrency(payment.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                      {formatCurrency(remaining)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                      {formatDisplayDate(payment.date)}
                                    </td>
                                    <td className="px-6 py-4">
                                      {remaining <= 0 ? 'Full' : 'Partial'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-3 md:hidden">
                        {selectedPayments.map((payment) => {
                          const memberName =
                            friends.find(
                              (friend) => friend.id === payment.friendId,
                            )?.name || 'Unknown';
                          const remaining = Number(payment.balanceRemaining) || 0;

                          return (
                            <div
                              key={payment.id}
                              className="surface-panel border border-white/5 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-100">
                                    {memberName}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {formatDisplayDate(payment.date)}
                                  </p>
                                </div>
                                <span className="text-sm text-slate-300">
                                  {remaining <= 0 ? 'Full' : 'Partial'}
                                </span>
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-2xl bg-white/5 p-3">
                                  <p className="text-slate-400">Amount Paid</p>
                                  <p className="mt-1 font-semibold text-slate-100">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3">
                                  <p className="text-slate-400">
                                    Balance Remaining
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-100">
                                    {formatCurrency(remaining)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="No payments recorded yet."
                      description="Use Paid on an outstanding member to add a track record entry."
                    />
                  )}
                </section>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="No groups yet."
            description="Create your first group to track trips, dinners, and shared purchases."
            action={
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Create group
              </button>
            }
          />
        )}
      </div>

      <GroupModal
        open={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        friends={friends}
        onSave={saveGroup}
        onDelete={deleteGroup}
      />

      <ExpenseModal
        open={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        group={selectedGroup}
        friends={friends}
        onSave={addGroupExpense}
      />

      <MemberPaymentModal
        open={Boolean(payingMember)}
        onClose={() => setPayingMember(null)}
        memberName={payingMember?.name || ''}
        balance={payingMember?.balance || 0}
        onSubmit={handlePaymentSubmit}
      />
    </PageShell>
  );
}
