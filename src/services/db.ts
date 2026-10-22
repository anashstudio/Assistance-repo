/**
 * Offline IndexedDB Database Service for Android Companion
 * Operates 100% offline with zero external database dependencies.
 */

import { 
  ContactItem, 
  SupportTicket, 
  StorageStats, 
  TransactionItem, 
  ScannedDocumentItem 
} from '../types';

const DB_NAME = 'CompanionAssistantDB';
const DB_VERSION = 2;

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private isInitializing: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.isInitializing) return this.isInitializing;

    this.isInitializing = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Transactions store (Bank SMS accounting)
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // Documents store (Scanned documents & receipts)
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          const store = db.createObjectStore('contacts', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('phoneNumber', 'phoneNumber', { unique: false });
        }

        // Support tickets store
        if (!db.objectStoreNames.contains('tickets')) {
          const store = db.createObjectStore('tickets', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Key-Value settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        // Seed default initial records if first launch
        await this.seedInitialDataIfEmpty();
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.isInitializing;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- Transactions (Personal Finance & Bank SMS) ---
  async getTransactions(): Promise<TransactionItem[]> {
    const store = await this.getStore('transactions', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result || [];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveTransaction(item: TransactionItem): Promise<void> {
    const store = await this.getStore('transactions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    const store = await this.getStore('transactions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Documents (Scanned Receipts & Documents) ---
  async getDocuments(): Promise<ScannedDocumentItem[]> {
    const store = await this.getStore('documents', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(doc: ScannedDocumentItem): Promise<void> {
    const store = await this.getStore('documents', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(doc);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const store = await this.getStore('documents', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Contacts ---
  async getContacts(): Promise<ContactItem[]> {
    const store = await this.getStore('contacts', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveContact(contact: ContactItem): Promise<void> {
    const store = await this.getStore('contacts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(contact);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteContact(id: string): Promise<void> {
    const store = await this.getStore('contacts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Support Tickets ---
  async getTickets(): Promise<SupportTicket[]> {
    const store = await this.getStore('tickets', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveTicket(ticket: SupportTicket): Promise<void> {
    const store = await this.getStore('tickets', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(ticket);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings ---
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const store = await this.getStore('settings', 'readonly');
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => {
          if (request.result && request.result.value !== undefined) {
            resolve(request.result.value);
          } else {
            resolve(defaultValue);
          }
        };
        request.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const store = await this.getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Storage Statistics ---
  async getStorageStats(): Promise<StorageStats> {
    const [transactions, documents, contacts, tickets] = await Promise.all([
      this.getTransactions(),
      this.getDocuments(),
      this.getContacts(),
      this.getTickets(),
    ]);

    let estimatedBytes = 0;
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        estimatedBytes = est.usage || 0;
      }
    } catch {
      estimatedBytes = 0;
    }

    return {
      transactionsCount: transactions.length,
      documentsCount: documents.length,
      contactsCount: contacts.length,
      ticketsCount: tickets.length,
      estimatedBytes,
    };
  }

  // --- Clean initial state with zero fake transactions ---
  private async seedInitialDataIfEmpty(): Promise<void> {
    await this.setSetting('has_seeded_sample_data', true);
  }

  // --- Backup / Export & Restore ---
  async exportFullBackup(): Promise<string> {
    const [transactions, documents, contacts, tickets] = await Promise.all([
      this.getTransactions(),
      this.getDocuments(),
      this.getContacts(),
      this.getTickets(),
    ]);

    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      transactions,
      documents,
      contacts,
      tickets,
    };

    return JSON.stringify(backup, null, 2);
  }

  async importBackup(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.transactions)) {
        for (const t of data.transactions) await this.saveTransaction(t);
      }
      if (Array.isArray(data.documents)) {
        for (const d of data.documents) await this.saveDocument(d);
      }
      if (Array.isArray(data.contacts)) {
        for (const c of data.contacts) await this.saveContact(c);
      }
      if (Array.isArray(data.tickets)) {
        for (const tk of data.tickets) await this.saveTicket(tk);
      }
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  }
}

export const localDB = new LocalDatabase();
