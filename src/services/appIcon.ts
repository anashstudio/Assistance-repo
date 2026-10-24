import { localDB } from './db';

const APP_ICON_KEY = 'app_custom_logo_icon_url';

// Default signature Anash Studio luxury monogram logo
export const DEFAULT_ANASH_ICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="50%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%238b5cf6"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100" height="100" rx="26" fill="%23090f1d"/><rect x="2" y="2" width="96" height="96" rx="24" fill="none" stroke="url(%23grad)" stroke-width="3" opacity="0.8"/><path d="M50 18 L76 78 L62 78 L56 63 L44 63 L38 78 L24 78 Z M50 35 L47 53 L53 53 Z" fill="url(%23grad)" filter="url(%23glow)"/><circle cx="50" cy="24" r="3.5" fill="%2338bdf8"/><circle cx="50" cy="74" r="2.5" fill="%23a855f7"/></svg>`;

export async function getCustomAppIcon(): Promise<string> {
  const saved = await localDB.getSetting<string>(APP_ICON_KEY, DEFAULT_ANASH_ICON_SVG);
  return saved || DEFAULT_ANASH_ICON_SVG;
}

export async function saveCustomAppIcon(dataUrl: string): Promise<void> {
  await localDB.setSetting(APP_ICON_KEY, dataUrl);
}

export async function resetCustomAppIcon(): Promise<void> {
  await localDB.setSetting(APP_ICON_KEY, DEFAULT_ANASH_ICON_SVG);
}
