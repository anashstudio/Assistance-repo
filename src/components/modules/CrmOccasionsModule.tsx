import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Cake, 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Trash2, 
  Heart, 
  Sparkles, 
  MessageCircle, 
  PhoneCall, 
  Coffee, 
  Shirt,
  Search
} from 'lucide-react';
import { OccasionItem, PersonProfile } from '../../types';
import { localDB } from '../../services/db';
import { triggerPhoneCall, triggerSendSms, vibratePhone } from '../../services/device';

const DEFAULT_OCCASIONS: OccasionItem[] = [];

const DEFAULT_PERSONS: PersonProfile[] = [];

export const CrmOccasionsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'occasions' | 'profiles'>('occasions');
  const [occasions, setOccasions] = useState<OccasionItem[]>(DEFAULT_OCCASIONS);
  const [persons, setPersons] = useState<PersonProfile[]>(DEFAULT_PERSONS);
  const [showAddOccModal, setShowAddOccModal] = useState<boolean>(false);
  const [showAddPerModal, setShowAddPerModal] = useState<boolean>(false);

  // New occasion form
  const [occName, setOccName] = useState<string>('');
  const [occTitle, setOccTitle] = useState<string>('تولد');
  const [occDate, setOccDate] = useState<string>('');
  const [occDays, setOccDays] = useState<string>('10');

  // New person form
  const [perName, setPerName] = useState<string>('');
  const [perPhone, setPerPhone] = useState<string>('');
  const [perRelation, setPerRelation] = useState<'دوست' | 'همکار' | 'خانواده' | 'مشتری' | 'مدیر'>('دوست');
  const [perSize, setPerSize] = useState<string>('');
  const [perDrink, setPerDrink] = useState<string>('');
  const [perNotes, setPerNotes] = useState<string>('');

  useEffect(() => {
    loadCrmData();
  }, []);

  const loadCrmData = async () => {
    const savedOcc = await localDB.getSetting<OccasionItem[]>('app_crm_occasions', DEFAULT_OCCASIONS);
    const savedPer = await localDB.getSetting<PersonProfile[]>('app_crm_persons', DEFAULT_PERSONS);
    setOccasions(savedOcc);
    setPersons(savedPer);
  };

  const handleTouchInteraction = async (personId: string) => {
    vibratePhone(25);
    const updated = persons.map((p) => {
      if (p.id === personId) {
        return { ...p, lastInteractionDate: Date.now() };
      }
      return p;
    });
    setPersons(updated);
    await localDB.setSetting('app_crm_persons', updated);
  };

  const handleAddOccasion = async () => {
    if (!occName.trim() || !occDate.trim()) return;

    vibratePhone(30);
    const newOcc: OccasionItem = {
      id: 'occ_' + Date.now(),
      personName: occName.trim(),
      title: occTitle.trim(),
      solarDate: occDate.trim(),
      daysRemaining: parseInt(occDays, 10) || 0,
      category: occTitle.includes('تولد') ? 'تولد' : 'سالگرد',
    };

    const updated = [...occasions, newOcc];
    setOccasions(updated);
    await localDB.setSetting('app_crm_occasions', updated);
    setShowAddOccModal(false);
    setOccName('');
    setOccDate('');
  };

  const handleDeleteOccasion = async (id: string) => {
    if (window.confirm('آیا این مناسبت حذف شود؟')) {
      const updated = occasions.filter((o) => o.id !== id);
      setOccasions(updated);
      await localDB.setSetting('app_crm_occasions', updated);
    }
  };

  const handleAddPerson = async () => {
    if (!perName.trim()) return;

    vibratePhone(30);
    const newPer: PersonProfile = {
      id: 'per_' + Date.now(),
      name: perName.trim(),
      phoneNumber: perPhone.trim() || undefined,
      relation: perRelation,
      lastInteractionDate: Date.now(),
      clothingSize: perSize.trim() || undefined,
      favoriteCoffeeDrink: perDrink.trim() || undefined,
      personalNotes: perNotes.trim() || undefined,
    };

    const updated = [newPer, ...persons];
    setPersons(updated);
    await localDB.setSetting('app_crm_persons', updated);
    setShowAddPerModal(false);
    setPerName('');
    setPerPhone('');
  };

  const calculateDaysAgo = (timestamp?: number) => {
    if (!timestamp) return 'نامشخص';
    const diffMs = Date.now() - timestamp;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'امروز';
    if (days === 1) return 'دیروز';
    return `${days} روز پیش`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Sub tabs */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('occasions')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'occasions'
              ? 'bg-rose-500/20 text-rose-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cake className="w-4 h-4 text-rose-400" />
          <span>زادروزها و مناسبت‌ها ({occasions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'profiles'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>پروفایل‌های شخصی و ردیاب تماس ({persons.length})</span>
        </button>
      </div>

      {activeTab === 'occasions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">شمارش معکوس مناسبت‌ها و زادروزهای مهم</span>
            <button
              onClick={() => setShowAddOccModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-rose-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت مناسبت جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {occasions.length === 0 ? (
              <div className="sm:col-span-2 p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
                <Cake className="w-8 h-8 mx-auto opacity-30 text-rose-400" />
                <p>هنوز مناسبتی ثبت نشده است.</p>
                <p className="text-[11px] text-slate-600">برای ثبت زادروز، سالگرد یا موعدهای مهم روی «ثبت مناسبت جدید» کلیک کنید.</p>
              </div>
            ) : (
              occasions.map((occ) => {
              const isUrgent = occ.daysRemaining !== undefined && occ.daysRemaining <= 7;
              return (
                <div
                  key={occ.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isUrgent
                      ? 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{occ.personName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-rose-300 border border-slate-700">
                          {occ.title}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        تاریخ: {occ.solarDate}
                      </div>
                      {occ.notes && (
                        <div className="text-[11px] text-slate-400 mt-1 italic">{occ.notes}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteOccasion(occ.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1 text-xs">
                      {isUrgent ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5" />
                          تنها {occ.daysRemaining} روز مانده!
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {occ.daysRemaining} روز تا موعد
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => triggerSendSms('', `سلام ${occ.personName} جان، ${occ.title}ت مبارک باشه!`)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <MessageCircle className="w-3 h-3 text-rose-400" />
                      <span>ارسال تبریک</span>
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">نکات شخصی و ردیاب آخرین ارتباط با افراد مهم</span>
            <button
              onClick={() => setShowAddPerModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>پروفایل فرد جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {persons.length === 0 ? (
              <div className="sm:col-span-2 p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
                <Users className="w-8 h-8 mx-auto opacity-30 text-cyan-400" />
                <p>هنوز پروفایل فردی ثبت نشده است.</p>
                <p className="text-[11px] text-slate-600">برای رصد ارتباط و ثبت مشخصات دوستان روی «ثبت فرد جدید» کلیک کنید.</p>
              </div>
            ) : (
              persons.map((p) => {
              const daysSince = p.lastInteractionDate 
                ? Math.floor((Date.now() - p.lastInteractionDate) / (1000 * 60 * 60 * 24))
                : 0;
              const needsCall = daysSince > 14;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    needsCall
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300">
                          {p.relation}
                        </span>
                      </div>
                      {p.phoneNumber && (
                        <div className="text-xs text-slate-400 font-mono dir-ltr text-right mt-0.5">
                          {p.phoneNumber}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">آخرین ارتباط:</span>
                      <span className={`text-[11px] font-bold ${needsCall ? 'text-amber-400' : 'text-slate-300'}`}>
                        {calculateDaysAgo(p.lastInteractionDate)}
                      </span>
                    </div>
                  </div>

                  {/* Personal details pills */}
                  <div className="space-y-1.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                    {p.clothingSize && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Shirt className="w-3 h-3 text-cyan-400" />
                        <span>سایز لباس/کفش: <strong className="text-slate-200">{p.clothingSize}</strong></span>
                      </div>
                    )}
                    {p.favoriteCoffeeDrink && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Coffee className="w-3 h-3 text-amber-400" />
                        <span>نوشیدنی مورد علاقه: <strong className="text-slate-200">{p.favoriteCoffeeDrink}</strong></span>
                      </div>
                    )}
                    {p.personalNotes && (
                      <div className="text-[10px] text-slate-400 italic">
                        {p.personalNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleTouchInteraction(p.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      ثبت گفتگو در امروز
                    </button>

                    <div className="flex items-center gap-1.5">
                      {p.phoneNumber && (
                        <button
                          onClick={() => {
                            handleTouchInteraction(p.id);
                            if (p.phoneNumber) triggerPhoneCall(p.phoneNumber);
                          }}
                          className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                          title="تماس تلفنی"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* Add Occasion Modal */}
      {showAddOccModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3.5 shadow-2xl text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Cake className="w-4 h-4 text-rose-400" />
              ثبت مناسبت یا زادروز جدید
            </h4>
            <div>
              <label className="text-slate-400 block mb-1">نام شخص *</label>
              <input
                type="text"
                placeholder="مثلاً: محمد صادقی یا همسر"
                value={occName}
                onChange={(e) => setOccName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">عنوان مناسبت</label>
              <input
                type="text"
                placeholder="تولد / سالگرد ازدواج / ..."
                value={occTitle}
                onChange={(e) => setOccTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">تاریخ شمسی</label>
                <input
                  type="text"
                  placeholder="مثلاً ۱۵ آبان"
                  value={occDate}
                  onChange={(e) => setOccDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">روزهای مانده</label>
                <input
                  type="number"
                  value={occDays}
                  onChange={(e) => setOccDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddOccasion}
                disabled={!occName.trim() || !occDate.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                ثبت مناسبت
              </button>
              <button
                onClick={() => setShowAddOccModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Profile Modal */}
      {showAddPerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3 shadow-2xl text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              افزودن پروفایل فردی
            </h4>
            <div>
              <label className="text-slate-400 block mb-1">نام کامل *</label>
              <input
                type="text"
                value={perName}
                onChange={(e) => setPerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">نسبت یا ارتباط</label>
              <select
                value={perRelation}
                onChange={(e) => setPerRelation(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="دوست">دوست</option>
                <option value="همکار">همکار</option>
                <option value="خانواده">خانواده</option>
                <option value="مشتری">مشتری</option>
                <option value="مدیر">مدیر</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">شماره تماس</label>
              <input
                type="text"
                placeholder="0912..."
                value={perPhone}
                onChange={(e) => setPerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">سایز لباس یا کفش</label>
              <input
                type="text"
                placeholder="مثلاً: XL یا ۴۳"
                value={perSize}
                onChange={(e) => setPerSize(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddPerson}
                disabled={!perName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                ثبت پروفایل
              </button>
              <button
                onClick={() => setShowAddPerModal(false)}
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
