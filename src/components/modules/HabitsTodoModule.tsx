import React, { useState, useEffect } from 'react';
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Flame, 
  CheckSquare, 
  Square,
  Sparkles,
  Timer
} from 'lucide-react';
import { HabitItem, TodoItem } from '../../types';
import { localDB } from '../../services/db';
import { vibratePhone } from '../../services/device';

const DEFAULT_HABITS: HabitItem[] = [];

const DEFAULT_TODOS: TodoItem[] = [];

export const HabitsTodoModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'habits' | 'pomodoro' | 'todos'>('habits');
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [todos, setTodos] = useState<TodoItem[]>(DEFAULT_TODOS);
  const [newHabitTitle, setNewHabitTitle] = useState<string>('');
  const [newTodoText, setNewTodoText] = useState<string>('');
  const [newTodoPriority, setNewTodoPriority] = useState<'عادی' | 'مهم' | 'فوری'>('عادی');

  // Pomodoro state (25 min work, 5 min break)
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    loadHabitsData();
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      vibratePhone([100, 100, 100]);
      setIsRunning(false);
      if (pomoMode === 'work') {
        alert('زمان تمرکز به پایان رسید! ۵ دقیقه استراحت کنید.');
        setPomoMode('break');
        setTimeLeft(5 * 60);
      } else {
        alert('استراحت پایان یافت، آماده بازه کاری بعدی هستید؟');
        setPomoMode('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, pomoMode]);

  const loadHabitsData = async () => {
    const savedHabits = await localDB.getSetting<HabitItem[]>('app_habits_list', DEFAULT_HABITS);
    const savedTodos = await localDB.getSetting<TodoItem[]>('app_todos_list', DEFAULT_TODOS);
    setHabits(savedHabits);
    setTodos(savedTodos);
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  const handleToggleHabit = async (id: string) => {
    vibratePhone(35);
    const updated = habits.map((h) => {
      if (h.id === id) {
        const isDone = !!h.history[todayKey];
        const nextHist = { ...h.history, [todayKey]: !isDone };
        const nextStreak = !isDone ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1);
        return { ...h, history: nextHist, currentStreak: nextStreak };
      }
      return h;
    });

    setHabits(updated);
    await localDB.setSetting('app_habits_list', updated);
  };

  const handleAddHabit = async () => {
    if (!newHabitTitle.trim()) return;

    vibratePhone(25);
    const newHab: HabitItem = {
      id: 'hab_' + Date.now(),
      title: newHabitTitle.trim(),
      frequency: 'daily',
      currentStreak: 1,
      history: { [todayKey]: true },
      color: '#06b6d4',
    };

    const updated = [...habits, newHab];
    setHabits(updated);
    await localDB.setSetting('app_habits_list', updated);
    setNewHabitTitle('');
  };

  const handleDeleteHabit = async (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    setHabits(updated);
    await localDB.setSetting('app_habits_list', updated);
  };

  const handleToggleTodo = async (id: string) => {
    vibratePhone(25);
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTodos(updated);
    await localDB.setSetting('app_todos_list', updated);
  };

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return;

    vibratePhone(25);
    const newTd: TodoItem = {
      id: 'td_' + Date.now(),
      text: newTodoText.trim(),
      completed: false,
      priority: newTodoPriority,
    };

    const updated = [newTd, ...todos];
    setTodos(updated);
    await localDB.setSetting('app_todos_list', updated);
    setNewTodoText('');
  };

  const handleDeleteTodo = async (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    await localDB.setSetting('app_todos_list', updated);
  };

  // Pomodoro timer helpers
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleResetPomodoro = () => {
    setIsRunning(false);
    setTimeLeft(pomoMode === 'work' ? 25 * 60 : 5 * 60);
    vibratePhone(20);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Sub tabs */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('habits')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'habits'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>عادت‌های روزانه ({habits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pomodoro')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pomodoro'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Timer className="w-4 h-4 text-rose-400" />
          <span>تایمر تمرکز (Pomodoro)</span>
        </button>

        <button
          onClick={() => setActiveTab('todos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'todos'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <span>کارهای ضروری ({todos.filter((t) => !t.completed).length})</span>
        </button>
      </div>

      {activeTab === 'habits' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                زنجیره عادت‌های روزمره (Don't Break the Chain)
              </h4>
              <span className="text-[10px] text-slate-400">ثبت تعهد روزانه</span>
            </div>

            <div className="space-y-2.5">
              {habits.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  هنوز عادتی ثبت نشده است. اولین عادت فردی یا ورزشی خود را از کادر زیر اضافه کنید.
                </div>
              ) : (
                habits.map((h) => {
                const isDoneToday = !!h.history[todayKey];
                return (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleHabit(h.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDoneToday
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-700/60 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {isDoneToday ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>

                      <div className="min-w-0">
                        <span className={`text-xs font-bold ${isDoneToday ? 'text-emerald-300' : 'text-white'}`}>
                          {h.title}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>زنجیره: {h.currentStreak} روز متوالی</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteHabit(h.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }))}
            </div>

            {/* Add Habit input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="عادت جدید (مثلاً روزانه ۲۰ صفحه کتاب)..."
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
              <button
                onClick={handleAddHabit}
                disabled={!newHabitTitle.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
              >
                ثبت عادت
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pomodoro' && (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setPomoMode('work');
                setTimeLeft(25 * 60);
                setIsRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pomoMode === 'work'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              کار و تمرکز عمیق (۲۵ دقیقه)
            </button>
            <button
              onClick={() => {
                setPomoMode('break');
                setTimeLeft(5 * 60);
                setIsRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pomoMode === 'break'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              استراحت کوتاه (۵ دقیقه)
            </button>
          </div>

          {/* Big Timer display */}
          <div className="text-6xl font-black font-mono tracking-wider text-white select-none">
            {formatTimer(timeLeft)}
          </div>

          <p className="text-xs text-slate-400">
            {pomoMode === 'work'
              ? 'تلفن را بی‌صدا کنید و ۲۵ دقیقه روی یک وظیفه مشخص تمرکز کنید.'
              : 'چشم‌هایتان را ببندید و یک لیوان آب بنوشید.'}
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                vibratePhone(30);
                setIsRunning(!isRunning);
              }}
              className={`px-8 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-600/30'
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isRunning ? 'توقف موقت' : 'شروع تمرکز'}</span>
            </button>

            <button
              onClick={handleResetPomodoro}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
              title="بازنشانی تایمر"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'todos' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                لیست کارهای ضروری (To-Do List)
              </h4>
              <span className="text-[10px] text-slate-400">اولویت‌بندی کارهای امروز</span>
            </div>

            <div className="space-y-2">
              {todos.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  هیچ کار یا وظیفه‌ای در لیست وجود ندارد. از کادر زیر کار جدیدی ثبت کنید.
                </div>
              ) : (
                todos.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTodo(t.id)}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {t.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={`text-xs ${t.completed ? 'line-through text-slate-500' : 'text-slate-100 font-medium'}`}>
                      {t.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                      t.priority === 'فوری'
                        ? 'bg-rose-500/20 text-rose-300'
                        : t.priority === 'مهم'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {t.priority}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTodo(t.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )))}
            </div>

            {/* Add Todo Row */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="وظیفه یا کار جدید..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as any)}
                className="px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="عادی">عادی</option>
                <option value="مهم">مهم</option>
                <option value="فوری">فوری</option>
              </select>
              <button
                onClick={handleAddTodo}
                disabled={!newTodoText.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
              >
                ثبت کار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
