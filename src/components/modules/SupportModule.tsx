import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  Send, 
  Phone, 
  Mail, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  LifeBuoy,
  FileQuestion
} from 'lucide-react';
import { SupportTicket } from '../../types';
import { localDB } from '../../services/db';
import { getHostingConfig, submitTicketToHost } from '../../services/sync';
import { triggerPhoneCall, vibratePhone } from '../../services/device';

interface SupportModuleProps {
  onRefreshStats: () => void;
}

export const SupportModule: React.FC<SupportModuleProps> = ({ onRefreshStats }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<'فنی' | 'امنیت' | 'هاستینگ' | 'پیشنهاد'>('فنی');
  const [priority, setPriority] = useState<'عادی' | 'مهم' | 'فوری'>('عادی');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const list = await localDB.getTickets();
    setTickets(list);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setSuccessBanner(null);
    vibratePhone(40);

    const newTicket: SupportTicket = {
      id: 'tkt_' + Date.now(),
      title: title.trim(),
      category,
      priority,
      message: message.trim(),
      status: 'pending',
      createdAt: Date.now(),
    };

    // Save locally
    await localDB.saveTicket(newTicket);

    // Try to sync with remote host if configured
    try {
      const config = await getHostingConfig();
      if (config.apiUrl) {
        await submitTicketToHost(config.apiUrl, config.apiKey, newTicket);
      }
    } catch {
      // Ignored - will stay stored locally
    }

    setTitle('');
    setMessage('');
    setCategory('فنی');
    setPriority('عادی');
    setIsSubmitting(false);
    setSuccessBanner('پیام شما با موفقیت ثبت شد و به تیم فنی ارجاع گردید.');
    await loadTickets();
    onRefreshStats();

    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Contact Channels Card */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">راه‌های ارتباطی مستقیم با پشتیبانی</h3>
            <p className="text-[11px] text-slate-400">پاسخگویی سریع فنی و رفع ابهامات توسعه دستیار</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Phone call */}
          <button
            onClick={() => {
              vibratePhone(30);
              triggerPhoneCall('09120000000');
            }}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-2.5 text-right transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200">تماس تلفنی</div>
              <div className="text-[10px] text-slate-400">تماس فوری با پشتیبان</div>
            </div>
          </button>

          {/* Email */}
          <a
            href="mailto:support@anashstudio.com?subject=درخواست پشتیبانی دستیار هوشمند"
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-2.5 text-right transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200">ارسال ایمیل</div>
              <div className="text-[10px] text-slate-400">مکاتبه رسمی فنی</div>
            </div>
          </a>

          {/* Messenger / Telegram / WhatsApp */}
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-2.5 text-right transition-all active:scale-95 col-span-2 sm:col-span-1"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200">پیام‌رسان آنلاین</div>
              <div className="text-[10px] text-slate-400">پشتیبانی تلگرام</div>
            </div>
          </a>
        </div>
      </div>

      {/* Ticket Submission Form */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">ثبت تیکت اختصاصی پشتیبانی فنی</h3>
          </div>
          <span className="text-[11px] text-slate-400">ثبت در دیتابیس و هاست</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs text-slate-400 block mb-1">موضوع تیکت *</label>
            <input
              type="text"
              required
              placeholder="مثلاً: سوال در مورد اتصال دیتابیس هاست یا خطای ماژول"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">دسته‌بندی درخواست</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-cyan-400"
              >
                <option value="فنی">مشکل فنی نرم‌افزار</option>
                <option value="هاستینگ">اتصال و پایگاه داده هاست</option>
                <option value="امنیت">احراز هویت بیومتریک و پین</option>
                <option value="پیشنهاد">درخواست ماژول یا قابلیت جدید</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">میزان اولویت</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-cyan-400"
              >
                <option value="عادی">عادی</option>
                <option value="مهم">مهم</option>
                <option value="فوری">فوری (بحرانی)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">شرح کامل پیام یا مشکل *</label>
            <textarea
              rows={4}
              required
              placeholder="توضیحات دقیق را بنویسید..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-cyan-400 resize-none"
            />
          </div>

          {successBanner && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !message.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>ارسال و ثبت تیکت پشتیبانی</span>
          </button>
        </form>
      </div>

      {/* History of Submitted Tickets */}
      {tickets.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 px-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            تیکت‌های ثبت‌شده شما ({tickets.length})
          </h4>

          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-100">{t.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {t.category} • {t.priority}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{t.message}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>
                    ثبت در: {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    ذخیره در دیتابیس
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
