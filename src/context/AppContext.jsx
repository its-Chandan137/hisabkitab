import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AUTH_PASSWORD,
  AUTH_USERNAME,
  SESSION_KEY,
} from '../lib/constants';
import {
  decryptAppData,
  getEncryptedAppData,
  getPendingSyncFlag,
  loadAppData,
  persistAppData,
  restoreAppDataFromEncrypted,
  setPendingSyncFlag,
} from '../lib/storage';
import { loadFromCloud, saveToCloud } from '../lib/sync';
import {
  createId,
  normalizeName,
  roundCurrency,
  toIsoDate,
} from '../lib/utils';
import { useToast } from './ToastContext';

const AppContext = createContext(null);

function hasDuplicateNames(friends, nextName, currentId) {
  return friends.some(
    (friend) =>
      friend.id !== currentId &&
      friend.name.toLowerCase() === nextName.toLowerCase(),
  );
}

function downloadBackupFile(content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hisabkitab-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function AppProvider({ children }) {
  const [data, setData] = useState(() => loadAppData());
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(sessionStorage.getItem(SESSION_KEY)),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    getPendingSyncFlag() ? 'error' : 'idle',
  );
  const { addToast } = useToast();
  const dataRef = useRef(data);
  const retryTimeoutRef = useRef(null);
  const hasBootstrappedSyncRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(
    () => () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    },
    [],
  );

  const scheduleRetry = (callback) => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = window.setTimeout(callback, 3000);
  };

  const saveSnapshotToCloud = async (
    snapshot,
    { allowRetry = true } = {},
  ) => {
    if (!AUTH_USERNAME) {
      return { success: false, skipped: true };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setPendingSyncFlag(true);
      setSyncStatus('error');
      return { success: false, offline: true };
    }

    setSyncStatus('syncing');

    try {
      await saveToCloud(
        AUTH_USERNAME,
        snapshot.encryptedData,
        snapshot.data.updatedAt,
      );
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      setPendingSyncFlag(false);
      setSyncStatus('synced');
      return { success: true };
    } catch (error) {
      console.warn('Cloud save failed.', error);
      setPendingSyncFlag(true);
      setSyncStatus('error');

      if (allowRetry) {
        scheduleRetry(() => {
          void saveSnapshotToCloud(getLocalSnapshot(), { allowRetry: false });
        });
      }

      return { success: false, error };
    }
  };

  const getLocalSnapshot = () => {
    const localData = loadAppData();
    const encryptedData =
      getEncryptedAppData() ||
      persistAppData(localData, {
        updatedAt: localData.updatedAt,
      }).encryptedData;

    return {
      data: localData,
      encryptedData,
    };
  };

  const initializeSync = async ({ markBootstrapped = false } = {}) => {
    if (markBootstrapped) {
      hasBootstrappedSyncRef.current = true;
    }

    const localSnapshot = getLocalSnapshot();

    if (!AUTH_USERNAME) {
      setSyncStatus('idle');
      return { success: false, skipped: true, data: localSnapshot.data };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus(getPendingSyncFlag() ? 'error' : 'idle');
      return { success: false, offline: true, data: localSnapshot.data };
    }

    setSyncStatus('syncing');

    try {
      const cloudRow = await loadFromCloud(AUTH_USERNAME);

      if (!cloudRow?.data) {
        await saveSnapshotToCloud(localSnapshot);
        return { success: true, data: localSnapshot.data };
      }

      const cloudPayload = decryptAppData(cloudRow.data, cloudRow.updated_at);
      const localUpdatedAt = new Date(
        localSnapshot.data.updatedAt || 0,
      ).getTime();
      const cloudUpdatedAt = new Date(
        cloudRow.updated_at || cloudPayload.data.updatedAt || 0,
      ).getTime();

      if (cloudUpdatedAt > localUpdatedAt) {
        const restoredCloudPayload = persistAppData(cloudPayload.data, {
          updatedAt: cloudRow.updated_at || cloudPayload.data.updatedAt,
        });
        dataRef.current = restoredCloudPayload.data;
        setData(restoredCloudPayload.data);
        await saveSnapshotToCloud(restoredCloudPayload);
        return { success: true, data: restoredCloudPayload.data };
      }

      await saveSnapshotToCloud(localSnapshot);
      return { success: true, data: localSnapshot.data };
    } catch (error) {
      console.warn('Initial sync failed.', error);
      setPendingSyncFlag(true);
      setSyncStatus('error');

      scheduleRetry(() => {
        void initializeSync();
      });

      return { success: false, error, data: localSnapshot.data };
    }
  };

  useEffect(() => {
    if (!isAuthenticated || hasBootstrappedSyncRef.current) {
      return;
    }

    void initializeSync({ markBootstrapped: true });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const handleOnline = () => {
      if (getPendingSyncFlag()) {
        void initializeSync();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated]);

  const commit = (updater, toastConfig) => {
    const baseData = dataRef.current;
    const nextData =
      typeof updater === 'function' ? updater(baseData) : updater;
    const snapshot = persistAppData(nextData, {
      updatedAt: new Date().toISOString(),
    });

    dataRef.current = snapshot.data;
    setData(snapshot.data);

    if (toastConfig) {
      addToast(toastConfig);
    }

    if (isAuthenticated) {
      void saveSnapshotToCloud(snapshot);
    } else {
      setPendingSyncFlag(true);
    }

    return snapshot;
  };

  const login = async (username, password) => {
    if (!AUTH_USERNAME || !AUTH_PASSWORD) {
      return {
        success: false,
        message: 'Add login credentials to your .env file before signing in.',
      };
    }

    if (username.trim() !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
      return {
        success: false,
        message: 'That username or password does not match.',
      };
    }

    await initializeSync({ markBootstrapped: true });
    sessionStorage.setItem(SESSION_KEY, AUTH_USERNAME);
    setIsAuthenticated(true);

    return { success: true };
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    hasBootstrappedSyncRef.current = false;
    setIsAuthenticated(false);
    setSyncStatus(getPendingSyncFlag() ? 'error' : 'idle');
  };

  const retrySync = async () => {
    return initializeSync();
  };

  const exportData = () => {
    const encryptedData = getEncryptedAppData();

    if (!encryptedData) {
      addToast({
        title: 'Nothing to export',
        message: 'Your ledger is empty.',
        tone: 'info',
      });
      return;
    }

    downloadBackupFile(
      JSON.stringify(
        {
          username: AUTH_USERNAME || 'local-user',
          exportedAt: new Date().toISOString(),
          encryptedData,
        },
        null,
        2,
      ),
    );

    addToast({
      title: 'Backup exported',
      message: 'Encrypted backup downloaded successfully.',
      tone: 'success',
    });
  };

  const importData = async (file) => {
    if (!file) {
      return { success: false };
    }

    try {
      const rawText = await file.text();
      const parsedContent = JSON.parse(rawText);
      const encryptedData =
        typeof parsedContent === 'string'
          ? parsedContent
          : parsedContent?.encryptedData;

      if (typeof encryptedData !== 'string') {
        throw new Error('Encrypted backup payload is missing.');
      }

      const restoredSnapshot = restoreAppDataFromEncrypted(encryptedData);
      dataRef.current = restoredSnapshot.data;
      setData(restoredSnapshot.data);
      setPendingSyncFlag(true);

      addToast({
        title: 'Backup restored',
        message: 'Encrypted data was imported successfully.',
        tone: 'success',
      });

      if (isAuthenticated) {
        void saveSnapshotToCloud(restoredSnapshot);
      }

      return { success: true };
    } catch (error) {
      console.warn('Import failed.', error);
      addToast({
        title: 'Import failed',
        message: 'This backup file could not be restored.',
        tone: 'danger',
      });
      return { success: false, error };
    }
  };

  const addFriend = (name) => {
    const cleanedName = normalizeName(name);

    if (!cleanedName) {
      return { success: false, message: 'Friend name cannot be empty.' };
    }

    if (hasDuplicateNames(dataRef.current.friends, cleanedName)) {
      return { success: false, message: 'That friend already exists.' };
    }

    const friend = {
      id: createId('friend'),
      name: cleanedName,
      createdAt: new Date().toISOString(),
    };

    commit(
      (currentData) => ({
        ...currentData,
        friends: [friend, ...currentData.friends],
      }),
      {
        title: 'Friend added',
        message: `${cleanedName} is ready to track.`,
        tone: 'success',
      },
    );

    return { success: true, friend };
  };

  const addTransaction = ({ friendId, type, amount, purpose, date, groupId }) => {
    const cleanedPurpose = normalizeName(purpose);
    const numericAmount = roundCurrency(amount);

    if (!friendId || !cleanedPurpose || !numericAmount) {
      return {
        success: false,
        message: 'Amount, purpose, and friend are required.',
      };
    }

    const transaction = {
      id: createId('txn'),
      friendId,
      type,
      amount: numericAmount,
      purpose: cleanedPurpose,
      date: toIsoDate(date),
      createdAt: new Date().toISOString(),
      ...(groupId ? { groupId } : {}),
    };

    commit(
      (currentData) => ({
        ...currentData,
        transactions: [transaction, ...currentData.transactions],
      }),
      {
        title: 'Transaction saved',
        message: 'Ledger updated securely.',
        tone: 'success',
      },
    );

    return { success: true, transaction };
  };

  const deleteTransaction = (transactionId) => {
    commit(
      (currentData) => ({
        ...currentData,
        transactions: currentData.transactions.filter(
          (transaction) => transaction.id !== transactionId,
        ),
      }),
      {
        title: 'Transaction deleted',
        message: 'The entry has been removed.',
        tone: 'danger',
      },
    );
  };

  const updateFriend = (friendId, nextName) => {
    const cleanedName = normalizeName(nextName);

    if (!cleanedName) {
      return { success: false, message: 'Friend name cannot be empty.' };
    }

    if (hasDuplicateNames(dataRef.current.friends, cleanedName, friendId)) {
      return { success: false, message: 'A friend with that name already exists.' };
    }

    commit(
      (currentData) => ({
        ...currentData,
        friends: currentData.friends.map((friend) =>
          friend.id === friendId ? { ...friend, name: cleanedName } : friend,
        ),
      }),
      {
        title: 'Friend updated',
        message: `${cleanedName} is ready to track.`,
        tone: 'success',
      },
    );

    return { success: true };
  };

  const deleteFriend = (friendId) => {
    const friend = dataRef.current.friends.find((entry) => entry.id === friendId);
    const isPartOfGroup = dataRef.current.groups.some((group) =>
      group.members.some((member) => member.friendId === friendId),
    );
    const paidGroupExpense = dataRef.current.groupExpenses.some(
      (expense) => expense.paidBy === friendId,
    );

    if (!friend) {
      return { success: false, message: 'Friend not found.' };
    }

    if (isPartOfGroup || paidGroupExpense) {
      return {
        success: false,
        message: 'Remove this person from groups before deleting them.',
      };
    }

    commit(
      (currentData) => ({
        ...currentData,
        friends: currentData.friends.filter((entry) => entry.id !== friendId),
        transactions: currentData.transactions.filter(
          (transaction) => transaction.friendId !== friendId,
        ),
      }),
      {
        title: 'Friend deleted',
        message: `${friend.name} and their ledger were removed.`,
        tone: 'danger',
      },
    );

    return { success: true };
  };

  const saveGroup = ({ groupId, name, members }) => {
    const cleanedName = normalizeName(name);

    if (!cleanedName || members.length === 0) {
      return {
        success: false,
        message: 'Add a group name and at least one member.',
      };
    }

    let savedGroup = null;

    commit(
      (currentData) => {
        const nextFriends = [...currentData.friends];
        const resolvedMembers = [];

        members.forEach((member) => {
          if (member.friendId) {
            if (
              !resolvedMembers.some(
                (existingMember) => existingMember.friendId === member.friendId,
              )
            ) {
              resolvedMembers.push({ friendId: member.friendId });
            }
            return;
          }

          const customName = normalizeName(member.name || '');

          if (!customName) {
            return;
          }

          const existingFriend = nextFriends.find(
            (friend) => friend.name.toLowerCase() === customName.toLowerCase(),
          );

          const friendId = existingFriend?.id || createId('friend');

          if (!existingFriend) {
            nextFriends.push({
              id: friendId,
              name: customName,
              createdAt: new Date().toISOString(),
            });
          }

          if (
            !resolvedMembers.some(
              (existingMember) => existingMember.friendId === friendId,
            )
          ) {
            resolvedMembers.push({ friendId });
          }
        });

        const nextGroup = groupId
          ? {
              ...(currentData.groups.find((group) => group.id === groupId) || {}),
              id: groupId,
              name: cleanedName,
              members: resolvedMembers,
            }
          : {
              id: createId('group'),
              name: cleanedName,
              members: resolvedMembers,
              createdAt: new Date().toISOString(),
            };

        savedGroup = nextGroup;

        return {
          ...currentData,
          friends: nextFriends,
          groups: groupId
            ? currentData.groups.map((group) =>
                group.id === groupId ? nextGroup : group,
              )
            : [nextGroup, ...currentData.groups],
        };
      },
      {
        title: groupId ? 'Group updated' : 'Group created',
        message: `${cleanedName} is ready for shared expenses.`,
        tone: 'success',
      },
    );

    return { success: true, group: savedGroup };
  };

  const addGroupExpense = ({ groupId, item, totalAmount, paidBy, date }) => {
    const group = dataRef.current.groups.find((entry) => entry.id === groupId);
    const cleanedItem = normalizeName(item);
    const numericTotal = roundCurrency(totalAmount);

    if (!group || !cleanedItem || !numericTotal || !paidBy) {
      return {
        success: false,
        message: 'Item, total, payer, and group are required.',
      };
    }

    const splitAmount = roundCurrency(numericTotal / (group.members.length + 1));
    const isoDate = toIsoDate(date);
    const expense = {
      id: createId('expense'),
      groupId,
      item: cleanedItem,
      totalAmount: numericTotal,
      paidBy,
      splitAmount,
      date: isoDate,
      createdAt: new Date().toISOString(),
    };

    commit(
      (currentData) => ({
        ...currentData,
        groupExpenses: [expense, ...currentData.groupExpenses],
      }),
      {
        title: 'Expense added',
        message: `${group.name} group balances were updated.`,
        tone: 'success',
      },
    );

    return { success: true, expense };
  };

  return (
    <AppContext.Provider
      value={{
        ...data,
        isAuthenticated,
        syncStatus,
        login,
        logout,
        retrySync,
        exportData,
        importData,
        addFriend,
        addTransaction,
        deleteTransaction,
        updateFriend,
        deleteFriend,
        saveGroup,
        addGroupExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }

  return context;
}
