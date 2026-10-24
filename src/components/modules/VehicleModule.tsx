import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Gauge, 
  MapPin, 
  ShieldAlert, 
  Wrench, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Trash2, 
  FileCheck,
  RotateCw
} from 'lucide-react';
import { VehicleInfo, VehicleServiceItem } from '../../types';
import { localDB } from '../../services/db';
import { vibratePhone } from '../../services/device';

interface VehicleModuleProps {
  onRefreshStats?: () => void;
}

const DEFAULT_SERVICES: VehicleServiceItem[] = [];

const DEFAULT_VEHICLE_INFO: VehicleInfo = {
  model: 'خودروی سواری شخصی',
  plateNumber: '',
  currentKilometers: 0,
  insuranceExpiryDate: '',
  inspectionExpiryDate: '',
  parkingFloor: '',
  parkingSpot: '',
  parkingNotes: '',
};

export const VehicleModule: React.FC<VehicleModuleProps> = () => {
  const [vehicle, setVehicle] = useState<VehicleInfo>(DEFAULT_VEHICLE_INFO);
  const [services, setServices] = useState<VehicleServiceItem[]>(DEFAULT_SERVICES);
  const [isEditingKm, setIsEditingKm] = useState<boolean>(false);
  const [newKmInput, setNewKmInput] = useState<string>('');
  const [isEditingParking, setIsEditingParking] = useState<boolean>(false);
  const [parkingFloorInput, setParkingFloorInput] = useState<string>('');
  const [parkingSpotInput, setParkingSpotInput] = useState<string>('');
  const [parkingNotesInput, setParkingNotesInput] = useState<string>('');
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);

  // New service form
  const [newSrvTitle, setNewSrvTitle] = useState<string>('');
  const [newSrvInterval, setNewSrvInterval] = useState<string>('10000');
  const [newSrvNotes, setNewSrvNotes] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedVehicle = await localDB.getSetting<VehicleInfo>('app_vehicle_info', DEFAULT_VEHICLE_INFO);
    const savedServices = await localDB.getSetting<VehicleServiceItem[]>('app_vehicle_services', DEFAULT_SERVICES);
    setVehicle(savedVehicle);
    setServices(savedServices);
  };

  const handleUpdateKm = async () => {
    const km = parseInt(newKmInput, 10);
    if (!km || km < 0) return;

    vibratePhone(25);
    const updated = { ...vehicle, currentKilometers: km };
    setVehicle(updated);
    await localDB.setSetting('app_vehicle_info', updated);
    setIsEditingKm(false);
  };

  const handleSaveParking = async () => {
    vibratePhone(25);
    const updated = {
      ...vehicle,
      parkingFloor: parkingFloorInput,
      parkingSpot: parkingSpotInput,
      parkingNotes: parkingNotesInput,
    };
    setVehicle(updated);
    await localDB.setSetting('app_vehicle_info', updated);
    setIsEditingParking(false);
  };

  const handleResetService = async (serviceId: string) => {
    if (window.confirm('آیا تعویض این قطعه در کیلومتر فعلی ثبت شود؟')) {
      vibratePhone(40);
      const updated = services.map((s) => {
        if (s.id === serviceId) {
          return {
            ...s,
            lastReplacedKm: vehicle.currentKilometers,
            lastReplacedDate: new Date().toLocaleDateString('fa-IR'),
          };
        }
        return s;
      });
      setServices(updated);
      await localDB.setSetting('app_vehicle_services', updated);
    }
  };

  const handleAddService = async () => {
    if (!newSrvTitle.trim()) return;

    vibratePhone(30);
    const newService: VehicleServiceItem = {
      id: 'srv_' + Date.now(),
      title: newSrvTitle.trim(),
      intervalKm: parseInt(newSrvInterval, 10) || 10000,
      lastReplacedKm: vehicle.currentKilometers,
      lastReplacedDate: new Date().toLocaleDateString('fa-IR'),
      notes: newSrvNotes.trim() || undefined,
    };

    const updated = [...services, newService];
    setServices(updated);
    await localDB.setSetting('app_vehicle_services', updated);
    setShowAddServiceModal(false);
    setNewSrvTitle('');
    setNewSrvNotes('');
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('آیا این آیتم سرویس حذف شود؟')) {
      const updated = services.filter((s) => s.id !== id);
      setServices(updated);
      await localDB.setSetting('app_vehicle_services', updated);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Odometer & Vehicle Header Card */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-[#0c1220] border border-indigo-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{vehicle.model}</h3>
              <span className="text-xs text-slate-400 font-mono">{vehicle.plateNumber}</span>
            </div>
          </div>

          {/* Current Odometer */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
            <Gauge className="w-5 h-5 text-cyan-400" />
            {!isEditingKm ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {vehicle.currentKilometers.toLocaleString('fa-IR')}
                </span>
                <span className="text-[11px] text-slate-400">کیلومتر</span>
                <button
                  onClick={() => {
                    setNewKmInput(String(vehicle.currentKilometers));
                    setIsEditingKm(true);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold mr-2"
                >
                  ویرایش
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={newKmInput}
                  onChange={(e) => setNewKmInput(e.target.value)}
                  className="w-28 px-2 py-1 rounded-lg bg-slate-800 text-white font-mono text-xs border border-slate-700"
                />
                <button
                  onClick={handleUpdateKm}
                  className="px-2 py-1 rounded-lg bg-cyan-600 text-white text-[10px] font-bold"
                >
                  ثبت
                </button>
                <button
                  onClick={() => setIsEditingKm(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px]"
                >
                  لغو
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Insurance & Inspection badges */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">انقضای بیمه شخص ثالث:</span>
              <span className="font-mono text-slate-200 font-bold">{vehicle.insuranceExpiryDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
            <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">معاینه فنی معتبر تا:</span>
              <span className="font-mono text-slate-200 font-bold">{vehicle.inspectionExpiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Location Widget */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-bold text-white">یادداشت موقعیت و جای پارک خودرو</h4>
          </div>
          <button
            onClick={() => {
              setParkingFloorInput(vehicle.parkingFloor || '');
              setParkingSpotInput(vehicle.parkingSpot || '');
              setParkingNotesInput(vehicle.parkingNotes || '');
              setIsEditingParking(!isEditingParking);
            }}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
          >
            {isEditingParking ? 'بستن' : 'تغییر محل پارک'}
          </button>
        </div>

        {!isEditingParking ? (
          <div className="flex items-center gap-4 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex-1">
              <span className="text-[10px] text-slate-400 block">طبقه پارکینگ:</span>
              <span className="font-bold text-white">{vehicle.parkingFloor || 'مشخص نشده'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex-1">
              <span className="text-[10px] text-slate-400 block">شماره ستون / محل:</span>
              <span className="font-bold text-cyan-300">{vehicle.parkingSpot || 'مشخص نشده'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="طبقه (مثلاً منفی ۲)"
                value={parkingFloorInput}
                onChange={(e) => setParkingFloorInput(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
              <input
                type="text"
                placeholder="شماره ستون (مثلاً B-14)"
                value={parkingSpotInput}
                onChange={(e) => setParkingSpotInput(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <input
              type="text"
              placeholder="توضیح بیشتر (مثلاً کنار آسانسور غربی)"
              value={parkingNotesInput}
              onChange={(e) => setParkingNotesInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
            />
            <button
              onClick={handleSaveParking}
              className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
            >
              ذخیره جای پارک جدید
            </button>
          </div>
        )}
      </div>

      {/* Services & Maintenance List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white">سرویس‌های دوره‌ای و قطعات مصرفی</h4>
          </div>

          <button
            onClick={() => setShowAddServiceModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>افزودن قطعه / سرویس</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {services.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
              <Wrench className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
              <p>هنوز سرویس یا قطعه مصرفی ثبت نشده است.</p>
              <p className="text-[11px] text-slate-600">برای رصد تعویض روغن، لنت و تسمه‌ها روی «افزودن قطعه / سرویس» بزنید.</p>
            </div>
          ) : (
            services.map((srv) => {
            const kmSinceLast = vehicle.currentKilometers - srv.lastReplacedKm;
            const remainingKm = srv.intervalKm - kmSinceLast;
            const percentUsed = Math.min(100, Math.max(0, (kmSinceLast / srv.intervalKm) * 100));
            const isDue = remainingKm <= 0;
            const isNear = remainingKm > 0 && remainingKm <= 500;

            return (
              <div
                key={srv.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isDue
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isNear
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {srv.title}
                      {isDue && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                          نیاز به تعویض فوری!
                        </span>
                      )}
                      {isNear && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                          نزدیک به سرویس
                        </span>
                      )}
                    </h5>
                    <span className="text-[10px] text-slate-400">
                      دوره تعویض: هر {srv.intervalKm.toLocaleString('fa-IR')} کیلومتر • آخرین تعویض: {srv.lastReplacedKm.toLocaleString('fa-IR')} کیلومتر
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetService(srv.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      title="ثبت تعویض این قطعه در کیلومتر فعلی"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>ثبت تعویض</span>
                    </button>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                    <span className="text-slate-400">
                      کارکرد: {kmSinceLast.toLocaleString('fa-IR')} از {srv.intervalKm.toLocaleString('fa-IR')} کیلومتر
                    </span>
                    <span className={`font-bold ${isDue ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {isDue ? 'گذشته از موعد!' : `${remainingKm.toLocaleString('fa-IR')} کیلومتر مانده`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDue ? 'bg-rose-500' : isNear ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              افزودن آیتم جدید سرویس خودرو
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">نام قطعه یا سرویس *</label>
                <input
                  type="text"
                  placeholder="مثلاً: فیلتر هوا یا روغن گیربکس"
                  value={newSrvTitle}
                  onChange={(e) => setNewSrvTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">دوره تعویض (به کیلومتر) *</label>
                <input
                  type="number"
                  placeholder="مثلاً: 10000"
                  value={newSrvInterval}
                  onChange={(e) => setNewSrvInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">یادداشت فنی (اختیاری)</label>
                <input
                  type="text"
                  placeholder="مدل قطعه یا برند..."
                  value={newSrvNotes}
                  onChange={(e) => setNewSrvNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddService}
                disabled={!newSrvTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
              >
                ثبت قطعه
              </button>
              <button
                onClick={() => setShowAddServiceModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
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
