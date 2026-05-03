import { format, isValid, parseISO } from 'date-fns';

export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export function createId(prefix = 'hk') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function roundCurrency(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (typeof value === 'string' && value.includes('T')) {
    return new Date(value).toISOString();
  }

  return new Date(`${value}T12:00:00`).toISOString();
}

export function formatDisplayDate(value) {
  if (!value) {
    return '-';
  }

  const parsed =
    typeof value === 'string' ? parseISO(value) : new Date(value);

  if (!isValid(parsed)) {
    return '-';
  }

  return format(parsed, 'dd MMM yyyy');
}

export function getTodayInputValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatCurrency(amount) {
  const numericAmount = Number(amount) || 0;
  const hasFraction = Math.abs(numericAmount % 1) > 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function calculateBalance(transactions) {
  return transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount) || 0;
    return transaction.type === 'given' ? total + amount : total - amount;
  }, 0);
}

export function sortTransactionsNewestFirst(transactions) {
  return [...transactions].sort(
    (left, right) => new Date(right.date) - new Date(left.date),
  );
}

export function sortTransactionsByCreatedAtNewestFirst(transactions) {
  return [...transactions].sort(
    (left, right) =>
      new Date(right.createdAt || right.date) -
      new Date(left.createdAt || left.date),
  );
}

export function sortTransactionsOldestFirst(transactions) {
  return [...transactions].sort(
    (left, right) => new Date(left.date) - new Date(right.date),
  );
}

export function buildRunningBalances(transactions) {
  const runningBalances = new Map();
  let runningBalance = 0;

  sortTransactionsOldestFirst(transactions).forEach((transaction) => {
    runningBalance +=
      transaction.type === 'given'
        ? Number(transaction.amount) || 0
        : -(Number(transaction.amount) || 0);
    runningBalances.set(transaction.id, roundCurrency(runningBalance));
  });

  return runningBalances;
}

export function getInitials(name) {
  return normalizeName(name)
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function resolveMemberName(member, friends) {
  if (member.friendId) {
    return friends.find((friend) => friend.id === member.friendId)?.name || 'Unknown';
  }

  return member.name || 'Unknown';
}

export function isDateInRange(value, dateFrom, dateTo) {
  const currentDate = new Date(value);

  if (dateFrom && currentDate < new Date(`${dateFrom}T00:00:00`)) {
    return false;
  }

  if (dateTo && currentDate > new Date(`${dateTo}T23:59:59.999`)) {
    return false;
  }

  return true;
}

export function isAmountInRange(value, amountMin, amountMax) {
  const numericValue = Number(value) || 0;

  if (amountMin !== '' && numericValue < Number(amountMin)) {
    return false;
  }

  if (amountMax !== '' && numericValue > Number(amountMax)) {
    return false;
  }

  return true;
}

export function filterTransactions(transactions, filters) {
  const normalizedSearch = normalizeName(filters.search || '').toLowerCase();

  return transactions.filter((transaction) => {
    if (filters.friendId && transaction.friendId !== filters.friendId) {
      return false;
    }

    if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }

    if (
      normalizedSearch &&
      !transaction.purpose.toLowerCase().includes(normalizedSearch)
    ) {
      return false;
    }

    if (!isDateInRange(transaction.date, filters.dateFrom, filters.dateTo)) {
      return false;
    }

    if (!isAmountInRange(transaction.amount, filters.amountMin, filters.amountMax)) {
      return false;
    }

    return true;
  });
}

export function sortTransactionsByOption(transactions, sortBy) {
  const sortedTransactions = [...transactions];

  switch (sortBy) {
    case 'date-asc':
      return sortedTransactions.sort(
        (left, right) => new Date(left.date) - new Date(right.date),
      );
    case 'date-desc':
      return sortedTransactions.sort(
        (left, right) => new Date(right.date) - new Date(left.date),
      );
    case 'amount-asc':
      return sortedTransactions.sort(
        (left, right) => Number(left.amount) - Number(right.amount),
      );
    case 'amount-desc':
      return sortedTransactions.sort(
        (left, right) => Number(right.amount) - Number(left.amount),
      );
    case 'recent':
    default:
      return sortTransactionsByCreatedAtNewestFirst(sortedTransactions);
  }
}

export function hasActiveFilters(filters, ignoredKeys = []) {
  return Object.entries(filters).some(([key, value]) => {
    if (ignoredKeys.includes(key)) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim() !== '' && value !== 'all' && value !== 'recent';
    }

    return Boolean(value);
  });
}

export function calculateGroupMemberBalance(
  groupExpenses,
  group,
  friendId,
  groupPayments = [],
) {
  if (!group) {
    return 0;
  }

  const expenseBalance = groupExpenses
    .filter((expense) => expense.groupId === group.id)
    .reduce((total, expense) => {
      const splitAmount = Number(expense.splitAmount) || 0;

      if (expense.paidBy === 'me') {
        return total + splitAmount;
      }

      if (expense.paidBy === friendId) {
        return total - splitAmount;
      }

      return total;
    }, 0);

  const paidBalance = groupPayments
    .filter(
      (payment) =>
        payment.groupId === group.id && payment.friendId === friendId,
    )
    .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);

  return roundCurrency(expenseBalance - paidBalance);
}

export function calculateGroupBalance(groupExpenses, group, groupPayments = []) {
  if (!group) {
    return 0;
  }

  return roundCurrency(
    group.members.reduce(
      (total, member) =>
        total +
        calculateGroupMemberBalance(
          groupExpenses,
          group,
          member.friendId,
          groupPayments,
        ),
      0,
    ),
  );
}
