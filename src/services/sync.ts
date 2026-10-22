/**
 * Shared Hosting Cloud Sync Service
 * Connects the offline IndexedDB to the user's remote Linux PHP endpoint
 */

import { HostingConfig } from '../types';
import { localDB } from './db';

const HOSTING_CONFIG_KEY = 'app_hosting_config';

export const DEFAULT_HOSTING_CONFIG: HostingConfig = {
  apiUrl: '',
  apiKey: 'COMPANION_SECURE_TOKEN_2026',
  autoSync: false,
  syncIntervalMinutes: 30,
};

export async function getHostingConfig(): Promise<HostingConfig> {
  return await localDB.getSetting<HostingConfig>(HOSTING_CONFIG_KEY, DEFAULT_HOSTING_CONFIG);
}

export async function saveHostingConfig(config: HostingConfig): Promise<void> {
  await localDB.setSetting(HOSTING_CONFIG_KEY, config);
}

export interface SyncResponse {
  success: boolean;
  message: string;
  serverTime?: string;
  syncedContacts?: number;
  syncedCalls?: number;
  error?: string;
}

/**
 * Ping user's shared hosting API to verify connectivity & authentication
 */
export async function testHostingConnection(apiUrl: string, apiKey: string): Promise<SyncResponse> {
  if (!apiUrl) {
    return { success: false, message: 'آدرس وب‌سرویس وارد نشده است.' };
  }

  try {
    const url = new URL(apiUrl);
    url.searchParams.set('action', 'ping');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, message: 'خطای ۴۰۱: کلید امنیتی (API Key) مطابقت ندارد.' };
      }
      return { success: false, message: `خطای سرور: کد پاسخ ${res.status}` };
    }

    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || 'اتصال با هاست اشتراکی با موفقیت تایید شد.',
      serverTime: data.server_time,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `عدم برقراری ارتباط با هاست: ${message}. اطمینان حاصل کنید فایل api.php آپلود شده و HTTPS فعال است.`,
    };
  }
}

/**
 * Sync offline contacts to shared hosting database
 */
export async function syncContactsToHost(apiUrl: string, apiKey: string): Promise<SyncResponse> {
  if (!apiUrl) {
    return { success: false, message: 'آدرس هاست تنظیم نشده است.' };
  }

  try {
    const contacts = await localDB.getContacts();
    const url = new URL(apiUrl);
    url.searchParams.set('action', 'sync_contacts');

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ contacts }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || `${data.synced_count || contacts.length} مخاطب همگام شد.`,
        syncedContacts: data.synced_count || contacts.length,
      };
    } else {
      return {
        success: false,
        message: data.error || 'خطا در ذخیره مخاطبین در هاست',
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: `خطای همگام‌سازی: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Submit ticket to shared hosting database
 */
export async function submitTicketToHost(
  apiUrl: string,
  apiKey: string,
  ticket: { id: string; title: string; category: string; priority: string; message: string }
): Promise<boolean> {
  if (!apiUrl) return false;

  try {
    const url = new URL(apiUrl);
    url.searchParams.set('action', 'submit_ticket');

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(ticket),
    });

    const data = await res.json();
    return !!(res.ok && data.success);
  } catch (err) {
    console.warn('Error submitting ticket to host:', err);
    return false;
  }
}
