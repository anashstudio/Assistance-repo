import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Search, 
  Trash2, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins,
  Radio,
  FileCheck2,
  Edit3,
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import { TransactionItem, TransactionCategory } from '../../types';
import { localDB } from '../../services/db';
import { 
  parseBankSmsWithSender, 
  identifyBankFromSender, 
  IRANIAN_BANKS_SHORTCODES, 
  REAL_BANK_SMS_SAMPLES,
  DetailedParsedSms
} from '../../services/bankShortcodes';
import { vibratePhone } from '../../services/device';

interface FinanceModuleProps {
  onRefreshStats: () => void;
}

const CATEGORIES: TransactionCategory[] = [
  'خوراک و سوپرمارکت',
  'خرید و پوشاک',
  'قبض و خدمات',
  'اجاره و مسکن',
  'حمل و نقل و بنزین',
  'پزشکی و سلامت',
  'انتقال و کارت‌به‌کارت',
  'حقوق و دستمزد',
  'سایر',
];

export const FinanceModule: React.FC<FinanceModuleProps> = ({ onRefreshStats }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [senderNumber, setSenderNumber] = useState<string>('2000400');
  const [smsInputText, setSmsInputText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<DetailedParsedSms | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [bankFilter, setBankFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Manual entry state
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualBank, setManualBank] = useState<string>('بانک ملت');
  const [manualSender, setManualSender] = useState<string>('2000400');
  const [manualCategory, setManualCategory] = useState<TransactionCategory>('خوراک و سوپرمارکت');
  const [manualNotes, setManualNotes] = useState<string>('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const list = await localDB.getTransactions();
    setTransactions(list);
  };

  const handleSmsOrSenderChange = (sender: string, text: string) => {
    setSenderNumber(sender);
    setSmsInputText(text);

    if (text.trim().length > 6 || sender.trim().length > 3) {
      const parsed = parseBankSmsWithSender(sender, text);
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  };

  const handleSelectSample = (sample: typeof REAL_BANK_SMS_SAMPLES[0]) => {
    vibratePhone(25);
    handleSmsOrSenderChange(sample.sender, sample.text);
  };

  // User confirms initial registration as either EXPENSE or INCOME
  const handleInitialRegistration = async (forcedType: 'income' | 'expense') => {
    if (!parsedPreview || parsedPreview.amountToman <= 0) return;

    vibratePhone(40);
    const newTx: TransactionItem = {
      id: 'tx_' + Date.now(),
      type: forcedType,
      amountToman: parsedPreview.amountToman,
      bankName: parsedPreview.bankName,
      senderNumber: parsedPreview.senderNumber || senderNumber,
      bankShortcode: parsedPreview.bankInfo ? parsedPreview.bankInfo.shortcodes[0] : undefined,
      isDraftInitial: true, // Marked as registered draft
      cardOrAccount: parsedPreview.cardOrAccount,
      balanceAfter: parsedPreview.balanceAfterToman,
      category: parsedPreview.category,
      trackingCode: parsedPreview.trackingCode,
      timestamp: Date.now(),
      rawSms: smsInputText.trim(),
      notes: `پیامک سرشماره ${parsedPreview.senderNumber || senderNumber} (${parsedPreview.bankName}) - ثبت اولیه`,
    };

    await localDB.saveTransaction(newTx);
    setSmsInputText('');
    setParsedPreview(null);
    setFeedbackBanner(`تراکنش به مبلغ ${parsedPreview.amountToman.toLocaleString('fa-IR')} تومان به عنوان «${forcedType === 'income' ? 'درآمد' : 'هزینه'}» با موفقیت ثبت اولیه شد.`);
    await loadTransactions();
    onRefreshStats();

    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(manualAmount.replace(/,/g, ''), 10);
    if (!amount || amount <= 0) return;

    vibratePhone(40);
    const newTx: TransactionItem = {
      id: 'tx_' + Date.now(),
      type: manualType,
      amountToman: amount,
      bankName: manualBank,
      senderNumber: manualSender || undefined,
      isDraftInitial: false,
      category: manualCategory,
      notes: manualNotes.trim() || undefined,
      timestamp: Date.now(),
    };

    await localDB.saveTransaction(newTx);
    setShowManualModal(false);
    setManualAmount('');
    setManualNotes('');
    setFeedbackBanner('تراکنش با موفقیت ذخیره گردید.');
    await loadTransactions();
    onRefreshStats();

    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('آیا از حذف این تراکنش از حسابداری مطمئن هستید؟')) {
      await localDB.deleteTransaction(id);
      await loadTransactions();
      onRefreshStats();
    }
  };

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amountToman, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amountToman, 0);

  const netBalance = totalIncome - totalExpense;

  const formatToman = (amount: number) => {
    return amount.toLocaleString('fa-IR') + ' تومان';
  };

  const detectedBank = identifyBankFromSender(senderNumber) || (parsedPreview ? parsedPreview.bankInfo : null);

  // Filtering
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter !== 'all' && tx.type !== activeFilter) return false;
    if (bankFilter !== 'all' && tx.bankName !== bankFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchBank = tx.bankName.toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchSender = (tx.senderNumber || '').includes(q);
      return matchCat || matchBank || matchNotes || matchSender;
    }
    return true;
  });

  const availableBanks = Array.from(new Set(transactions.map((t) => t.bankName))).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Overview Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">حسابداری هوشمند و تشخیص سرشماره بانک‌ها</h2>
              <p className="text-[11px] text-slate-400">شناسایی خودکار سرشماره پیامک، تفکیک بانک و پیشنهاد ثبت اولیه در هزینه یا درآمد</p>
            </div>
          </div>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ثبت دستی</span>
          </button>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>مجموع دریافتی</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1 truncate">
              {formatToman(totalIncome)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>مجموع مخارج</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1 truncate">
              {formatToman(totalExpense)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
              <Coins className="w-3.5 h-3.5" />
              <span>تراز و مانده</span>
            </div>
            <div
              className={`text-sm sm:text-base font-bold mt-1 truncate ${
                netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatToman(netBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Bank SMS Intake & Shortcode Recognition Section */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-cyan-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-white">پارس خودکار پیامک بر اساس سرشماره بانکی</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            سیستم ثبت اولیه
          </span>
        </div>

        {/* Inputs: Bank Sender Number + SMS Content */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sender Number Input with Bank Recognition */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>سرشماره پیامک:</span>
              {detectedBank && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded border ${detectedBank.badgeBg} ${detectedBank.badgeText}`}>
                  {detectedBank.shortName}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={senderNumber}
                onChange={(e) => handleSmsOrSenderChange(e.target.value, smsInputText)}
                placeholder="مثلاً 2000400"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400"
              />
            </div>

            {/* Quick Iranian Bank Sender Badges */}
            <div className="flex flex-wrap gap-1 pt-1">
              {IRANIAN_BANKS_SHORTCODES.slice(0, 6).map((b) => (
                <button
                  key={b.bankName}
                  type="button"
                  onClick={() => handleSmsOrSenderChange(b.shortcodes[0], smsInputText)}
                  className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-all ${
                    senderNumber === b.shortcodes[0]
                      ? `${b.badgeBg} ${b.badgeText} font-bold ring-1 ring-cyan-400/50`
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {b.shortName}: {b.shortcodes[0]}
                </button>
              ))}
            </div>
          </div>

          {/* SMS Body Input */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">متن پیامک بانکی دریافتی:</label>
            <textarea
              rows={3}
              value={smsInputText}
              onChange={(e) => handleSmsOrSenderChange(senderNumber, e.target.value)}
              placeholder="متن پیامک واریز یا برداشت بانک را اینجا وارد یا Paste کنید..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 resize-none font-sans"
            />
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تست سریع پیامک بانک‌های معتبر کشور با سرشماره واقعی:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REAL_BANK_SMS_SAMPLES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(s)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1 active:scale-95"
              >
                <span className="font-bold text-cyan-300">{s.bank}</span>
                <span className="text-slate-500 font-mono">({s.sender})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Prompt / Registration Dialog when SMS is parsed */}
        {parsedPreview && parsedPreview.isBankSms && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-cyan-500/40 space-y-3 shadow-2xl animate-in fade-in duration-200">
            {/* Bank & Sender Info Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{parsedPreview.bankName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                      سرشماره: {parsedPreview.senderNumber || senderNumber}
                    </span>
                  </div>
                  {parsedPreview.bankInfo?.accountTypeHint && (
                    <span className="text-[10px] text-slate-400">{parsedPreview.bankInfo.accountTypeHint}</span>
                  )}
                </div>
              </div>

              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                parsedPreview.suggestedType === 'income'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}>
                {parsedPreview.suggestedType === 'income' ? 'تشخیص: واریز / درآمد' : 'تشخیص: برداشت / هزینه'}
              </span>
            </div>

            {/* Extracted Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">مبلغ استخراج‌شده:</span>
                <span className="font-bold font-mono text-cyan-300 text-sm">
                  {formatToman(parsedPreview.amountToman)}
                </span>
                {parsedPreview.amountRial && (
                  <span className="text-[9px] text-slate-500 block">
                    ({parsedPreview.amountRial.toLocaleString('fa-IR')} ریال)
                  </span>
                )}
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">دسته‌بندی خودکار:</span>
                <span className="font-semibold text-slate-200">{parsedPreview.category}</span>
              </div>

              {parsedPreview.cardOrAccount && (
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">شماره کارت/حساب:</span>
                  <span className="font-mono text-slate-200 dir-ltr text-right block">
                    {parsedPreview.cardOrAccount}
                  </span>
                </div>
              )}

              {parsedPreview.balanceAfterToman !== undefined && (
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">مانده موجودی:</span>
                  <span className="font-mono text-slate-200">{formatToman(parsedPreview.balanceAfterToman)}</span>
                </div>
              )}
            </div>

            {/* Prompt: User decides whether to register as EXPENSE or INCOME */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>
                  پیامک از سرشماره <span className="font-mono text-white font-bold">{parsedPreview.senderNumber || senderNumber}</span> متعلق به <span className="text-white font-bold">{parsedPreview.bankName}</span> است. این مبلغ در کدام بخش ثبت اولیه شود؟
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Button 1: Expense Initial Registration */}
                <button
                  type="button"
                  onClick={() => handleInitialRegistration('expense')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                    parsedPreview.suggestedType === 'expense'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/50'
                      : 'bg-slate-800 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>ثبت اولیه به عنوان «هزینه» ({formatToman(parsedPreview.amountToman)})</span>
                </button>

                {/* Button 2: Income Initial Registration */}
                <button
                  type="button"
                  onClick={() => handleInitialRegistration('income')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                    parsedPreview.suggestedType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                      : 'bg-slate-800 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>ثبت اولیه به عنوان «درآمد» ({formatToman(parsedPreview.amountToman)})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedbackBanner && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
        )}
      </div>

      {/* Transaction History & Smart Filtering */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Sub filter tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              همه ({transactions.length})
            </button>
            <button
              onClick={() => setActiveFilter('expense')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFilter === 'expense'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              هزینه‌ها
            </button>
            <button
              onClick={() => setActiveFilter('income')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFilter === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              درآمدها
            </button>
          </div>

          {/* Bank selector & Search bar */}
          <div className="flex items-center gap-2">
            {availableBanks.length > 0 && (
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-hidden"
              >
                <option value="all">همه بانک‌ها</option>
                {availableBanks.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در سرشماره، بانک..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
            <Coins className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
            <p>تراکنشی مطابق با فیلتر انتخاب‌شده یافت نشد.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {tx.category}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0 font-medium">
                        {tx.bankName}
                      </span>
                      {tx.senderNumber && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 font-mono border border-indigo-500/30 shrink-0">
                          سرشماره: {tx.senderNumber}
                        </span>
                      )}
                      {tx.isDraftInitial && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                          <FileCheck2 className="w-3 h-3" />
                          <span>ثبت اولیه</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {tx.notes || (tx.cardOrAccount ? `کارت: ${tx.cardOrAccount}` : 'تراکنش حسابداری')}
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>
                        {new Date(tx.timestamp).toLocaleDateString('fa-IR', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {tx.trackingCode && (
                        <span className="font-mono text-slate-500">پیگیری: {tx.trackingCode}</span>
                      )}
                      {tx.balanceAfter !== undefined && (
                        <span className="font-mono text-slate-400">مانده: {formatToman(tx.balanceAfter)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left dir-ltr">
                    <div
                      className={`text-sm font-black font-mono ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {tx.amountToman.toLocaleString('en-US')}
                    </div>
                    <span className="text-[10px] text-slate-500">تومان</span>
                  </div>

                  <button
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                    title="حذف تراکنش"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ثبت تراکنش جدید در حسابداری</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                بستن
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">نوع تراکنش:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('expense')}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      manualType === 'expense'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    هزینه (برداشت)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('income')}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      manualType === 'income'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    درآمد (واریز)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">مبلغ (تومان):</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً 250,000"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">بانک:</label>
                  <select
                    value={manualBank}
                    onChange={(e) => {
                      setManualBank(e.target.value);
                      const b = IRANIAN_BANKS_SHORTCODES.find((x) => x.bankName === e.target.value);
                      if (b) setManualSender(b.shortcodes[0]);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    {IRANIAN_BANKS_SHORTCODES.map((b) => (
                      <option key={b.bankName} value={b.bankName}>{b.bankName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">سرشماره پیامک:</label>
                  <input
                    type="text"
                    value={manualSender}
                    onChange={(e) => setManualSender(e.target.value)}
                    placeholder="مثلا 2000400"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">دسته‌بندی:</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as TransactionCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">توضیحات و بابت:</label>
                <input
                  type="text"
                  placeholder="خرید روزانه سوپرمارکت، واریز حقوق و..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all"
                >
                  ذخیره تراکنش
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
