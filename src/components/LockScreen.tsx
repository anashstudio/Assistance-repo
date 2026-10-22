import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, Delete, KeyRound, AlertCircle, Shield, Clock, Calendar, Sparkles } from 'lucide-react';
import { authenticateWithBiometrics, hashPin, isBiometricsAvailable } from '../services/biometrics';
import { vibratePhone } from '../services/device';

interface LockScreenProps {
  onUnlock: () => void;
  savedPinHash: string;
  isBiometricEnabled: boolean;
  appIcon?: string;
  onOpenIconModal?: () => void;
}

const KEYPAD_DIGITS = [
  { num: '1', letters: '' },
  { num: '2', letters: 'ABC' },
  { num: '3', letters: 'DEF' },
  { num: '4', letters: 'GHI' },
  { num: '5', letters: 'JKL' },
  { num: '6', letters: 'MNO' },
  { num: '7', letters: 'PQRS' },
  { num: '8', letters: 'TUV' },
  { num: '9', letters: 'WXYZ' },
];

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlock,
  savedPinHash,
  isBiometricEnabled,
  appIcon,
  onOpenIconModal,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState<boolean>(false);
  const [hasBiometricSensor, setHasBiometricSensor] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFa, setCurrentDateFa] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    // Clock updater
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      try {
        setCurrentDateFa(
          new Intl.DateTimeFormat('fa-IR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(now)
        );
      } catch {
        setCurrentDateFa(now.toLocaleDateString('fa-IR'));
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    isBiometricsAvailable().then((supported) => {
      setHasBiometricSensor(supported);
      if (supported && isBiometricEnabled) {
        handleBiometricAuth();
      }
    });
  }, [isBiometricEnabled]);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      vibratePhone(25);
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage(null);
      if (nextPin.length === 6) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    vibratePhone(15);
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    vibratePhone(15);
    setPin('');
    setErrorMessage(null);
  };

  const verifyPin = async (candidatePin: string) => {
    const hashed = await hashPin(candidatePin);
    if (hashed === savedPinHash) {
      vibratePhone(50);
      onUnlock();
    } else {
      vibratePhone([60, 50, 60]);
      setIsShaking(true);
      setErrorMessage('کد عبور نامعتبر است');
      setTimeout(() => {
        setPin('');
        setIsShaking(false);
      }, 600);
    }
  };

  const handleBiometricAuth = async () => {
    setIsBiometricPrompting(true);
    setErrorMessage(null);
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        vibratePhone(40);
        onUnlock();
      }
    } finally {
      setIsBiometricPrompting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060a14] flex flex-col justify-between items-center px-6 py-6 text-white select-none overflow-y-auto">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-tr from-cyan-600/15 via-indigo-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Clock, Solar Date & Brand */}
      <div className="relative z-10 flex flex-col items-center mt-3 text-center space-y-1">
        <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-wider drop-shadow-md">
          {currentTime || '۱۲:۰۰'}
        </div>
        <div className="text-xs text-cyan-300 font-semibold flex items-center gap-1.5 opacity-90">
          <Calendar className="w-3.5 h-3.5" />
          <span>{currentDateFa}</span>
        </div>

        {/* Brand Icon Badge (Clickable to change icon if handler exists) */}
        <div className="pt-4 flex flex-col items-center">
          <div
            onClick={onOpenIconModal}
            className="group relative cursor-pointer active:scale-95 transition-transform"
            title="کلیک برای تغییر آیکون برنامه"
          >
            <div className="w-16 h-16 rounded-3xl p-0.5 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 shadow-xl shadow-cyan-500/25 flex items-center justify-center">
              {appIcon ? (
                <img
                  src={appIcon}
                  alt="App Icon"
                  className="w-full h-full object-cover rounded-[22px] bg-slate-950"
                />
              ) : (
                <div className="w-full h-full bg-[#0a1020] rounded-[22px] flex items-center justify-center">
                  <Lock className="w-7 h-7 text-cyan-400" />
                </div>
              )}
            </div>
            {onOpenIconModal && (
              <span className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full bg-cyan-500 text-[8px] font-bold text-slate-950 shadow-md">
                تغییر
              </span>
            )}
          </div>
          <h2 className="text-base font-black text-slate-100 tracking-wide mt-2">
            دستیار همراه هوشمند آناش
          </h2>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <Shield className="w-3 h-3 text-cyan-400" />
            حفاظت دو مرحله‌ای امنیتی
          </span>
        </div>
      </div>

      {/* PIN Dots Area */}
      <div className="relative z-10 flex flex-col items-center my-4">
        <div className={`flex items-center gap-3.5 dir-ltr mb-2 ${isShaking ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-gradient-to-tr from-cyan-400 to-indigo-400 scale-125 shadow-lg shadow-cyan-400/60 ring-2 ring-cyan-300/40'
                    : 'bg-slate-800/90 border border-slate-700/80'
                }`}
              />
            );
          })}
        </div>

        {errorMessage ? (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1 animate-bounce font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 mt-1 font-mono">
            رمز پیش‌فرض: ۱۲۳۴۵۶
          </span>
        )}
      </div>

      {/* Cyberpunk Glass Keypad */}
      <div className="relative z-10 w-full max-w-xs space-y-3 mb-2" dir="ltr">
        <div className="grid grid-cols-3 gap-3">
          {KEYPAD_DIGITS.map(({ num, letters }) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-16 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 text-white font-bold text-2xl font-mono border border-slate-800 hover:border-cyan-500/40 active:scale-95 transition-all shadow-md flex flex-col items-center justify-center leading-none"
            >
              <span>{num}</span>
              {letters && (
                <span className="text-[8px] font-sans text-slate-500 font-semibold tracking-wider mt-0.5">
                  {letters}
                </span>
              )}
            </button>
          ))}

          {/* Biometrics button */}
          {hasBiometricSensor && isBiometricEnabled ? (
            <button
              onClick={handleBiometricAuth}
              disabled={isBiometricPrompting}
              className="h-16 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/60 text-cyan-400 border border-cyan-500/30 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 shadow-md shadow-cyan-950/30"
              title="ورود با اثر انگشت یا چهره"
            >
              <Fingerprint className="w-6 h-6 animate-pulse text-cyan-300" />
              <span className="text-[8px] font-bold text-cyan-200">بیومتریک</span>
            </button>
          ) : (
            <button
              onClick={handleClear}
              className="h-16 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800/80 active:scale-95 transition-all flex items-center justify-center"
            >
              پاک‌کردن
            </button>
          )}

          {/* 0 */}
          <button
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 text-white font-bold text-2xl font-mono border border-slate-800 hover:border-cyan-500/40 active:scale-95 transition-all shadow-md flex flex-col items-center justify-center leading-none"
          >
            <span>0</span>
            <span className="text-[8px] font-sans text-slate-500 font-semibold mt-0.5">+</span>
          </button>

          {/* Backspace */}
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-rose-400 border border-slate-800/80 active:scale-95 transition-all flex items-center justify-center"
            title="حذف آخرین رقم"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Biometric trigger action bar */}
        {hasBiometricSensor && isBiometricEnabled && (
          <button
            onClick={handleBiometricAuth}
            disabled={isBiometricPrompting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/25 to-indigo-600/25 hover:from-cyan-600/35 hover:to-indigo-600/35 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 text-xs font-semibold active:scale-98 transition-all shadow-sm"
          >
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <span>لمس حسگر اثر انگشت برای ورود سریع</span>
          </button>
        )}
      </div>

      {/* Footer info */}
      <div className="relative z-10 text-center text-[10px] text-slate-600 pb-1 flex items-center gap-2">
        <span>پلتفرم امن استودیو آناش</span>
        <span>•</span>
        <span>نگارش ۲.۴.۰</span>
      </div>
    </div>
  );
};
