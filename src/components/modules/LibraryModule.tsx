import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Users, 
  Repeat, 
  Bookmark, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Tag, 
  BookMarked, 
  Layers, 
  RefreshCw, 
  Check, 
  ChevronRight,
  Library,
  MapPin,
  Barcode,
  Building,
  UserCheck
} from 'lucide-react';
import { Book, LibraryMember, BookLoan, ReadingProgress } from '../../types';
import { 
  getBooks, 
  getMembers, 
  getLoans, 
  createLoan, 
  returnLoan, 
  extendLoan, 
  getReadingProgress, 
  updateBookProgress, 
  addBookQuote, 
  syncLibraryToHost, 
  BOOK_CATEGORIES 
} from '../../services/libraryService';
import { vibratePhone, triggerPhoneCall, triggerSendSms } from '../../services/device';

type LibrarySubTab = 'books' | 'loans' | 'members' | 'reading';

export const LibraryModule: React.FC = () => {
  const [subTab, setSubTab] = useState<LibrarySubTab>('books');

  // Data states
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [selectedStatus, setSelectedStatus] = useState<string>('همه');

  // Modals for Operation
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState<boolean>(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<Book | null>(null);
  const [preselectedBookId, setPreselectedBookId] = useState<string>('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Loan Issue Form state
  const [loanForm, setLoanForm] = useState({
    bookId: '',
    memberId: '',
    durationDays: 14,
    notes: '',
  });

  // Reading progress modal state
  const [progressPage, setProgressPage] = useState<number>(1);
  const [newQuoteText, setNewQuoteText] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [b, m, l, r] = await Promise.all([
      getBooks(),
      getMembers(),
      getLoans(),
      getReadingProgress(),
    ]);
    setBooks(b);
    setMembers(m);
    setLoans(l);
    setReadingProgress(r);
  };

  const handleOpenLoanForBook = (bookId: string) => {
    vibratePhone(20);
    setPreselectedBookId(bookId);
    setLoanForm((prev) => ({ ...prev, bookId }));
    setIsCreateLoanOpen(true);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.bookId || !loanForm.memberId) return;
    vibratePhone(30);
    try {
      await createLoan({
        bookId: loanForm.bookId,
        memberId: loanForm.memberId,
        durationDays: Number(loanForm.durationDays) || 14,
        notes: loanForm.notes || undefined,
      });
      setLoanForm({ bookId: '', memberId: '', durationDays: 14, notes: '' });
      setIsCreateLoanOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت امانت');
    }
  };

  const handleReturnBook = async (loanId: string) => {
    vibratePhone(40);
    await returnLoan(loanId);
    await loadData();
  };

  const handleExtendLoan = async (loanId: string) => {
    vibratePhone(25);
    await extendLoan(loanId, 7);
    await loadData();
  };

  const handleRemindOverdueSms = (loan: BookLoan) => {
    const text = `سلام ${loan.memberName} گرامی، یادآوری موعد بازگشت کتاب «${loan.bookTitle}» به کتابخانه. مهلت تحویل: ${loan.dueDate}. لطفاً جهت تمدید یا تحویل مراجعه فرمایید.`;
    triggerSendSms(loan.memberPhone, text);
  };

  const handleOpenProgress = (book: Book) => {
    setSelectedBookForProgress(book);
    const existing = readingProgress.find((p) => p.bookId === book.id);
    setProgressPage(existing?.currentPage || 1);
    setIsProgressModalOpen(true);
  };

  const handleSaveProgress = async () => {
    if (!selectedBookForProgress) return;
    vibratePhone(25);
    await updateBookProgress(
      selectedBookForProgress.id,
      selectedBookForProgress.title,
      progressPage,
      selectedBookForProgress.pageCount || 200
    );
    if (newQuoteText.trim()) {
      await addBookQuote(selectedBookForProgress.id, newQuoteText.trim(), progressPage);
      setNewQuoteText('');
    }
    setIsProgressModalOpen(false);
    await loadData();
  };

  const handleSyncWithHost = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    vibratePhone(25);
    const res = await syncLibraryToHost();
    setSyncFeedback(res.message);
    setIsSyncing(false);
    await loadData();
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  // Filtered Books
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.translator && b.translator.toLowerCase().includes(q)) ||
      (b.publisher && b.publisher.toLowerCase().includes(q)) ||
      (b.congressCode && b.congressCode.toLowerCase().includes(q)) ||
      (b.shelfLocation && b.shelfLocation.toLowerCase().includes(q)) ||
      (b.category && b.category.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'همه' || b.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'همه' ||
      (selectedStatus === 'available' && b.availableCopies > 0) ||
      (selectedStatus === 'borrowed' && b.availableCopies === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Active Loans & Overdues
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const overdueLoans = loans.filter((l) => l.status === 'overdue');
  const availableBooksCount = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
  const totalBooksCount = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 select-none">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0c1324] to-[#080d19] border border-cyan-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-600/30 flex items-center justify-center shrink-0">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">مدیریت کتابخانه و گردش کتاب</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  کاربری
                </span>
              </div>
              <p className="text-xs text-slate-400">جستجوی کتب، کد کنگره، قفسه، صدور امانت و پیگیری استرداد</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWithHost}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="همگام‌سازی و دریافت کتب و اعضای بارگذاری‌شده از پنل هاست"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>دریافت و همگام‌سازی با هاست</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* 4 Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">عناوین کتاب</span>
            <span className="text-lg font-black text-white font-mono">{books.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">موجودی در قفسه</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {availableBooksCount} <span className="text-xs text-slate-500 font-sans">از {totalBooksCount}</span>
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">امانات فعال</span>
            <span className="text-lg font-black text-cyan-400 font-mono">{activeLoans.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">دیرکرد استرداد</span>
            <span className={`text-lg font-black font-mono ${overdueLoans.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {overdueLoans.length}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          onClick={() => { vibratePhone(15); setSubTab('books'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'books'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>کاتالوگ و قفسه‌ها ({books.length})</span>
        </button>

        <button
          onClick={() => { vibratePhone(15); setSubTab('loans'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'loans'
              ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>میز گردش و امانات ({activeLoans.length})</span>
        </button>

        <button
          onClick={() => { vibratePhone(15); setSubTab('members'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'members'
              ? 'bg-teal-500/20 text-teal-300 shadow-sm border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>اعضای کتابخانه ({members.length})</span>
        </button>

        <button
          onClick={() => { vibratePhone(15); setSubTab('reading'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'reading'
              ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>قفسه مطالعه من ({readingProgress.length})</span>
        </button>
      </div>

      {/* TAB 1: BOOKS CATALOG */}
      {subTab === 'books' && (
        <div className="space-y-3">
          {/* Search & Filters */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="جستجو در نام کتاب، نویسنده، مترجم، ناشر، کد کنگره یا کد قفسه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-1">
                <Filter className="w-3 h-3" />
                دسته:
              </span>
              <button
                onClick={() => setSelectedCategory('همه')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
                  selectedCategory === 'همه'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                همه
              </button>
              {BOOK_CATEGORIES.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredBooks.length === 0 ? (
              <div className="col-span-full p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">کتابی یافت نشد.</p>
                <p className="text-[11px] text-slate-500">
                  برای افزودن کتاب‌ها یا ورود اکسل، به پنل مدیریت تحت‌وب سرور مراجعه کنید و سپس دکمه «دریافت و همگام‌سازی» را بزنید.
                </p>
              </div>
            ) : (
              filteredBooks.map((book) => {
                const isAvailable = (book.availableCopies || 0) > 0;
                return (
                  <div
                    key={book.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-bold text-white line-clamp-1">{book.title}</h3>
                        <p className="text-xs text-slate-300 font-medium">
                          نویسنده: <span className="text-cyan-300">{book.author}</span>
                        </p>
                        {book.translator && (
                          <p className="text-[11px] text-slate-400">
                            مترجم: <span className="text-slate-300">{book.translator}</span>
                          </p>
                        )}
                        {book.publisher && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            ناشر: <span className="text-slate-300">{book.publisher}</span>
                            {book.publishYear && (
                              <span className="text-slate-500 font-mono">({book.publishYear})</span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {isAvailable ? `${book.availableCopies} از ${book.totalCopies} موجود` : 'ناموجود (امانت)'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Badges: Congress Code & Shelf Location */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                      {book.congressCode && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                          <Barcode className="w-3 h-3 text-indigo-400" />
                          <span>کد کنگره: {book.congressCode}</span>
                        </div>
                      )}

                      {book.shelfLocation && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>قفسه: {book.shelfLocation}</span>
                        </div>
                      )}

                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                        {book.category}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleOpenProgress(book)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-all"
                      >
                        <Bookmark className="w-3 h-3 text-amber-400" />
                        <span>قفسه مطالعه</span>
                      </button>

                      <button
                        onClick={() => handleOpenLoanForBook(book.id)}
                        disabled={!isAvailable}
                        className="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Repeat className="w-3 h-3" />
                        <span>ثبت امانت</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOANS & CIRCULATION DESK */}
      {subTab === 'loans' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white">امانات و گردش کتاب‌ها</h3>
              <p className="text-[10px] text-slate-400">پیگیری تاریخ سررسید، تمدید و استرداد</p>
            </div>
            <button
              onClick={() => {
                vibratePhone(20);
                setPreselectedBookId('');
                setLoanForm({ bookId: '', memberId: '', durationDays: 14, notes: '' });
                setIsCreateLoanOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-cyan-600/20"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>صدور امانت جدید</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {activeLoans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
                <p className="text-xs text-white font-bold">هیچ کتابی در حال حاضر امانت داده نشده است.</p>
                <p className="text-[11px] text-slate-400">تمامی کتب در قفسه‌ها موجود هستند.</p>
              </div>
            ) : (
              activeLoans.map((loan) => {
                const isOverdue = loan.status === 'overdue';
                return (
                  <div
                    key={loan.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/20'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{loan.bookTitle}</h4>
                          {isOverdue ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              دیرکرد در بازگشت
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold">
                              در دست مطالعه
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>امانت‌گیرنده: <strong className="text-slate-200">{loan.memberName}</strong></span>
                          <span className="font-mono text-cyan-400 dir-ltr">{loan.memberPhone}</span>
                          <span>مهلت تحویل: <strong className="font-mono text-amber-300">{loan.dueDate}</strong></span>
                          {(loan.renewCount ?? loan.extendedCount ?? 0) > 0 && (
                            <span className="text-[10px] text-slate-500">({loan.renewCount ?? loan.extendedCount} بار تمدید شده)</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons: Call, SMS, Extend, Return */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {loan.memberPhone && (
                          <>
                            <button
                              onClick={() => triggerPhoneCall(loan.memberPhone)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 transition-all"
                              title="تماس با امانت‌گیرنده"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemindOverdueSms(loan)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-indigo-400 transition-all"
                              title="ارسال پیامک یادآوری"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleExtendLoan(loan.id)}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                          title="تمدید مهلت به مدت ۷ روز"
                        >
                          تمدید (+۷ روز)
                        </button>

                        <button
                          onClick={() => handleReturnBook(loan.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                        >
                          ثبت بازگشت
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERS VIEW */}
      {subTab === 'members' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">فهرست اعضای کتابخانه</h3>
              <p className="text-[10px] text-slate-400">
                تعریف عضو جدید و ویرایش کاربران از طریق پنل مدیریت تحت‌وب هاست انجام می‌گیرد
              </p>
            </div>
            <button
              onClick={handleSyncWithHost}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>به‌روزرسانی از هاست</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.length === 0 ? (
              <div className="col-span-full p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <Users className="w-9 h-9 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">هیچ عضوی در سامانه ثبت نشده است.</p>
                <p className="text-[11px] text-slate-500">
                  جهت ثبت اعضا یا ورود دسته‌جمعی از فایل اکسل، وارد پنل هاست شده و اکسل اعضا را بارگذاری کنید.
                </p>
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{member.fullName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                        {member.membershipNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="dir-ltr font-mono text-cyan-300">{member.phoneNumber}</span>
                      {member.currentBorrowsCount > 0 && (
                        <span className="text-amber-400">({member.currentBorrowsCount} کتاب در دست امانت)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {member.phoneNumber && (
                      <>
                        <button
                          onClick={() => triggerPhoneCall(member.phoneNumber)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 transition-all"
                          title="تماس"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => triggerSendSms(member.phoneNumber, `سلام ${member.fullName} گرامی، پیام از طرف کتابخانه.`)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-indigo-400 transition-all"
                          title="ارسال پیامک"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: READING SHELF & QUOTES */}
      {subTab === 'reading' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h3 className="text-xs font-bold text-white">قفسه مطالعه من و جملات برگزیده</h3>
            <p className="text-[10px] text-slate-400">ثبت پیشرفت مطالعه کتاب‌ها و یادداشت بریده‌های ماندگار</p>
          </div>

          <div className="space-y-3">
            {readingProgress.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <Bookmark className="w-9 h-9 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">هنوز کتابی به قفسه مطالعه شخصی افزوده نشده است.</p>
                <p className="text-[11px] text-slate-500">
                  در تب کاتالوگ کتاب‌ها، روی دکمه «قفسه مطالعه» هر کتاب بزنید تا پیشرفت آن را ثبت کنید.
                </p>
              </div>
            ) : (
              readingProgress.map((item) => (
                <div key={item.bookId} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.bookTitle}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        صفحه {item.currentPage} از {item.totalPages} ({item.percent}٪)
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const targetBook = books.find((b) => b.id === item.bookId) || {
                          id: item.bookId,
                          title: item.bookTitle,
                          author: '',
                          category: '',
                          totalCopies: 1,
                          availableCopies: 1,
                          status: 'available',
                          addedDate: '',
                          pageCount: item.totalPages,
                        };
                        handleOpenProgress(targetBook);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold"
                    >
                      به‌روزرسانی صفحه
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>

                  {/* Quotes */}
                  {item.quotes && item.quotes.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400">جملات و بریده‌های منتخب:</span>
                      {item.quotes.map((q) => (
                        <div key={q.id} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60 text-xs text-slate-300 italic">
                          «{q.text}»
                          {q.page && <span className="text-[10px] text-slate-500 mr-2 font-mono">(ص {q.page})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE LOAN (OPERATIONAL DESK) */}
      {isCreateLoanOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-cyan-400" />
                <span>ثبت امانت جدید کتاب</span>
              </h3>
              <button
                onClick={() => setIsCreateLoanOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">انتخاب کتاب *</label>
                <select
                  value={loanForm.bookId}
                  onChange={(e) => setLoanForm({ ...loanForm, bookId: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- یک کتاب انتخاب کنید --</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                      {b.title} (نویسنده: {b.author}) - {b.availableCopies > 0 ? `موجود (${b.availableCopies})` : 'ناموجود'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">انتخاب عضو کتابخانه *</label>
                <select
                  value={loanForm.memberId}
                  onChange={(e) => setLoanForm({ ...loanForm, memberId: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- یک عضو انتخاب کنید --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.membershipNumber}) - {m.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">مدت امانت (روز)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={loanForm.durationDays}
                  onChange={(e) => setLoanForm({ ...loanForm, durationDays: parseInt(e.target.value, 10) || 14 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">توضیحات یا یادداشت</label>
                <input
                  type="text"
                  placeholder="اختیاری..."
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateLoanOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all"
                >
                  ثبت قطعی امانت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE READING PROGRESS & QUOTE */}
      {isProgressModalOpen && selectedBookForProgress && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>ثبت پیشرفت مطالعه: {selectedBookForProgress.title}</span>
              </h3>
              <button
                onClick={() => setIsProgressModalOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  تا صفحه چند را مطالعه کردید؟ (کل صفحات: {selectedBookForProgress.pageCount || 200})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBookForProgress.pageCount || 5000}
                  value={progressPage}
                  onChange={(e) => setProgressPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">ثبت یک بریده‌کتاب یا جمله زیبا (اختیاری)</label>
                <textarea
                  rows={3}
                  placeholder="جمله‌ای ماندگار از این کتاب که توجه شما را جلب کرد..."
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all"
                >
                  ذخیره در قفسه مطالعه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
