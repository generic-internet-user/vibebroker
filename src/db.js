import { DB_NAME, DB_VERSION, STORES } from './utils/constants.js';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORES.PORTFOLIOS)) {
        database.createObjectStore(STORES.PORTFOLIOS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.WATCHLISTS)) {
        database.createObjectStore(STORES.WATCHLISTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.MARKET_CACHE)) {
        database.createObjectStore(STORES.MARKET_CACHE, { keyPath: 'id' });
      }
    };

    req.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    req.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function getStore(name, mode = 'readonly') {
  if (!db) throw new Error('DB not initialized');
  const tx = db.transaction(name, mode);
  return tx.objectStore(name);
}

export async function initDB() {
  await openDB();
  return db;
}

export async function getAll(storeName) {
  const store = getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(storeName, id) {
  const store = getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, value) {
  const store = getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function del(storeName, id) {
  const store = getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clear(storeName) {
  const store = getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllFromIndex(storeName, indexName, value) {
  const store = getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
