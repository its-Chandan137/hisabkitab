import CryptoJS from 'crypto-js';
import {
  DATA_VERSION,
  ENCRYPTION_KEY,
  PENDING_SYNC_KEY,
  STORAGE_KEY,
} from './constants';
import { createSeedData } from './seedData';

function deriveUpdatedAt(data) {
  const timestamps = [
    data?.updatedAt,
    ...(Array.isArray(data?.friends)
      ? data.friends.map((friend) => friend.createdAt)
      : []),
    ...(Array.isArray(data?.transactions)
      ? data.transactions.map(
          (transaction) => transaction.createdAt || transaction.date,
        )
      : []),
    ...(Array.isArray(data?.groups)
      ? data.groups.map((group) => group.createdAt)
      : []),
    ...(Array.isArray(data?.groupExpenses)
      ? data.groupExpenses.map(
          (expense) => expense.createdAt || expense.date,
        )
      : []),
    ...(Array.isArray(data?.groupPayments)
      ? data.groupPayments.map(
          (payment) => payment.createdAt || payment.date,
        )
      : []),
  ]
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (!timestamps.length) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

export function normalizeAppData(data, fallbackUpdatedAt) {
  const normalizedData = {
    version: data?.version ?? DATA_VERSION,
    updatedAt:
      data?.updatedAt || fallbackUpdatedAt || deriveUpdatedAt(data),
    friends: Array.isArray(data?.friends) ? data.friends : [],
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    groups: Array.isArray(data?.groups) ? data.groups : [],
    groupExpenses: Array.isArray(data?.groupExpenses) ? data.groupExpenses : [],
    groupPayments: Array.isArray(data?.groupPayments) ? data.groupPayments : [],
  };

  return normalizedData;
}

export function encryptAppData(data, options = {}) {
  const normalizedData = {
    ...normalizeAppData(data, options.updatedAt),
    version: DATA_VERSION,
    updatedAt:
      options.updatedAt ||
      normalizeAppData(data, options.updatedAt).updatedAt ||
      new Date().toISOString(),
  };

  return {
    data: normalizedData,
    encryptedData: CryptoJS.AES.encrypt(
      JSON.stringify(normalizedData),
      ENCRYPTION_KEY,
    ).toString(),
  };
}

export function decryptAppData(encryptedData, fallbackUpdatedAt) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Unable to decrypt local storage payload.');
  }

  return {
    data: normalizeAppData(JSON.parse(decrypted), fallbackUpdatedAt),
    encryptedData,
  };
}

export function getEncryptedAppData() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setEncryptedAppData(encryptedData) {
  localStorage.setItem(STORAGE_KEY, encryptedData);
}

export function setPendingSyncFlag(value) {
  if (value) {
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
    return;
  }

  localStorage.removeItem(PENDING_SYNC_KEY);
}

export function getPendingSyncFlag() {
  return localStorage.getItem(PENDING_SYNC_KEY) === 'true';
}

export function persistAppData(data, options = {}) {
  const payload = encryptAppData(data, options);
  setEncryptedAppData(payload.encryptedData);
  return payload;
}

export function restoreAppDataFromEncrypted(encryptedData, fallbackUpdatedAt) {
  const decryptedPayload = decryptAppData(encryptedData, fallbackUpdatedAt);
  return persistAppData(decryptedPayload.data, {
    updatedAt: fallbackUpdatedAt || decryptedPayload.data.updatedAt,
  });
}

export function loadAppData() {
  const savedPayload = getEncryptedAppData();

  if (!savedPayload) {
    const seedData = createSeedData();
    persistAppData(seedData, { updatedAt: seedData.updatedAt });
    return seedData;
  }

  try {
    const { data } = decryptAppData(savedPayload);

    if (data.version !== DATA_VERSION) {
      const migratedPayload = persistAppData(data, {
        updatedAt: data.updatedAt,
      });
      return migratedPayload.data;
    }

    return data;
  } catch (error) {
    console.warn('Resetting app data because decryption failed.', error);
    const seedData = createSeedData();
    persistAppData(seedData, { updatedAt: seedData.updatedAt });
    return seedData;
  }
}
