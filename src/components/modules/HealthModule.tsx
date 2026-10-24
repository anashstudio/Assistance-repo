import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Pill, 
  ShieldAlert, 
  Activity, 
  Plus, 
  Check, 
  Trash2, 
  PhoneCall, 
  Calendar, 
  Clock, 
  User, 
  Heart,
  Droplet
} from 'lucide-react';
import { MedicalIdInfo, MedicationItem, HealthVitalLog } from '../../types';
import { localDB } from '../../services/db';
import { triggerPhoneCall, vibratePhone } from '../../services/device';

const DEFAULT_MEDICAL_ID: MedicalIdInfo = {
  fullName: '',
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
};

const DEFAULT_MEDICATIONS: MedicationItem[] = [];

export const HealthModule: React.FC = () => {
  const [medicalId, setMedicalId] = useState<MedicalIdInfo>(DEFAULT_MEDICAL_ID);
  const [medications, setMedications] = useState<MedicationItem[]>(DEFAULT_MEDICATIONS);
  const [vitals, setVitals] = useState<HealthVitalLog[]>([]);
  const [isEditingMedicalId, setIsEditingMedicalId] = useState<boolean>(false);
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);
  const [showAddVitalModal, setShowAddVitalModal] = useState<boolean>(false);

  // New med form
  const [medName, setMedName] = useState<string>('');
  const [medDosage, setMedDosage] = useState<string>('');
  const [medFrequency, setMedFrequency] = useState<string>('روزانه');
  const [medTime, setMedTime] = useState<string>('09:00');

  // New vital form
  const [vitalType, setVitalType] = useState<'فشار خون' | 'قند خون' | 'وزن' | 'ضربان قلب'>('فشار خون');
  const [vitalValue, setVitalValue] = useState<string>('');

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    const savedMedId = await localDB.getSetting<MedicalIdInfo>('app_health_medical_id', DEFAULT_MEDICAL_ID);
    const savedMeds = await localDB.getSetting<MedicationItem[]>('app_health_medications', DEFAULT_MEDICATIONS);
    const savedVitals = await localDB.getSetting<HealthVitalLog[]>('app_health_vitals', []);
    setMedicalId(savedMedId);
    setMedications(savedMeds);
    setVitals(savedVitals);
  };

  const handleToggleMedTaken = async (id: string) => {
    vibratePhone(35);
    const updated = medications.map((m) => {
      if (m.id === id) {
        const nextState = !m.takenToday;
        const nextStock = nextState && m.stockCount ? Math.max(0, m.stockCount - 1) : m.stockCount;
        return { ...m, takenToday: nextState, stockCount: nextStock };
      }
      return m;
    });
    setMedications(updated);
    await localDB.setSetting('app_health_medications', updated);
  };

  const handleSaveMedicalId = async () => {
    vibratePhone(25);
    await localDB.setSetting('app_health_medical_id', medicalId);
    setIsEditingMedicalId(false);
  };

  const handleAddMedication = async () => {
    if (!medName.trim()) return;

    vibratePhone(30);
    const newMed: MedicationItem = {
      id: 'med_' + Date.now(),
      name: medName.trim(),
      dosage: medDosage.trim() || '۱ دوز',
      frequency: medFrequency,
      timesPerDay: [medTime],
      takenToday: false,
      stockCount: 30,
    };

    const updated = [...medications, newMed];
    setMedications(updated);
    await localDB.setSetting('app_health_medications', updated);
    setShowAddMedModal(false);
    setMedName('');
    setMedDosage('');
  };

  const handleDeleteMed = async (id: string) => {
    if (window.confirm('آیا این دارو از لیست حذف شود؟')) {
      const updated = medications.filter((m) => m.id !== id);
      setMedications(updated);
      await localDB.setSetting('app_health_medications', updated);
    }
  };

  const handleAddVital = async () => {
    if (!vitalValue.trim()) return;

    vibratePhone(30);
    const units: Record<string, string> = {
      'فشار خون': 'mmHg',
      'قند خون': 'mg/dL',
      'وزن': 'کیلوگرم',
      'ضربان قلب': 'bpm',
    };

    const newVital: HealthVitalLog = {
      id: 'vital_' + Date.now(),
      type: vitalType,
      value: vitalValue.trim(),
      unit: units[vitalType] || '',
      timestamp: Date.now(),
    };

    const updated = [newVital, ...vitals];
    setVitals(updated);
    await localDB.setSetting('app_health_vitals', updated);
    setShowAddVitalModal(false);
    setVitalValue('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Emergency Medical ID Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">کارت هویت پزشکی اورژانس (Medical ID)</h3>
              <p className="text-[11px] text-slate-400">اطلاعات حیاتی امداد و نجات در مواقع اضطراری</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingMedicalId(!isEditingMedicalId)}
            className="text-xs text-rose-300 hover:text-rose-200 font-semibold"
          >
            {isEditingMedicalId ? 'بستن' : 'ویرایش اطلاعات'}
          </button>
        </div>

        {!isEditingMedicalId ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">گروه خونی:</span>
              <span className="text-base font-black text-rose-400 font-mono">{medicalId.bloodType}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">حساسیت دارویی:</span>
              <span className="font-bold text-slate-200 truncate block">{medicalId.allergies || 'ندارد'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">بیماری مزمن:</span>
              <span className="font-bold text-slate-200 truncate block">{medicalId.chronicConditions || 'ندارد'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">تماس اضطراری:</span>
                <span className="font-bold text-slate-200 text-[11px] truncate block">{medicalId.emergencyContactName}</span>
              </div>
              <button
                onClick={() => triggerPhoneCall(medicalId.emergencyContactPhone)}
                className="p-2 rounded-lg bg-emerald-600 text-white shadow-md active:scale-95"
                title="تماس فوری با شخص اورژانسی"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">گروه خونی</label>
                <input
                  type="text"
                  value={medicalId.bloodType}
                  onChange={(e) => setMedicalId({ ...medicalId, bloodType: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">شماره تماس اضطراری</label>
                <input
                  type="text"
                  value={medicalId.emergencyContactPhone}
                  onChange={(e) => setMedicalId({ ...medicalId, emergencyContactPhone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">حساسیت‌ها</label>
                <input
                  type="text"
                  value={medicalId.allergies}
                  onChange={(e) => setMedicalId({ ...medicalId, allergies: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">بیماری‌های خاص یا زمینه</label>
                <input
                  type="text"
                  value={medicalId.chronicConditions}
                  onChange={(e) => setMedicalId({ ...medicalId, chronicConditions: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <button
              onClick={handleSaveMedicalId}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              ذخیره تغییرات کارت پزشکی
            </button>
          </div>
        )}
      </div>

      {/* Medications Reminder Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white">یادآور هوشمند مصرف داروها</h4>
          </div>

          <button
            onClick={() => setShowAddMedModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>افزودن داروی جدید</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {medications.length === 0 ? (
            <div className="sm:col-span-2 p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
              <Pill className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
              <p>هنوز دارویی در یادآور ثبت نشده است.</p>
              <p className="text-[11px] text-slate-600">برای ثبت دوز و زمان‌بندی مصرف داروها روی «افزودن داروی جدید» کلیک کنید.</p>
            </div>
          ) : (
            medications.map((med) => (
            <div
              key={med.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                med.takenToday
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h5 className="text-sm font-bold text-white truncate">{med.name}</h5>
                  <div className="text-xs text-slate-400 mt-0.5">
                    دوز: {med.dosage} • زمان: {med.frequency}
                  </div>
                  {med.stockCount !== undefined && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      موجودی در جعبه: <span className="font-mono text-cyan-400 font-bold">{med.stockCount}</span> عدد
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteMed(med.id)}
                  className="p-1 rounded-md text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Take Button */}
              <button
                onClick={() => handleToggleMedTaken(med.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  med.takenToday
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{med.takenToday ? 'امروز مصرف شد ✓' : 'ثبت مصرف دارو'}</span>
              </button>
            </div>
          )))}
        </div>
      </div>

      {/* Vital Signs Tracker */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">ثبت علائم حیاتی و سنجش‌ها (فشار خون، قند، وزن)</h4>
          </div>

          <button
            onClick={() => setShowAddVitalModal(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت سنجش جدید</span>
          </button>
        </div>

        {vitals.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            هنوز علامتی ثبت نشده است. سنجش‌های روزانه خود را برای پایش سلامت ثبت نمایید.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {vitals.slice(0, 4).map((v) => (
              <div key={v.id} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">{v.type}</span>
                <span className="text-sm font-black font-mono text-white mt-0.5 block">
                  {v.value} <span className="text-[10px] text-slate-400 font-normal">{v.unit}</span>
                </span>
                <span className="text-[9px] text-slate-500 block mt-1">
                  {new Date(v.timestamp).toLocaleDateString('fa-IR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Medication Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3.5 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-cyan-400" />
              افزودن داروی جدید به برنامه
            </h3>
            <div>
              <label className="text-slate-400 block mb-1">نام دارو *</label>
              <input
                type="text"
                placeholder="مثلاً: لوزارتان ۲۵ یا آسپرین"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">دوز مصرفی</label>
              <input
                type="text"
                placeholder="مثلاً: ۱ عدد یا نصف قرص"
                value={medDosage}
                onChange={(e) => setMedDosage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">دوره مصرف</label>
              <input
                type="text"
                placeholder="روزانه صبح‌ها / هر ۱۲ ساعت"
                value={medFrequency}
                onChange={(e) => setMedFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddMedication}
                disabled={!medName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                ثبت دارو
              </button>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vital Modal */}
      {showAddVitalModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3.5 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              ثبت سنجش جدید
            </h3>
            <div>
              <label className="text-slate-400 block mb-1">نوع سنجش</label>
              <select
                value={vitalType}
                onChange={(e) => setVitalType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="فشار خون">فشار خون (مثلاً 120/80)</option>
                <option value="قند خون">قند خون (مثلاً 95)</option>
                <option value="وزن">وزن (کیلوگرم)</option>
                <option value="ضربان قلب">ضربان قلب (تعداد در دقیقه)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">مقدار اندازه‌گیری شده</label>
              <input
                type="text"
                placeholder="120/80 یا 95"
                value={vitalValue}
                onChange={(e) => setVitalValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddVital}
                disabled={!vitalValue.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                ثبت سنجش
              </button>
              <button
                onClick={() => setShowAddVitalModal(false)}
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
