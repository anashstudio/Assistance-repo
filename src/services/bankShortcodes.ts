/**
 * Iranian Bank Shortcodes & SMS Identification Service
 * Accurately maps SMS sender numbers (سرشماره‌ها) to Iranian banks,
 * extracts transaction details, converts Rial to Toman,
 * and drafts initial accounting records for income/expense.
 */

import { TransactionCategory } from '../types';

export interface BankShortcodeInfo {
  bankName: string;
  shortName: string;
  shortcodes: string[];
  cardPrefixes: string[];
  brandColor: string;
  badgeBg: string;
  badgeText: string;
  accountTypeHint?: string;
}

export const IRANIAN_BANKS_SHORTCODES: BankShortcodeInfo[] = [
  {
    bankName: 'بانک ملت',
    shortName: 'ملت',
    shortcodes: ['2000400', '20000124', '300066', '100066', '982000400', '98300066', '+982000400'],
    cardPrefixes: ['610433', '991975', '6104'],
    brandColor: '#e11d48', // Red / Rose
    badgeBg: 'bg-rose-500/15 border-rose-500/30',
    badgeText: 'text-rose-400',
    accountTypeHint: 'همراه بانک ملت / سکه',
  },
  {
    bankName: 'بانک ملی ایران',
    shortName: 'ملی (بام / ساپتا)',
    shortcodes: ['20006424', '30009424', '4040', '9820006424', '9830009424', '+9820006424'],
    cardPrefixes: ['603799', '170019', '6037'],
    brandColor: '#2563eb', // Blue
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    badgeText: 'text-blue-400',
    accountTypeHint: 'سامانه بام / ساپتا ملی',
  },
  {
    bankName: 'بانک تجارت',
    shortName: 'تجارت',
    shortcodes: ['200021', '100021', '2000021', '98200021', '+98200021'],
    cardPrefixes: ['585983', '627353', '5859'],
    brandColor: '#0284c7', // Sky Blue
    badgeBg: 'bg-sky-500/15 border-sky-500/30',
    badgeText: 'text-sky-400',
    accountTypeHint: 'همراه بانک تجارت / زمرد',
  },
  {
    bankName: 'بلو بانک (بانک سامان)',
    shortName: 'بلوبانک',
    shortcodes: ['200072', '100072', '2000072', '98200072', '+98200072'],
    cardPrefixes: ['621986', '6219'],
    brandColor: '#06b6d4', // Cyan
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30',
    badgeText: 'text-cyan-400',
    accountTypeHint: 'نئوبانک بلوبانک سامان',
  },
  {
    bankName: 'بانک سامان',
    shortName: 'سامان',
    shortcodes: ['20008434', '30008434', '9820008434', '+9820008434'],
    cardPrefixes: ['621986', '6219'],
    brandColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-600/15 border-blue-600/30',
    badgeText: 'text-blue-300',
    accountTypeHint: 'موبایلت سامان',
  },
  {
    bankName: 'بانک صادرات ایران',
    shortName: 'صادرات',
    shortcodes: ['30009666', '20009666', '9830009666', '+9830009666'],
    cardPrefixes: ['603769', '6037'],
    brandColor: '#8b5cf6', // Violet
    badgeBg: 'bg-violet-500/15 border-violet-500/30',
    badgeText: 'text-violet-400',
    accountTypeHint: 'صپ صادرات / شمس',
  },
  {
    bankName: 'بانک پاسارگاد',
    shortName: 'پاسارگاد',
    shortcodes: ['2000987', '1000987', '982000987', '+982000987'],
    cardPrefixes: ['502229', '639347', '5022'],
    brandColor: '#f59e0b', // Amber / Gold
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-400',
    accountTypeHint: 'ویپاد / همراه بانک پاسارگاد',
  },
  {
    bankName: 'بانک پارسیان',
    shortName: 'پارسیان',
    shortcodes: ['300023', '200023', '100023', '98300023', '+98300023'],
    cardPrefixes: ['622106', '639194', '6221'],
    brandColor: '#d97706', // Amber dark
    badgeBg: 'bg-amber-600/15 border-amber-600/30',
    badgeText: 'text-amber-300',
    accountTypeHint: 'پارسیان من / تاپ',
  },
  {
    bankName: 'بانک سپه',
    shortName: 'سپه',
    shortcodes: ['200025', '300025', '400025', '98200025', '+98200025'],
    cardPrefixes: ['589210', '504172', '627381', '5892'],
    brandColor: '#10b981', // Emerald
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeText: 'text-emerald-400',
    accountTypeHint: 'امید سپه / انصار / کوثر',
  },
  {
    bankName: 'بانک رفاه کارگران',
    shortName: 'رفاه',
    shortcodes: ['300044', '200044', '98300044', '+98300044'],
    cardPrefixes: ['589463', '5894'],
    brandColor: '#059669', // Emerald dark
    badgeBg: 'bg-emerald-600/15 border-emerald-600/30',
    badgeText: 'text-emerald-300',
    accountTypeHint: 'همراه بانک رفاه / فرارفاه',
  },
  {
    bankName: 'بانک کشاورزی',
    shortName: 'کشاورزی',
    shortcodes: ['2000911', '3000911', '982000911', '+982000911'],
    cardPrefixes: ['603770', '639217', '6037'],
    brandColor: '#16a34a', // Green
    badgeBg: 'bg-green-500/15 border-green-500/30',
    badgeText: 'text-green-400',
    accountTypeHint: 'باران کشاورزی',
  },
  {
    bankName: 'بانک قرض‌الحسنه رسالت',
    shortName: 'رسالت',
    shortcodes: ['20004747', '9820004747', '+9820004747'],
    cardPrefixes: ['504172', '5041'],
    brandColor: '#0891b2', // Teal
    badgeBg: 'bg-teal-500/15 border-teal-500/30',
    badgeText: 'text-teal-400',
    accountTypeHint: 'ام‌رسالت رسالت',
  },
  {
    bankName: 'بانک قرض‌الحسنه مهر ایران',
    shortName: 'مهر ایران',
    shortcodes: ['3000852', '983000852', '+983000852'],
    cardPrefixes: ['606373', '6063'],
    brandColor: '#14b8a6', // Teal
    badgeBg: 'bg-teal-600/15 border-teal-600/30',
    badgeText: 'text-teal-300',
    accountTypeHint: 'کیوبانک مهر ایران',
  },
  {
    bankName: 'بانک آینده',
    shortName: 'آینده',
    shortcodes: ['20001000', '9820001000', '+9820001000'],
    cardPrefixes: ['636214', '6362'],
    brandColor: '#84cc16', // Lime
    badgeBg: 'bg-lime-500/15 border-lime-500/30',
    badgeText: 'text-lime-400',
    accountTypeHint: 'آبانک آینده',
  },
  {
    bankName: 'بانک مسکن',
    shortName: 'مسکن',
    shortcodes: ['300014', '200014', '98300014', '+98300014'],
    cardPrefixes: ['628023', '6280'],
    brandColor: '#ea580c', // Orange
    badgeBg: 'bg-orange-500/15 border-orange-500/30',
    badgeText: 'text-orange-400',
    accountTypeHint: 'همراه بانک مسکن',
  },
  {
    bankName: 'بانک شهر',
    shortName: 'شهر',
    shortcodes: ['200078', '98200078', '+98200078'],
    cardPrefixes: ['504706', '502806', '5047'],
    brandColor: '#e11d48', // Rose
    badgeBg: 'bg-rose-600/15 border-rose-600/30',
    badgeText: 'text-rose-300',
    accountTypeHint: 'همراه شهر پلاس',
  },
  {
    bankName: 'بانک سینا',
    shortName: 'سینا',
    shortcodes: ['200038', '98200038', '+98200038'],
    cardPrefixes: ['639346', '6393'],
    brandColor: '#0ea5e9', // Sky
    badgeBg: 'bg-sky-600/15 border-sky-600/30',
    badgeText: 'text-sky-300',
    accountTypeHint: 'سیبانک سینا',
  },
  {
    bankName: 'پست بانک ایران',
    shortName: 'پست بانک',
    shortcodes: ['2000898', '982000898', '+982000898'],
    cardPrefixes: ['627760', '6277'],
    brandColor: '#15803d', // Green dark
    badgeBg: 'bg-green-600/15 border-green-600/30',
    badgeText: 'text-green-300',
    accountTypeHint: 'سکه‌پست / پست بانک',
  },
];

/**
 * Normalizes Persian and Arabic numbers to Latin 0-9
 */
export function normalizeDigits(text: string): string {
  const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const a = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = text;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(p[i], 'g'), String(i));
    res = res.replace(new RegExp(a[i], 'g'), String(i));
  }
  return res;
}

/**
 * Strips phone number prefixes (+98, 98, 0098) to match base shortcodes
 */
export function cleanSenderNumber(rawSender: string): string {
  let cleaned = normalizeDigits(rawSender.trim()).replace(/[\s\-_]/g, '');
  if (cleaned.startsWith('+98')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('0098')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('98')) cleaned = cleaned.slice(2);
  return cleaned;
}

/**
 * Identifies the Iranian bank from the incoming SMS sender number
 */
export function identifyBankFromSender(rawSender: string): BankShortcodeInfo | null {
  const cleaned = cleanSenderNumber(rawSender);
  if (!cleaned) return null;

  for (const bank of IRANIAN_BANKS_SHORTCODES) {
    for (const sc of bank.shortcodes) {
      const cleanSc = cleanSenderNumber(sc);
      if (cleaned === cleanSc || cleaned.endsWith(cleanSc) || cleanSc.endsWith(cleaned)) {
        return bank;
      }
    }
  }
  return null;
}

/**
 * Identifies bank from card number or text keywords if sender is not provided
 */
export function identifyBankFromTextOrCard(text: string): BankShortcodeInfo | null {
  const normalized = normalizeDigits(text);

  // Check card prefixes
  const cardMatch = normalized.match(/(?:کارت|كارت|card)?[:\s]*([0-9]{4,6})/i);
  if (cardMatch && cardMatch[1]) {
    const prefix = cardMatch[1].slice(0, 4);
    for (const bank of IRANIAN_BANKS_SHORTCODES) {
      if (bank.cardPrefixes.some((p) => p.startsWith(prefix) || prefix.startsWith(p.slice(0, 4)))) {
        return bank;
      }
    }
  }

  // Check keywords in text
  for (const bank of IRANIAN_BANKS_SHORTCODES) {
    if (new RegExp(bank.shortName, 'i').test(normalized) || new RegExp(bank.bankName, 'i').test(normalized)) {
      return bank;
    }
  }

  return null;
}

export interface DetailedParsedSms {
  isBankSms: boolean;
  senderNumber: string;
  bankInfo: BankShortcodeInfo | null;
  bankName: string;
  suggestedType: 'income' | 'expense';
  amountToman: number;
  amountRial?: number;
  balanceAfterToman?: number;
  cardOrAccount?: string;
  trackingCode?: string;
  category: TransactionCategory;
  rawSms: string;
  dateStr?: string;
}

/**
 * Parses bank SMS and combines sender shortcode with text analysis
 */
export function parseBankSmsWithSender(rawSender: string, rawText: string): DetailedParsedSms {
  const normalizedText = normalizeDigits(rawText.trim());
  const cleanedSender = cleanSenderNumber(rawSender);

  // 1. Identify bank: first via shortcode, then via text/card
  let bankInfo = identifyBankFromSender(cleanedSender);
  if (!bankInfo) {
    bankInfo = identifyBankFromTextOrCard(normalizedText);
  }

  const bankName = bankInfo ? bankInfo.bankName : 'بانک نامشخص';

  // 2. Transaction type: Expense (برداشت / خرید / انتقال / کسر) vs Income (واریز / حقوق / سود / دریافت)
  let suggestedType: 'income' | 'expense' = 'expense';
  if (/واریز|بستانکار|دریافت|حقوق|سود|انتقال به شما/i.test(normalizedText) && 
      !/عدم واریز|به دلیل واریز|لغو واریز/i.test(normalizedText)) {
    suggestedType = 'income';
  } else if (/برداشت|خرید|بدهکار|انتقال|کسر|کارمزد|پرداخت/i.test(normalizedText)) {
    suggestedType = 'expense';
  }

  // 3. Amount extraction & Rial to Toman conversion
  let amount = 0;
  const isRial = /ریال|ريال|rls|rial/i.test(normalizedText);

  const amountMatch = normalizedText.match(/(?:مبلغ|برداشت|واریز|خريد|خرید|پرداخت|انتقال|کسر)[:\s]*([\d,]+)/i);
  if (amountMatch && amountMatch[1]) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    amount = parseInt(rawNum, 10) || 0;
  } else {
    // Try finding any formatted number followed by currency
    const fallbackMatch = normalizedText.match(/([\d,]+)\s*(تومان|ریال|ريال)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      amount = parseInt(fallbackMatch[1].replace(/,/g, ''), 10) || 0;
    }
  }

  const amountToman = isRial ? Math.round(amount / 10) : amount;
  const amountRial = isRial ? amount : amount * 10;

  // 4. Remaining Balance
  let balanceAfterToman: number | undefined = undefined;
  const balanceMatch = normalizedText.match(/(?:مانده|موجودی|موجودي)[:\s]*([\d,]+)/i);
  if (balanceMatch && balanceMatch[1]) {
    const rawBal = parseInt(balanceMatch[1].replace(/,/g, ''), 10) || 0;
    balanceAfterToman = isRial ? Math.round(rawBal / 10) : rawBal;
  }

  // 5. Card / Account
  let cardOrAccount: string | undefined = undefined;
  const cardMatch = normalizedText.match(/(?:کارت|كارت|حساب)[:\s]*([\d*]{4,19})/i);
  if (cardMatch && cardMatch[1]) {
    cardOrAccount = cardMatch[1];
  }

  // 6. Tracking Code
  let trackingCode: string | undefined = undefined;
  const trackMatch = normalizedText.match(/(?:پیگیری|پيگيري|ارجاع|کد)[:\s]*([\d]+)/i);
  if (trackMatch && trackMatch[1]) {
    trackingCode = trackMatch[1];
  }

  // 7. Auto Category
  let category: TransactionCategory = 'سایر';
  if (suggestedType === 'income') {
    if (/حقوق|دستمزد|مساعده/i.test(normalizedText)) {
      category = 'حقوق و دستمزد';
    } else {
      category = 'انتقال و کارت‌به‌کارت';
    }
  } else {
    if (/اسنپ|تپسی|بنزین|سوخت|جایگاه|تاکسی|کرایه/i.test(normalizedText)) {
      category = 'حمل و نقل و بنزین';
    } else if (/سوپر|افق|کوروش|هایپر|نان|لبنیات|رستوران|فست|کافه|پیتزا|میوه|قنادی/i.test(normalizedText)) {
      category = 'خوراک و سوپرمارکت';
    } else if (/دیجی|پوشاک|کفش|لباس|فروشگاه|پاساژ|خرید/i.test(normalizedText)) {
      category = 'خرید و پوشاک';
    } else if (/قبض|گاز|آب|برق|همراه|ایرانسل|رایتل|شارژ|اینترنت/i.test(normalizedText)) {
      category = 'قبض و خدمات';
    } else if (/داروخانه|دکتر|پزشک|کلینیک|بیمارستان|دندان|درمان/i.test(normalizedText)) {
      category = 'پزشکی و سلامت';
    } else if (/اجاره|مسکن|املاک|شارژ ساختمان/i.test(normalizedText)) {
      category = 'اجاره و مسکن';
    } else if (/کارت به کارت|پایا|ساتنا|انتقال/i.test(normalizedText)) {
      category = 'انتقال و کارت‌به‌کارت';
    }
  }

  const isBankSms = Boolean(bankInfo) || amountToman > 0 || /مانده|واریز|برداشت|پوز|خرید/i.test(normalizedText);

  return {
    isBankSms,
    senderNumber: cleanedSender || (bankInfo ? bankInfo.shortcodes[0] : ''),
    bankInfo,
    bankName,
    suggestedType,
    amountToman,
    amountRial,
    balanceAfterToman,
    cardOrAccount,
    trackingCode,
    category,
    rawSms: rawText,
  };
}

export const REAL_BANK_SMS_SAMPLES = [
  {
    sender: '2000400',
    bank: 'بانک ملت',
    text: 'بانك ملت\nبرداشت: 3,500,000 ريال\nاز كارت: 6104****1234\nخريد پوز هایپراستار\nمانده: 18,200,000 ريال\n1403/07/20-17:45',
  },
  {
    sender: '20006424',
    bank: 'بانک ملی ایران',
    text: 'بانك ملي ايران\nواریز: 32,000,000 ریال\nبه حساب: 010****5678\nواریز حقوق و پاداش\nمانده: 45,500,000 ریال\nکد پیگیری: 894120',
  },
  {
    sender: '200072',
    bank: 'بلوبانک (سامان)',
    text: 'خرید\nمبلغ: 285,000 تومان\nداروخانه دکتر کریمی\nمانده: 3,120,000 تومان\nبلو؛ بانک دوست‌داشتنی شما',
  },
  {
    sender: '200021',
    bank: 'بانک تجارت',
    text: 'بانک تجارت\nبرداشت: 850,000 ریال\nخرید جایگاه بنزین 128\nمانده: 9,400,000 ریال\n1403/07/20-19:10',
  },
  {
    sender: '2000987',
    bank: 'بانک پاسارگاد',
    text: 'بانک پاسارگاد\nبرداشت: 450,000 تومان\nانتقال کارت به کارت\nبه کارت: 5022****9988\nمانده: 2,750,000 تومان',
  },
  {
    sender: '200025',
    bank: 'بانک سپه',
    text: 'بانک سپه\nواریز: 8,500,000 ریال\nاز کارت: 5892****4412\nمانده: 12,800,000 ریال\nپیگیری: 339012',
  },
];
