import { assignMissingSlots, normalizeCard, type Card } from "./cards";

const DB_NAME = "the-binder";
const STORE = "cards";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("category", "category");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB failed"));
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function loadCards(): Promise<Card[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll();
  const rows = await new Promise<unknown[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as unknown[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  const cards = assignMissingSlots(rows.map(normalizeCard).filter((c): c is Card => Boolean(c)));
  return cards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function putCard(card: Card) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(card);
  await txDone(tx);
  db.close();
}

export async function putMany(cards: Card[]) {
  if (!cards.length) return;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  cards.forEach((c) => store.put(c));
  await txDone(tx);
  db.close();
}

export async function deleteCard(id: string) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}
