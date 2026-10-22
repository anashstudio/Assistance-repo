import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  Users, 
  CheckSquare, 
  Square, 
  Mic, 
  MicOff, 
  Plus, 
  Trash2, 
  Bookmark, 
  Play, 
  Pause,
  MapPin
} from 'lucide-react';
import { MeetingItem } from '../../types';
import { localDB } from '../../services/db';
import { AudioRecorderController, vibratePhone } from '../../services/device';

const DEFAULT_MEETINGS: MeetingItem[] = [];

export const MeetingsModule: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingItem[]>(DEFAULT_MEETINGS);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newActionText, setNewActionText] = useState<string>('');

  // Recorder state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const recorderRef = React.useRef<AudioRecorderController | null>(null);
  const timerRef = React.useRef<number | null>(null);

  // New meeting form
  const [mTitle, setMTitle] = useState<string>('');
  const [mDate, setMDate] = useState<string>('1403/08/01');
  const [mTime, setMTime] = useState<string>('14:00');
  const [mAttendees, setMAttendees] = useState<string>('');
  const [mLocation, setMLocation] = useState<string>('');

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    const list = await localDB.getSetting<MeetingItem[]>('app_meetings_list', DEFAULT_MEETINGS);
    setMeetings(list);
    if (list.length > 0 && !selectedMeeting) {
      setSelectedMeeting(list[0]);
    }
  };

  const handleToggleAction = async (meetingId: string, actionId: string) => {
    vibratePhone(25);
    const updated = meetings.map((m) => {
      if (m.id === meetingId) {
        return {
          ...m,
          actionItems: m.actionItems.map((a) => (a.id === actionId ? { ...a, done: !a.done } : a)),
        };
      }
      return m;
    });
    setMeetings(updated);
    if (selectedMeeting?.id === meetingId) {
      setSelectedMeeting(updated.find((m) => m.id === meetingId) || null);
    }
    await localDB.setSetting('app_meetings_list', updated);
  };

  const handleAddAction = async () => {
    if (!selectedMeeting || !newActionText.trim()) return;

    vibratePhone(25);
    const updated = meetings.map((m) => {
      if (m.id === selectedMeeting.id) {
        return {
          ...m,
          actionItems: [
            ...m.actionItems,
            { id: 'act_' + Date.now(), text: newActionText.trim(), done: false },
          ],
        };
      }
      return m;
    });

    setMeetings(updated);
    setSelectedMeeting(updated.find((m) => m.id === selectedMeeting.id) || null);
    setNewActionText('');
    await localDB.setSetting('app_meetings_list', updated);
  };

  // Recording methods
  const handleStartRecording = async () => {
    const recorder = new AudioRecorderController();
    const ok = await recorder.start();
    if (!ok) return;

    vibratePhone(35);
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordSeconds(0);
    setBookmarks([]);

    timerRef.current = window.setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const handleAddBookmark = () => {
    vibratePhone(20);
    setBookmarks((prev) => [...prev, recordSeconds]);
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || !isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);

    vibratePhone(35);
    try {
      const res = await recorderRef.current.stop();
      setIsRecording(false);

      if (selectedMeeting) {
        const audioItem = {
          id: 'aud_' + Date.now(),
          title: `صوت جلسه - ${new Date().toLocaleTimeString('fa-IR')}`,
          dataUrl: res.dataUrl,
          duration: recordSeconds,
        };

        const updated = meetings.map((m) => {
          if (m.id === selectedMeeting.id) {
            return {
              ...m,
              audioRecordings: [...(m.audioRecordings || []), audioItem],
            };
          }
          return m;
        });

        setMeetings(updated);
        setSelectedMeeting(updated.find((m) => m.id === selectedMeeting.id) || null);
        await localDB.setSetting('app_meetings_list', updated);
      }
    } catch (err) {
      console.warn('Recorder stop error:', err);
    }
  };

  const handleCreateMeeting = async () => {
    if (!mTitle.trim()) return;

    vibratePhone(30);
    const newMeet: MeetingItem = {
      id: 'meet_' + Date.now(),
      title: mTitle.trim(),
      date: mDate,
      time: mTime,
      attendees: mAttendees.trim(),
      locationOrLink: mLocation.trim() || undefined,
      status: 'upcoming',
      actionItems: [],
    };

    const updated = [newMeet, ...meetings];
    setMeetings(updated);
    setSelectedMeeting(newMeet);
    await localDB.setSetting('app_meetings_list', updated);
    setShowAddModal(false);
    setMTitle('');
    setMAttendees('');
  };

  const handleDeleteMeeting = async (id: string) => {
    if (window.confirm('آیا این جلسه کاری حذف شود؟')) {
      const updated = meetings.filter((m) => m.id !== id);
      setMeetings(updated);
      setSelectedMeeting(updated[0] || null);
      await localDB.setSetting('app_meetings_list', updated);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Top Header & Meeting Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">دستیار جلسات کاری و یادداشت‌های صوتی</h3>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>جلسه کاری جدید</span>
        </button>
      </div>

      {/* Meetings Horizontal Scroll Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {meetings.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMeeting(m)}
            className={`p-3 rounded-2xl border text-right transition-all shrink-0 min-w-44 ${
              selectedMeeting?.id === m.id
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold truncate text-white">{m.title}</div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
              <span>{m.date}</span>
              <span>{m.time}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedMeeting ? (
        <div className="space-y-4">
          {/* Active Meeting Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">{selectedMeeting.title}</h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedMeeting.date}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedMeeting.time}
                  </span>
                  {selectedMeeting.locationOrLink && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedMeeting.locationOrLink}
                    </span>
                  )}
                </div>
                {selectedMeeting.attendees && (
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-500" />
                    حاضرین: {selectedMeeting.attendees}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Audio Recorder with Bookmark markers */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-cyan-400" />
                  ضبط صدای جلسه با نشانه‌گذاری لحظه‌ای
                </span>

                {isRecording && (
                  <span className="text-sm font-mono font-black text-rose-400 animate-pulse">
                    {formatSeconds(recordSeconds)}
                  </span>
                )}
              </div>

              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>شروع ضبط صدای جلسه</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddBookmark}
                    className="flex-1 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <span>علامت‌گذاری لحظه مهم ({formatSeconds(recordSeconds)})</span>
                  </button>

                  <button
                    onClick={handleStopRecording}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>توقف و ذخیره</span>
                  </button>
                </div>
              )}

              {/* Bookmarks captured */}
              {bookmarks.length > 0 && (
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                  <span>مارکرهای ثبت‌شده در این جلسه:</span>
                  {bookmarks.map((b, i) => (
                    <span key={i} className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      {formatSeconds(b)}
                    </span>
                  ))}
                </div>
              )}

              {/* Saved Audio Recordings in this Meeting */}
              {selectedMeeting.audioRecordings && selectedMeeting.audioRecordings.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">فایل‌های صوتی ضبط‌شده این جلسه:</span>
                  {selectedMeeting.audioRecordings.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-slate-200">{rec.title}</span>
                      </div>
                      <audio controls src={rec.dataUrl} className="h-8 max-w-xs" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Items / Tasks */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  مصوبات و اقدامات جلسه ({selectedMeeting.actionItems.filter((a) => a.done).length} از {selectedMeeting.actionItems.length} انجام شد)
                </h5>
              </div>

              {/* Actions Checklist */}
              <div className="space-y-2">
                {selectedMeeting.actionItems.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => handleToggleAction(selectedMeeting.id, act.id)}
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {act.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className={`text-xs ${act.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {act.text}
                      </span>
                    </div>

                    {act.assignee && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-medium shrink-0">
                        {act.assignee}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Action Row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="اقدام یا وظیفه جدید برای این جلسه..."
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
                <button
                  onClick={handleAddAction}
                  disabled={!newActionText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
                >
                  افزودن مصوبه
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500">
          جلسه‌ای وجود ندارد. روی دکمه «جلسه کاری جدید» کلیک کنید.
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3.5 shadow-2xl text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              تعریف جلسه کاری جدید
            </h4>
            <div>
              <label className="text-slate-400 block mb-1">موضوع جلسه *</label>
              <input
                type="text"
                placeholder="مثلاً: جلسه هماهنگی پروژه"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">تاریخ</label>
                <input
                  type="text"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">ساعت</label>
                <input
                  type="text"
                  value={mTime}
                  onChange={(e) => setMTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">حاضرین در جلسه</label>
              <input
                type="text"
                placeholder="نام افراد شرکت‌کننده..."
                value={mAttendees}
                onChange={(e) => setMAttendees(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCreateMeeting}
                disabled={!mTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                ثبت جلسه
              </button>
              <button
                onClick={() => setShowAddModal(false)}
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
