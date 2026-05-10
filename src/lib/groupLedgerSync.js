import { DATA_VERSION } from './constants';
import { createId, roundCurrency } from './utils';

export const GROUP_LEDGER_SYNC_VERSION = 1;

function getGroupMemberIds(group) {
  return (group?.members || [])
    .map((member) => member.friendId)
    .filter(Boolean);
}

function getSyncedTransactionId(expenseId, friendId) {
  return `group_txn_${expenseId}_${friendId}`;
}

function getOutstandingByExpense(expenses, payments) {
  const outstanding = new Map();
  let remainingPayment = payments.reduce(
    (total, payment) => total + (Number(payment.amount) || 0),
    0,
  );

  expenses
    .slice()
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .forEach((expense) => {
      const splitAmount = Number(expense.splitAmount) || 0;
      const appliedPayment = Math.min(splitAmount, remainingPayment);
      remainingPayment = roundCurrency(remainingPayment - appliedPayment);
      outstanding.set(expense.id, roundCurrency(splitAmount - appliedPayment));
    });

  return outstanding;
}

function buildGroupSyncedTransactions(data) {
  const syncedTransactions = [];
  const groupsById = new Map((data.groups || []).map((group) => [group.id, group]));
  const paymentsByGroupAndFriend = new Map();

  (data.groupPayments || []).forEach((payment) => {
    const key = `${payment.groupId}:${payment.friendId}`;
    paymentsByGroupAndFriend.set(key, [
      ...(paymentsByGroupAndFriend.get(key) || []),
      payment,
    ]);
  });

  (data.groups || []).forEach((group) => {
    const memberIds = getGroupMemberIds(group);

    memberIds.forEach((friendId) => {
      const relatedExpenses = (data.groupExpenses || []).filter((expense) => {
        if (expense.groupId !== group.id) {
          return false;
        }

        return expense.paidBy === 'me' || expense.paidBy === friendId;
      });
      const payments =
        paymentsByGroupAndFriend.get(`${group.id}:${friendId}`) || [];
      const outstandingByExpense = getOutstandingByExpense(
        relatedExpenses,
        payments,
      );

      relatedExpenses.forEach((expense) => {
        const remainingAmount = outstandingByExpense.get(expense.id) ?? 0;
        const splitAmount = Number(expense.splitAmount) || 0;

        syncedTransactions.push({
          id: getSyncedTransactionId(expense.id, friendId),
          friendId,
          type: expense.paidBy === 'me' ? 'given' : 'received',
          amount: roundCurrency(remainingAmount),
          originalAmount: roundCurrency(splitAmount),
          purpose: expense.item,
          date: expense.date,
          createdAt: expense.createdAt || expense.date,
          groupId: group.id,
          groupExpenseId: expense.id,
          groupName: groupsById.get(expense.groupId)?.name || group.name,
          isGroupSynced: true,
          readOnly: true,
          settled: remainingAmount <= 0,
        });
      });
    });
  });

  return syncedTransactions;
}

function restoreMissingGroupFriends(data) {
  const friends = [...(data.friends || [])];
  const friendsById = new Map(friends.map((friend) => [friend.id, friend]));

  (data.groups || []).forEach((group) => {
    (group.members || []).forEach((member) => {
      if (!member.friendId || friendsById.has(member.friendId)) {
        return;
      }

      const friend = {
        id: member.friendId,
        name: member.name || 'Unknown Friend',
        createdAt: group.createdAt || new Date().toISOString(),
      };

      friends.push(friend);
      friendsById.set(friend.id, friend);
    });
  });

  return friends;
}

export function syncGroupLedgers(data, options = {}) {
  const friends = restoreMissingGroupFriends(data);
  const manualTransactions = (data.transactions || []).filter(
    (transaction) => !transaction.isGroupSynced,
  );
  const groupTransactions = buildGroupSyncedTransactions({
    ...data,
    friends,
  });

  return {
    ...data,
    version: data.version ?? DATA_VERSION,
    groupLedgerSyncVersion:
      options.markMigrated === false
        ? data.groupLedgerSyncVersion
        : GROUP_LEDGER_SYNC_VERSION,
    friends,
    transactions: [...groupTransactions, ...manualTransactions],
  };
}

export function createFriendFromName(name) {
  return {
    id: createId('friend'),
    name,
    createdAt: new Date().toISOString(),
  };
}
