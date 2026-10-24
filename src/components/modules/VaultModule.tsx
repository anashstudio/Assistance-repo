import React, { useState, useEffect } from 'react';
import { 
  LockKeyhole, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  FileText, 
  Smartphone, 
  Clock, 
  Search,
  ExternalLink
} from 'lucide-react';
import { VaultAccountItem, SecretNoteItem, WarrantyItem } from '../../types';
import { localDB } from '../../services/db';
import { vibratePhone } from '../../services/device';

const DEFAULT_ACCOUNTS: VaultAccountItem[] = [];

const DEFAULT_NOTES: SecretNoteItem[] = [];

const DEFAULT_WARRANTIES: WarrantyItem[] = [];

export const VaultModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'passwords' | 'notes' | 'warranties'>('passwords');
  const [accounts, setAccounts] = useState<VaultAccountItem[]>(DEFAULT_ACCOUNTS);
  const [notes, setNotes] = useState<SecretNoteItem[]>(DEFAULT_NOTES);
  const [warranties, setWarranties] = useState<WarrantyItem[]>(DEFAULT_WARRANTIES);

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddAccModal, setShowAddAccModal] = useState<boolean>(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [showAddWarModal, setShowAddWarModal] = useState<boolean>(false);

  // New account state
  const [accTitle, setAccTitle] = useState<string>('');
  const [accUser, setAccUser] = useState<string>('');
  const [accPass, setAccPass] = useState<string>('');
  const [accCat, setAccCat] = useState<'ایمیل' | 'بانکی' | 'شبکه اجتماعی' | 'سرور و هاستینگ' | 'سایر'>('سرور و هاستینگ');
  const [accUrl, setAccUrl] = useState<string>('');

  // New note state
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');

  // New warranty state
  const [warDevice, setWarDevice] = useState<string>('');
  const [warExpiry, setWarExpiry] = useState<string>('');
  const [warSerial, setWarSerial] = useState<string>('');

  useEffect(() => {
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    const savedAcc = await localDB.getSetting<VaultAccountItem[]>('app_vault_accounts', DEFAULT_ACCOUNTS);
    const savedNotes = await localDB.getSetting<SecretNoteItem[]>('app_vault_notes', DEFAULT_NOTES);
    const savedWar = await localDB.getSetting<WarrantyItem[]>('app_vault_warranties', DEFAULT_WARRANTIES);
    setAccounts(savedAcc);
    setNotes(savedNotes);
    setWarranties(savedWar);
  };

  const handleToggleReveal = (id: string) => {
    vibratePhone(15);
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPassword = (id: string, pass: string) => {
    vibratePhone(25);
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddAccount = async () => {
    if (!accTitle.trim() || !accPass.trim()) return;

    vibratePhone(30);
    const newAcc: VaultAccountItem = {
      id: 'acc_' + Date.now(),
      title: accTitle.trim(),
      username: accUser.trim(),
      passwordEncrypted: accPass.trim(),
      category: accCat,
      websiteUrl: accUrl.trim() || undefined,
      updatedAt: Date.now(),
    };

    const updated = [newAcc, ...accounts];
    setAccounts(updated);
    await localDB.setSetting('app_vault_accounts', updated);
    setShowAddAccModal(false);
    setAccTitle('');
    setAccUser('');
    setAccPass('');
    setAccUrl('');
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('آیا از حذف این اطلاعات از گاوصندوق مطمئن هستید؟')) {
      const updated = accounts.filter((a) => a.id !== id);
      setAccounts(updated);
      await localDB.setSetting('app_vault_accounts', updated);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;

    vibratePhone(30);
    const newNote: SecretNoteItem = {
      id: 'sn_' + Date.now(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      updatedAt: Date.now(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    await localDB.setSetting('app_vault_notes', updated);
    setShowAddNoteModal(false);
    setNoteTitle('');
    setNoteContent('');
  };

  const handleDeleteNote = async (id: string) => {
    if (window.confirm('آیا این یادداشت محرمانه حذف شود؟')) {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      await localDB.setSetting('app_vault_notes', updated);
    }
  };

  const handleAddWarranty = async () => {
    if (!warDevice.trim() || !warExpiry.trim()) return;

    vibratePhone(30);
    const newWar: WarrantyItem = {
      id: 'war_' + Date.now(),
      deviceName: warDevice.trim(),
      warrantyExpiryDate: warExpiry.trim(),
      serialNumber: warSerial.trim() || undefined,
    };

    const updated = [newWar, ...warranties];
    setWarranties(updated);
    await localDB.setSetting('app_vault_warranties', updated);
    setShowAddWarModal(false);
    setWarDevice('');
    setWarExpiry('');
    setWarSerial('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Sub tabs */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('passwords')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'passwords'
              ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>گذرواژه‌ها ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'notes'
              ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>یادداشت محرمانه ({notes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warranties')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'warranties'
              ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>گارانتی وسایل ({warranties.length})</span>
        </button>
      </div>

      {activeTab === 'passwords' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجوی رمز عبور یا حساب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
            </div>

            <button
              onClick={() => setShowAddAccModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن حساب جدید</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {accounts.filter((a) => a.title.includes(searchQuery) || a.username.includes(searchQuery)).length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                هنوز گذرواژه یا حسابی در گاوصندوق ذخیره نشده است. با دکمه «افزودن حساب جدید» اضافه کنید.
              </div>
            ) : (
              accounts
                .filter((a) => a.title.includes(searchQuery) || a.username.includes(searchQuery))
                .map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-white">{acc.title}</h5>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                        {acc.category}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono dir-ltr text-right mt-1">
                      {acc.username}
                    </div>

                    {acc.websiteUrl && (
                      <a
                        href={acc.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5 dir-ltr"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{acc.websiteUrl}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Password display box */}
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex items-center gap-2 dir-ltr">
                      <span className="text-white tracking-wider">
                        {revealedPasswords[acc.id] ? acc.passwordEncrypted : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => handleToggleReveal(acc.id)}
                        className="text-slate-500 hover:text-slate-300"
                        title={revealedPasswords[acc.id] ? 'مخفی‌سازی' : 'نمایش'}
                      >
                        {revealedPasswords[acc.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyPassword(acc.id, acc.passwordEncrypted)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
                      title="کپی در کلیپ‌بورد"
                    >
                      {copiedId === acc.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="opacity-40 group-hover:opacity-100 p-2 rounded-xl text-slate-500 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">یادداشت‌های محافظت‌شده با قفل محلی</span>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>یادداشت جدید</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {notes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                هنوز یادداشت محرمانه‌ای ذخیره نشده است. با دکمه «یادداشت امن جدید» اضافه کنید.
              </div>
            ) : (
              notes.map((n) => (
              <div
                key={n.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    {n.title}
                  </h5>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 select-all">
                  {n.content}
                </p>
                <div className="text-[10px] text-slate-500">
                  آخرین ویرایش: {new Date(n.updatedAt).toLocaleDateString('fa-IR')}
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {activeTab === 'warranties' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">پیگیری تاریخ انقضای گارانتی وسایل منزل و کالاهای دیجیتال</span>
            <button
              onClick={() => setShowAddWarModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت دستگاه جدید</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {warranties.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                هنوز گارانتی وسیله‌ای ثبت نشده است. با دکمه «ثبت دستگاه جدید» اضافه کنید.
              </div>
            ) : (
              warranties.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
              >
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-white">{w.deviceName}</h5>
                  {w.serialNumber && (
                    <div className="text-[11px] text-slate-400 font-mono dir-ltr text-right mt-0.5">
                      سریال: {w.serialNumber}
                    </div>
                  )}
                  {w.sellerShop && (
                    <div className="text-[10px] text-slate-500 mt-0.5">شرکت گارانتی: {w.sellerShop}</div>
                  )}
                </div>

                <div className="text-left shrink-0">
                  <span className="text-[10px] text-slate-400 block">انقضای گارانتی:</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">{w.warrantyExpiryDate}</span>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3 shadow-2xl text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              افزودن حساب و گذرواژه جدید
            </h4>
            <div>
              <label className="text-slate-400 block mb-1">عنوان حساب یا سرویس *</label>
              <input
                type="text"
                placeholder="مثلاً: هاست اشتراکی یا جیمیل"
                value={accTitle}
                onChange={(e) => setAccTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">نام کاربری یا ایمیل</label>
              <input
                type="text"
                value={accUser}
                onChange={(e) => setAccUser(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">رمز عبور *</label>
              <input
                type="text"
                value={accPass}
                onChange={(e) => setAccPass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddAccount}
                disabled={!accTitle.trim() || !accPass.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                ذخیره در گاوصندوق
              </button>
              <button
                onClick={() => setShowAddAccModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3 shadow-2xl text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              یادداشت محرمانه جدید
            </h4>
            <div>
              <label className="text-slate-400 block mb-1">عنوان *</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">متن محرمانه *</label>
              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddNote}
                disabled={!noteTitle.trim() || !noteContent.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                ذخیره
              </button>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Warranty Modal */}
      {showAddWarModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3 shadow-2xl text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              ثبت گارانتی دستگاه
            </h4>
            <div>
              <label className="text-slate-400 block mb-1">نام دستگاه *</label>
              <input
                type="text"
                placeholder="مثلاً: تلویزیون سامسونگ یا مانیتور"
                value={warDevice}
                onChange={(e) => setWarDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">تاریخ انقضای گارانتی *</label>
              <input
                type="text"
                placeholder="1404/10/20"
                value={warExpiry}
                onChange={(e) => setWarExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddWarranty}
                disabled={!warDevice.trim() || !warExpiry.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                ثبت گارانتی
              </button>
              <button
                onClick={() => setShowAddWarModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
