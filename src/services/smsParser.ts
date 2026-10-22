/**
 * Bank SMS Parser Engine
 * Analyzes SMS messages from Iranian banks, extracts amounts, transaction type,
 * bank name, card/account, remaining balance, and auto-categorizes expenses.
 */

import { TransactionCategory, TransactionItem } from '../types';

export interface ParsedBankSms {
  isBankSms: boolean;
  bankName: string;
  type: 'income' | 'expense';
  amountToman: number;
  amountRial?: number;
  balanceAfterToman?: number;
  cardOrAccount?: string;
  trackingCode?: string;
  category: TransactionCategory;
  confidence: number;
}

// Persian and Arabic digits to English digits
export function normalizePersianDigits(text: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let result = text;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

export const SAMPLE_BANK_SMS_LIST = [
  {
    bank: 'بلو بانک (سامان)',
    text: 'خرید\nمبلغ: 250,000 تومان\nفروشگاه افق کوروش\nمانده: 4,750,000 تومان\nبلو؛ بانک ولی دوست‌داشتنی',
  },
  {
    bank: 'بانک ملت',
    text: 'بانك ملت\nبرداشت: 1,850,000 ريال\nاز كارت: 6104****1234\nخريد پوز\nمانده: 14,200,000 ريال\n1403/07/20-14:22',
  },
  {
    bank: 'بانک ملی ایران',
    text: 'بانك ملي ايران\nواریز: 15,000,000 ریال\nبه حساب: 010****5678\nواریز حقوق\nمانده: 38,500,000 ریال\nپیگیری: 789123',
  },
  {
    bank: 'بانک سامان',
    text: 'بانک سامان\nانتقال کارت به کارت\nمبلغ: 500,000 تومان\nبه کارت: 6219****9988\nمانده: 2,100,000 تومان',
  },
  {
    bank: 'بانک رسالت',
    text: 'بانک قرض الحسنه رسالت\nبرداشت: 80,000 تومان\nبابت: تاکسی اینترنتی اسنپ\nمانده: 920,000 تومان',
  },
  {
    bank: 'بانک صادرات',
    text: 'بانک صادرات ایران\nخرید: 650,000 ریال\nداروخانه شبانه‌روزی\nمانده: 8,300,000 ریال',
  },
];

export function parseBankSms(rawText: string): ParsedBankSms {
  const normalized = normalizePersianDigits(rawText.trim());

  // 1. Detect Bank
  let bankName = 'بانک نامشخص';
  if (/بلو|blu/i.test(normalized)) bankName = 'بلو بانک';
  else if (/ملت/i.test(normalized)) bankName = 'بانک ملت';
  else if (/ملی|ملي/i.test(normalized)) bankName = 'بانک ملی';
  else if (/سامان/i.test(normalized)) bankName = 'بانک سامان';
  else if (/رسالت/i.test(normalized)) bankName = 'بانک رسالت';
  else if (/تجارت/i.test(normalized)) bankName = 'بانک تجارت';
  else if (/صادرات/i.test(normalized)) bankName = 'بانک صادرات';
  else if (/پاسارگاد/i.test(normalized)) bankName = 'بانک پاسارگاد';
  else if (/پارسیان/i.test(normalized)) bankName = 'بانک پارسیان';
  else if (/کشاورزی/i.test(normalized)) bankName = 'بانک کشاورزی';
  else if (/مسکن/i.test(normalized)) bankName = 'بانک مسکن';
  else if (/سپه/i.test(normalized)) bankName = 'بانک سپه';
  else if (/آینده/i.test(normalized)) bankName = 'بانک آینده';
  else if (/رفاه/i.test(normalized)) bankName = 'بانک رفاه';

  // 2. Detect Transaction Type (Income vs Expense)
  let type: 'income' | 'expense' = 'expense';
  if (/واریز|بستانکار|دریافت|حقوق|سود/i.test(normalized) && !/به دلیل واریز|عدم واریز/i.test(normalized)) {
    type = 'income';
  } else if (/برداشت|خرید|بدهکار|انتقال|کسر|کارمزد/i.test(normalized)) {
    type = 'expense';
  }

  // 3. Extract Amount
  // Matches patterns like: مبلغ: 250,000 or برداشت: 1,850,000 or واریز: 15,000,000
  let amount = 0;
  let isRial = /ریال|ريال|rls|rial/i.test(normalized);

  const amountMatch = normalized.match(/(?:مبلغ|برداشت|واریز|خريد|خرید|پرداخت|انتقال)[:\s]*([\d,]+)/i);
  if (amountMatch && amountMatch[1]) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    amount = parseInt(rawNum, 10) || 0;
  } else {
    // Fallback: search for numbers followed by تومان or ریال
    const currencyMatch = normalized.match(/([\d,]+)\s*(تومان|ریال|ريال)/i);
    if (currencyMatch && currencyMatch[1]) {
      const rawNum = currencyMatch[1].replace(/,/g, '');
      amount = parseInt(rawNum, 10) || 0;
      isRial = /ریال|ريال/i.test(currencyMatch[2]);
    }
  }

  // Convert Rial to Toman
  const amountToman = isRial ? Math.round(amount / 10) : amount;

  // 4. Extract Remaining Balance (مانده)
  let balanceAfterToman: number | undefined = undefined;
  const balanceMatch = normalized.match(/(?:مانده|موجودی|موجودي)[:\s]*([\d,]+)/i);
  if (balanceMatch && balanceMatch[1]) {
    const rawBalance = parseInt(balanceMatch[1].replace(/,/g, ''), 10) || 0;
    balanceAfterToman = isRial ? Math.round(rawBalance / 10) : rawBalance;
  }

  // 5. Extract Card or Account Number
  let cardOrAccount: string | undefined = undefined;
  const cardMatch = normalized.match(/(?:کارت|كارت|حساب)[:\s]*([\d*]{4,19})/i);
  if (cardMatch && cardMatch[1]) {
    cardOrAccount = cardMatch[1];
  }

  // 6. Extract Tracking Code
  let trackingCode: string | undefined = undefined;
  const trackMatch = normalized.match(/(?:پیگیری|پيگيري|ارجاع|کد)[:\s]*([\d]+)/i);
  if (trackMatch && trackMatch[1]) {
    trackingCode = trackMatch[1];
  }

  // 7. Auto-Categorize Expense/Income
  let category: TransactionCategory = 'سایر';
  if (type === 'income') {
    if (/حقوق|دستمزد|مساعده/i.test(normalized)) {
      category = 'حقوق و دستمزد';
    } else {
      category = 'انتقال و کارت‌به‌کارت';
    }
  } else {
    if (/اسنپ|تپسی|بنزین|سوخت|جایگاه|تاکسی|کرایه/i.test(normalized)) {
      category = 'حمل و نقل و بنزین';
    } else if (/سوپر|افق|کوروش|هایپر|نان|لبنیات|رستوران|فست|کافه|پیتزا|میوه/i.test(normalized)) {
      category = 'خوراک و سوپرمارکت';
    } else if (/دیجی|پوشاک|کفش|لباس|فروشگاه|پاساژ|خرید/i.test(normalized)) {
      category = 'خرید و پوشاک';
    } else if (/قبض|گاز|آب|برق|همراه|ایرانسل|رایتل|شارژ|اینترنت/i.test(normalized)) {
      category = 'قبض و خدمات';
    } else if (/داروخانه|دکتر|پزشک|کلینیک|بیمارستان|دندان|درمان/i.test(normalized)) {
      category = 'پزشکی و سلامت';
    } else if (/اجاره|مسکن|املاک|شارژ ساختمان/i.test(normalized)) {
      category = 'اجاره و مسکن';
    } else if (/کارت به کارت|پایا|ساتنا|انتقال/i.test(normalized)) {
      category = 'انتقال و کارت‌به‌کارت';
    }
  }

  const isBankSms = amountToman > 0 || /مانده|بانک|واریز|برداشت|پوز/i.test(normalized);

  return {
    isBankSms,
    bankName,
    type,
    amountToman,
    amountRial: isRial ? amount : amount * 10,
    balanceAfterToman,
    cardOrAccount,
    trackingCode,
    category,
    confidence: isBankSms ? 0.95 : 0.2,
  };
}
