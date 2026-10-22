/**
 * Biometric & PIN Security Service for Companion Assistant
 * Supports WebAuthn / Passkeys (Fingerprint / Face ID) and 6-digit Master PIN.
 */

import { SecuritySettings } from '../types';
import { localDB } from './db';

const SECURITY_SETTINGS_KEY = 'app_security_settings';

// Default PIN is 123456 until user changes it
const DEFAULT_PIN_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // sha256 of '123456'

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const defaultSettings: SecuritySettings = {
    isBiometricEnabled: true,
    pinHash: DEFAULT_PIN_HASH,
    isLockEnabled: true,
    autoLockMinutes: 5,
    lastUnlockTimestamp: Date.now(),
  };

  return await localDB.getSetting<SecuritySettings>(SECURITY_SETTINGS_KEY, defaultSettings);
}

export async function saveSecuritySettings(settings: SecuritySettings): Promise<void> {
  await localDB.setSetting(SECURITY_SETTINGS_KEY, settings);
}

/**
 * Check if WebAuthn / Biometrics is available on this browser/device
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Trigger biometric prompt (Fingerprint or Face Unlock) using WebAuthn assertion
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        rpId: window.location.hostname || 'localhost',
      },
    });

    return !!credential;
  } catch (err: unknown) {
    // If user cancelled or not enrolled, fallback to PIN gracefully
    console.warn('Biometric auth prompt cancelled or failed:', err);
    return false;
  }
}

/**
 * Register biometric credential if needed
 */
export async function registerBiometricCredential(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'دستیار همراه هوشمند',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: userId,
          name: 'user@companion',
          displayName: 'کاربر سیستم',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
        },
        timeout: 60000,
      },
    });

    return !!credential;
  } catch (err) {
    console.warn('Biometric registration:', err);
    return false;
  }
}
