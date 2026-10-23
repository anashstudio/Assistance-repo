import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Phone, 
  MessageSquare, 
  Search, 
  Trash2, 
  Smartphone, 
  Mail, 
  Star, 
  Check, 
  Tag,
  Upload
} from 'lucide-react';
import { ContactItem } from '../../types';
import { localDB } from '../../services/db';
import { 
  pickNativeContact, 
  isContactPickerSupported, 
  triggerPhoneCall, 
  triggerSendSms, 
  vibratePhone 
} from '../../services/device';

interface ContactsModuleProps {
  onRefreshStats: () => void;
  onNavigateToSms: (phone: string) => void;
}

export const ContactsModule: React.FC<ContactsModuleProps> = ({
  onRefreshStats,
  onNavigateToSms,
}) => {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [category, setCategory] = useState<'کاری' | 'شخصی' | 'خانواده' | 'ضروری'>('شخصی');
  const [notes, setNotes] = useState<string>('');
  const [supportsNativePicker, setSupportsNativePicker] = useState<boolean>(false);

  useEffect(() => {
    loadContacts();
    setSupportsNativePicker(isContactPickerSupported());
  }, []);

  const loadContacts = async () => {
    const list = await localDB.getContacts();
    list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    setContacts(list);
  };

  const handlePickFromPhone = async () => {
    vibratePhone(30);
    const nativeContact = await pickNativeContact();
    if (nativeContact) {
      setName(nativeContact.name || '');
      setPhoneNumber(nativeContact.tel || '');
      setEmail(nativeContact.email || '');
      setShowAddModal(true);
    }
  };

  const handleImportVcardOrCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (re) => {
      const text = re.target?.result as string;
      if (!text) return;
      const newItems: ContactItem[] = [];
      if (file.name.toLowerCase().endsWith('.vcf') || text.includes('BEGIN:VCARD')) {
        const cards = text.split(/BEGIN:VCARD/i);
        for (const card of cards) {
          const fnMatch = card.match(/FN[;:]([^\r\n]+)/i);
          const telMatch = card.match(/TEL[^:]*:([^\r\n]+)/i);
          if (fnMatch && telMatch) {
            newItems.push({
              id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: fnMatch[1].trim(),
              phoneNumber: telMatch[1].trim(),
              category: 'شخصی',
              createdAt: Date.now(),
            });
          }
        }
      } else {
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
            newItems.push({
              id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: parts[0].trim(),
              phoneNumber: parts[1].trim(),
              email: parts[2]?.trim() || undefined,
              category: 'شخصی',
              createdAt: Date.now(),
            });
          }
        }
      }
      if (newItems.length > 0) {
        for (const item of newItems) {
          await localDB.saveContact(item);
        }
        await loadContacts();
        onRefreshStats();
        vibratePhone(40);
        alert(`${newItems.length} مخاطب با موفقیت وارد شدند.`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveContact = async () => {
    if (!name.trim() || !phoneNumber.trim()) return;

    const newContact: ContactItem = {
      id: 'cnt_' + Date.now(),
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      category,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    await localDB.saveContact(newContact);
    resetForm();
    setShowAddModal(false);
    await loadContacts();
    onRefreshStats();
  };

  const handleDeleteContact = async (id: string, contactName: string) => {
    if (window.confirm(`آیا از حذف مخاطب «${contactName}» اطمینان دارید؟`)) {
      await localDB.deleteContact(id);
      await loadContacts();
      onRefreshStats();
    }
  };

  const resetForm = () => {
    setName('');
    setPhoneNumber('');
    setEmail('');
    setCategory('شخصی');
    setNotes('');
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery);
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی نام یا شماره مخاطب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Pick from native phonebook if supported */}
          {supportsNativePicker && (
            <button
              onClick={handlePickFromPhone}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all active:scale-95"
              title="انتخاب از دفترچه تلفن داخلی گوشی"
            >
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>دفترچه تلفن</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-all active:scale-95" title="ورود از فایل vCard یا CSV">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>فایل مخاطب</span>
            <input
              type="file"
              accept=".vcf,.csv"
              onChange={handleImportVcardOrCsv}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>مخاطب جدید</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'همه مخاطبین' },
          { id: 'کاری', label: 'کاری' },
          { id: 'شخصی', label: 'شخصی' },
          { id: 'خانواده', label: 'خانواده' },
          { id: 'ضروری', label: 'ضروری' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
              selectedCategory === cat.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-3">
          <Users className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
          <p>
            {searchQuery
              ? 'مخاطبی مطابق با عبارت جستجو یافت نشد.'
              : 'هنوز هیچ مخاطبی ثبت نشده است.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-block transition-all"
          >
            افزودن اولین مخاطب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredContacts.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col justify-between gap-3 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                    {c.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                        {c.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono dir-ltr mt-1 truncate">
                    {c.phoneNumber}
                  </div>
                  {c.email && (
                    <div className="text-[11px] text-slate-500 dir-ltr mt-0.5 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-600" />
                      {c.email}
                    </div>
                  )}
                  {c.notes && (
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                      {c.notes}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteContact(c.id, c.name)}
                  className="opacity-40 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all shrink-0"
                  title="حذف مخاطب"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Call & SMS Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    vibratePhone(40);
                    triggerPhoneCall(c.phoneNumber);
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>تماس</span>
                </button>

                <button
                  onClick={() => onNavigateToSms(c.phoneNumber)}
                  className="py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>پیامک</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              افزودن مخاطب به پایگاه داده لوکال
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  placeholder="مثلاً: محمد صادقی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">شماره تلفن همراه یا ثابت *</label>
                <input
                  type="tel"
                  placeholder="09121234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">دسته‌بندی</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-cyan-400"
                >
                  <option value="شخصی">شخصی</option>
                  <option value="کاری">کاری</option>
                  <option value="خانواده">خانواده</option>
                  <option value="ضروری">ضروری</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">آدرس ایمیل (اختیاری)</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">یادداشت اختصاصی (اختیاری)</label>
                <textarea
                  rows={2}
                  placeholder="اطلاعات تکمیلی یا سِمت..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveContact}
                disabled={!name.trim() || !phoneNumber.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
              >
                ذخیره در دیتابیس
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
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
