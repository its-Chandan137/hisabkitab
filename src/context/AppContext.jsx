import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ADMIN_EMAIL } from '../lib/constants';
import { fetchProfile } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  decryptAppData,
  configureStorageScope,
  createEmptyAppData,
  getEncryptedAppData,
  getPendingSyncFlag,
  loadAppData,
  persistAppData,
  restoreAppDataFromEncrypted,
  setPendingSyncFlag,
} from '../lib/storage';
import { createFriendFromName, syncGroupLedgers } from '../lib/groupLedgerSync';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() =>
    getPendingSyncFlag() ? 'error' : 'idle',
  );
  const { addToast } = useToast();
  const dataRef = useRef(data);
  const retryTimeoutRef = useRef(null);
  const hasBootstrappedSyncRef = useRef(false);
  const currentUserRef = useRef(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(
    () => () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    let isMounted = true;

    const applySession = async (session) => {
      const user = session?.user || null;

      if (!user) {
        if (!isMounted) {
          return;
        }
        currentUserRef.current = null;
        configureStorageScope(null);
        setCurrentUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setIsAuthLoading(false);
        setSyncStatus(getPendingSyncFlag() ? 'error' : 'idle');
        return;
      }

      try {
        const nextProfile = await fetchProfile(user.id);
        const isApproved = nextProfile?.status === 'approved';

        if (!isMounted) {
          return;
        }

        currentUserRef.current = isApproved ? user : null;
        configureStorageScope(user.id, {
          useLegacyFallback:
            isApproved && user.email?.toLowerCase() === ADMIN_EMAIL,
        });
        if (isApproved) {
          const scopedData = loadAppData();
          dataRef.current = scopedData;
          setData(scopedData);
        }
        setCurrentUser(isApproved ? user : null);
        setProfile(nextProfile);
        setIsAuthenticated(isApproved);
        setIsAuthLoading(false);

        if (!isApproved) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.warn('Unable to load auth profile.', error);
        if (isMounted) {
          currentUserRef.current = null;
          configureStorageScope(null);
          setCurrentUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          setIsAuthLoading(false);
        }
      }
    };

    supabase.auth.getSession().then(({ data: sessionData }) => {
      void applySession(sessionData.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session);
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
    const userId = currentUserRef.current?.id;

    if (!userId) {
      return { success: false, skipped: true };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setPendingSyncFlag(true);
      setSyncStatus('error');
      return { success: false, offline: true };
    }

    setSyncStatus('syncing');

    try {
      const { saveToCloud } = await import('../lib/sync');

      await saveToCloud(
        userId,
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
    const existingEncryptedData = getEncryptedAppData();
    const encryptedData =
      existingEncryptedData ||
      persistAppData(localData, {
        updatedAt: localData.updatedAt,
      }).encryptedData;

    return {
      data: localData,
      encryptedData,
      hasEncryptedData: Boolean(existingEncryptedData),
    };
  };

  const initializeSync = async ({ markBootstrapped = false } = {}) => {
    if (markBootstrapped) {
      hasBootstrappedSyncRef.current = true;
    }

    const userId = currentUserRef.current?.id;

    if (!userId) {
      const localSnapshot = getLocalSnapshot();
      setSyncStatus('idle');
      return { success: false, skipped: true, data: localSnapshot.data };
    }

    const localSnapshot = getLocalSnapshot();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus(getPendingSyncFlag() ? 'error' : 'idle');
      return { success: false, offline: true, data: localSnapshot.data };
    }

    setSyncStatus('syncing');

    try {
      const { loadFromCloud } = await import('../lib/sync');
      const cloudRow = await loadFromCloud(userId);

      if (!cloudRow?.data) {
        const emptyData = createEmptyAppData();
        const emptySnapshot = persistAppData(emptyData, {
          updatedAt: emptyData.updatedAt,
        });

        dataRef.current = emptySnapshot.data;
        setData(emptySnapshot.data);
        setPendingSyncFlag(false);
        setSyncStatus('idle');
        return { success: true, data: emptySnapshot.data };
      }

      const cloudPayload = decryptAppData(cloudRow.data, cloudRow.updated_at);

      if (!localSnapshot.hasEncryptedData) {
        const restoredCloudPayload = persistAppData(cloudPayload.data, {
          updatedAt: cloudRow.updated_at || cloudPayload.data.updatedAt,
        });
        dataRef.current = restoredCloudPayload.data;
        setData(restoredCloudPayload.data);
        setPendingSyncFlag(false);
        setSyncStatus('synced');
        return { success: true, data: restoredCloudPayload.data };
      }

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
    const syncedData = syncGroupLedgers(nextData);
    const snapshot = persistAppData(syncedData, {
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
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase is not configured.',
      };
    }

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: username.trim(),
        password,
      });

    if (authError || !authData.user) {
      return {
        success: false,
        message: 'That username or password does not match.',
      };
    }

    const nextProfile = await fetchProfile(authData.user.id);

    // APPROVAL_GATE - remove this check to open public signup.
    if (nextProfile?.status !== 'approved') {
      await supabase.auth.signOut();
      currentUserRef.current = null;
      setCurrentUser(null);
      setProfile(nextProfile);
      setIsAuthenticated(false);

      if (nextProfile?.status === 'pending') {
        return {
          success: false,
          message: 'Your request is still pending approval.',
        };
      }

      if (nextProfile?.status === 'rejected') {
        return {
          success: false,
          message: 'Your access request was rejected.',
        };
      }

      return {
        success: false,
        message: 'Your access request could not be found.',
      };
    }

    currentUserRef.current = authData.user;
    configureStorageScope(authData.user.id, {
      useLegacyFallback:
        authData.user.email?.toLowerCase() === ADMIN_EMAIL,
    });
    const scopedData = loadAppData();
    dataRef.current = scopedData;
    setData(scopedData);
    setCurrentUser(authData.user);
    setProfile(nextProfile);
    await initializeSync({ markBootstrapped: true });
    setIsAuthenticated(true);

    return { success: true };
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    hasBootstrappedSyncRef.current = false;
    currentUserRef.current = null;
    configureStorageScope(null);
    setCurrentUser(null);
    setProfile(null);
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
          username: profile?.username || currentUser?.email || 'local-user',
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
    const transaction = dataRef.current.transactions.find(
      (entry) => entry.id === transactionId,
    );

    if (transaction?.isGroupSynced) {
      return {
        success: false,
        message: 'Group-linked entries can only be changed from the group.',
      };
    }

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

    return { success: true };
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
    let newlyAddedFriends = [];

    commit(
      (currentData) => {
        const nextFriends = [...currentData.friends];
        const addedFriends = [];
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
            const friend = {
              ...createFriendFromName(customName),
              id: friendId,
            };

            nextFriends.push(friend);
            addedFriends.push(friend);
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
        newlyAddedFriends = addedFriends;

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

    newlyAddedFriends.forEach((friend) => {
      addToast({
        title: 'Friend added',
        message: `${friend.name} was added to your friends list`,
        tone: 'success',
      });
    });

    return { success: true, group: savedGroup };
  };

  const deleteGroup = (groupId) => {
    const group = dataRef.current.groups.find((entry) => entry.id === groupId);

    if (!group) {
      return { success: false, message: 'Group not found.' };
    }

    commit(
      (currentData) => ({
        ...currentData,
        groups: currentData.groups.filter((entry) => entry.id !== groupId),
        groupExpenses: currentData.groupExpenses.filter(
          (expense) => expense.groupId !== groupId,
        ),
        groupPayments: currentData.groupPayments.filter(
          (payment) => payment.groupId !== groupId,
        ),
      }),
      {
        title: 'Group deleted',
        message: `${group.name} and its records were removed.`,
        tone: 'danger',
      },
    );

    return { success: true };
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

  const updateGroupExpense = ({
    expenseId,
    item,
    totalAmount,
    paidBy,
    date,
  }) => {
    const existingExpense = dataRef.current.groupExpenses.find(
      (expense) => expense.id === expenseId,
    );
    const group = dataRef.current.groups.find(
      (entry) => entry.id === existingExpense?.groupId,
    );
    const cleanedItem = normalizeName(item);
    const numericTotal = roundCurrency(totalAmount);

    if (!existingExpense || !group || !cleanedItem || !numericTotal || !paidBy) {
      return {
        success: false,
        message: 'Item, total, payer, and group are required.',
      };
    }

    const splitAmount = roundCurrency(numericTotal / (group.members.length + 1));
    const updatedExpense = {
      ...existingExpense,
      item: cleanedItem,
      totalAmount: numericTotal,
      paidBy,
      splitAmount,
      date: toIsoDate(date),
      updatedAt: new Date().toISOString(),
    };

    commit(
      (currentData) => ({
        ...currentData,
        groupExpenses: currentData.groupExpenses.map((expense) =>
          expense.id === expenseId ? updatedExpense : expense,
        ),
      }),
      {
        title: 'Expense updated',
        message: `${group.name} group balances were updated.`,
        tone: 'success',
      },
    );

    return { success: true, expense: updatedExpense };
  };

  const deleteGroupExpense = (expenseId) => {
    const existingExpense = dataRef.current.groupExpenses.find(
      (expense) => expense.id === expenseId,
    );
    const group = dataRef.current.groups.find(
      (entry) => entry.id === existingExpense?.groupId,
    );

    if (!existingExpense || !group) {
      return { success: false, message: 'Expense not found.' };
    }

    commit(
      (currentData) => ({
        ...currentData,
        groupExpenses: currentData.groupExpenses.filter(
          (expense) => expense.id !== expenseId,
        ),
      }),
      {
        title: 'Expense deleted',
        message: `${group.name} group balances were updated.`,
        tone: 'danger',
      },
    );

    return { success: true };
  };

  const addGroupPayment = ({ groupId, friendId, amount, date, balanceBefore }) => {
    const group = dataRef.current.groups.find((entry) => entry.id === groupId);
    const numericAmount = roundCurrency(amount);
    const numericBalanceBefore = roundCurrency(balanceBefore);

    if (
      !group ||
      !friendId ||
      !Number.isFinite(numericAmount) ||
      !Number.isFinite(numericBalanceBefore) ||
      numericAmount <= 0 ||
      numericBalanceBefore <= 0
    ) {
      return {
        success: false,
        message: 'Member, amount, and group are required.',
      };
    }

    const payment = {
      id: createId('payment'),
      groupId,
      friendId,
      amount: Math.min(numericAmount, numericBalanceBefore),
      balanceBefore: numericBalanceBefore,
      balanceRemaining: roundCurrency(
        Math.max(numericBalanceBefore - numericAmount, 0),
      ),
      date: toIsoDate(date),
      createdAt: new Date().toISOString(),
    };

    commit(
      (currentData) => ({
        ...currentData,
        groupPayments: [payment, ...currentData.groupPayments],
      }),
      {
        title: 'Payment recorded',
        message: `${group.name} balance was updated.`,
        tone: 'success',
      },
    );

    return { success: true, payment };
  };

  return (
    <AppContext.Provider
      value={{
        ...data,
        currentUser,
        profile,
        isAuthenticated,
        isAuthLoading,
        isAdmin: currentUser?.email?.toLowerCase() === ADMIN_EMAIL,
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
        deleteGroup,
        addGroupExpense,
        updateGroupExpense,
        deleteGroupExpense,
        addGroupPayment,
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
