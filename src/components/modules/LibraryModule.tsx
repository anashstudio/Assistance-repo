import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
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
  Trash2, 
  Edit3, 
  X, 
  BookMarked, 
  Layers, 
  RefreshCw, 
  Check, 
  ChevronRight,
  Sparkles,
  Library,
  Upload
} from 'lucide-react';
import { Book, LibraryMember, BookLoan, ReadingProgress, BookStatus } from '../../types';
import { 
  getBooks, 
  saveBooks, 
  addBook, 
  updateBook, 
  deleteBook, 
  getMembers, 
  addMember, 
  deleteMember, 
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

  // Modals
  const [isAddBookOpen, setIsAddBookOpen] = useState<boolean>(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState<boolean>(false);
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState<boolean>(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<Book | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Add Book Form state
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    translator: '',
    publisher: '',
    isbn: '',
    category: 'رمان و ادبیات',
    shelfLocation: '',
    publishYear: '',
    totalCopies: 1,
    pageCount: 200,
    description: '',
    coverUrl: '',
  });

  // Add Member Form state
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    membershipNumber: '',
    nationalId: '',
    phoneNumber: '',
    email: '',
    expiryDate: '',
    notes: '',
  });

  // Create Loan Form state
  const [loanForm, setLoanForm] = useState({
    bookId: '',
    memberId: '',
    durationDays: 14,
    notes: '',
  });

  // Progress Form state
  const [progressPage, setProgressPage] = useState<number>(0);
  const [newQuoteText, setNewQuoteText] = useState<string>('');

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

  useEffect(() => {
    loadData();
  }, []);

  // --- Calculations ---
  const totalBooksCount = books.length;
  const totalCopiesCount = books.reduce((sum, b) => sum + (b.totalCopies || 1), 0);
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const overdueLoans = loans.filter((l) => l.status === 'overdue');
  const activeMembersCount = members.filter((m) => m.status === 'active').length;

  // Filtered books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.isbn && b.isbn.includes(searchQuery)) ||
      (b.shelfLocation && b.shelfLocation.includes(searchQuery));
    const matchesCategory = selectedCategory === 'همه' || b.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'همه' ||
      (selectedStatus === 'available' && b.availableCopies > 0) ||
      (selectedStatus === 'borrowed' && b.availableCopies <= 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filtered loans
  const filteredLoans = loans.filter((l) => {
    if (selectedStatus === 'overdue') return l.status === 'overdue';
    if (selectedStatus === 'active') return l.status === 'active';
    if (selectedStatus === 'returned') return l.status === 'returned';
    return true;
  });

  // Handlers
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author) return;
    vibratePhone(25);
    await addBook({
      title: bookForm.title,
      author: bookForm.author,
      translator: bookForm.translator || undefined,
      publisher: bookForm.publisher || undefined,
      isbn: bookForm.isbn || undefined,
      category: bookForm.category,
      shelfLocation: bookForm.shelfLocation || 'قفسه عمومی',
      publishYear: bookForm.publishYear || undefined,
      totalCopies: Number(bookForm.totalCopies) || 1,
      availableCopies: Number(bookForm.totalCopies) || 1,
      status: 'available',
      coverUrl: bookForm.coverUrl || undefined,
      description: bookForm.description || undefined,
      pageCount: Number(bookForm.pageCount) || undefined,
    });
    setBookForm({
      title: '',
      author: '',
      translator: '',
      publisher: '',
      isbn: '',
      category: 'رمان و ادبیات',
      shelfLocation: '',
      publishYear: '',
      totalCopies: 1,
      pageCount: 200,
      description: '',
      coverUrl: '',
    });
    setIsAddBookOpen(false);
    await loadData();
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.fullName || !memberForm.phoneNumber) return;
    vibratePhone(25);
    const mNum = memberForm.membershipNumber || `LIB-${Math.floor(1000 + Math.random() * 9000)}`;
    const expDate = memberForm.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    await addMember({
      fullName: memberForm.fullName,
      membershipNumber: mNum,
      nationalId: memberForm.nationalId || undefined,
      phoneNumber: memberForm.phoneNumber,
      email: memberForm.email || undefined,
      expiryDate: expDate,
      status: 'active',
      notes: memberForm.notes || undefined,
    });
    setMemberForm({
      fullName: '',
      membershipNumber: '',
      nationalId: '',
      phoneNumber: '',
      email: '',
      expiryDate: '',
      notes: '',
    });
    setIsAddMemberOpen(false);
    await loadData();
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

  const handleDeleteBook = async (id: string) => {
    if (confirm('آیا از حذف این کتاب از کتابخانه اطمینان دارید؟')) {
      vibratePhone(30);
      await deleteBook(id);
      await loadData();
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('آیا از حذف این عضو اطمینان دارید؟')) {
      vibratePhone(30);
      await deleteMember(id);
      await loadData();
    }
  };

  const handleRemindOverdueSms = (loan: BookLoan) => {
    const text = `سلام ${loan.memberName} گرامی، یادآوری بازگشت کتاب «${loan.bookTitle}» به کتابخانه. مهلت تحویل: ${loan.dueDate}. با تشکر.`;
    triggerSendSms(loan.memberPhone, text);
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
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 select-none">
      {/* Header & Overview Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-[#0c1324] to-[#080d19] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-600/30 flex items-center justify-center shrink-0">
              <Library className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">مدیریت کتابخانه و گردش کتاب</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  جامع
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                فهرست کتب، قفسه‌بندی، کارت اعضا، امانت و هشدار دیرکرد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWithHost}
              disabled={isSyncing}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="همگام‌سازی کتاب‌ها و امانت‌ها با هاست شخصی"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>همگام‌سازی با هاست</span>
            </button>
          </div>
        </div>

        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* 4 Stats Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block">عناوین کتاب</span>
            <span className="text-xl font-black text-cyan-400 font-mono mt-0.5 block">
              {totalBooksCount}
            </span>
            <span className="text-[10px] text-slate-500">{totalCopiesCount} جلد فیزیکی</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block">امانت‌های فعال</span>
            <span className="text-xl font-black text-indigo-400 font-mono mt-0.5 block">
              {activeLoans.length}
            </span>
            <span className="text-[10px] text-slate-500">در دست امانت‌گیرندگان</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block">دیرکرد داشته‌ها</span>
            <span className={`text-xl font-black font-mono mt-0.5 block ${overdueLoans.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {overdueLoans.length}
            </span>
            <span className="text-[10px] text-slate-500">نیازمند پیگیری</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block">اعضای فعال</span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
              {activeMembersCount}
            </span>
            <span className="text-[10px] text-slate-500">دارای کارت عضویت</span>
          </div>
        </div>
      </div>

      {/* Overdue Warning Alert Bar (If any overdue exists) */}
      {overdueLoans.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              توجه: <strong>{overdueLoans.length} کتاب</strong> از موعد مقرر گذشته و هنوز تحویل داده نشده‌اند!
            </span>
          </div>
          <button
            onClick={() => {
              setSubTab('loans');
              setSelectedStatus('overdue');
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shrink-0 text-center"
          >
            مشاهده و ارسال پیامک یادآور
          </button>
        </div>
      )}

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-x-auto">
        {[
          { id: 'books', label: 'کتاب‌ها و قفسه‌ها', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'loans', label: 'امانت و گردش', icon: <Repeat className="w-4 h-4" />, badge: activeLoans.length || undefined },
          { id: 'members', label: 'اعضای کتابخانه', icon: <Users className="w-4 h-4" /> },
          { id: 'reading', label: 'قفسه مطالعه شخصی', icon: <Bookmark className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              vibratePhone(15);
              setSubTab(tab.id as LibrarySubTab);
              setSelectedStatus('همه');
            }}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              subTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* -------------------- TAB 1: BOOKS -------------------- */}
      {subTab === 'books' && (
        <div className="space-y-4">
          {/* Action & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو بر اساس عنوان، نویسنده، شابک یا شماره قفسه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-2.5 px-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="همه">همه دسته‌ها</option>
                {BOOK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  vibratePhone(20);
                  setIsAddBookOpen(true);
                }}
                className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20 shrink-0 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن کتاب جدید</span>
              </button>
            </div>
          </div>

          {/* Books List Grid */}
          {filteredBooks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">کتابی یافت نشد</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {books.length === 0
                  ? 'هنوز کتابی در سیستم ثبت نشده است. با کلیک بر روی دکمه «افزودن کتاب جدید» اولین اثر را وارد کنید.'
                  : 'با فیلترهای جستجوی فعلی، موردی یافت نشد.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBooks.map((book) => {
                const isAvailable = book.availableCopies > 0;
                return (
                  <div
                    key={book.id}
                    className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-md group"
                  >
                    <div className="flex gap-3">
                      {/* Book Cover / Icon */}
                      <div className="w-16 h-22 rounded-2xl overflow-hidden bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 border border-slate-700/80 p-0.5 shrink-0 flex items-center justify-center shadow-md">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover rounded-[14px]"
                          />
                        ) : (
                          <div className="text-center p-1">
                            <BookOpen className="w-6 h-6 text-cyan-400 mx-auto" />
                            <span className="text-[8px] text-slate-400 line-clamp-1 mt-1 block">
                              {book.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-black text-white line-clamp-1">
                            {book.title}
                          </h4>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              isAvailable
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isAvailable ? `${book.availableCopies} موجود` : 'ناموجود'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 truncate">
                          نویسنده: <span className="text-slate-200">{book.author}</span>
                        </p>

                        {book.translator && (
                          <p className="text-[10px] text-slate-500 truncate">
                            مترجم: {book.translator}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/90 pt-0.5">
                          <Tag className="w-3 h-3" />
                          <span>{book.shelfLocation || 'قفسه عمومی'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedBookForProgress(book);
                            const current = readingProgress.find((p) => p.bookId === book.id);
                            setProgressPage(current ? current.currentPage : 0);
                            setIsProgressModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                          title="ثبت پیشرفت مطالعه و یادداشت"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                          title="حذف کتاب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setLoanForm({ ...loanForm, bookId: book.id });
                          setIsCreateLoanOpen(true);
                        }}
                        disabled={!isAvailable}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-30 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all"
                      >
                        ثبت امانت
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 2: LOANS -------------------- */}
      {subTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'همه', label: 'همه امانت‌ها' },
                { id: 'active', label: 'جاری (در دست امانت)' },
                { id: 'overdue', label: 'دارای تأخیر و دیرکرد' },
                { id: 'returned', label: 'تحویل داده‌شده' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedStatus(f.id)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedStatus === f.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsCreateLoanOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت برگه امانت جدید</span>
            </button>
          </div>

          {filteredLoans.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2">
              <Repeat className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-xs font-bold text-slate-300">امانتی در این بخش ثبت نشده است</h3>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLoans.map((loan) => {
                const isOverdue = loan.status === 'overdue';
                const isReturned = loan.status === 'returned';

                return (
                  <div
                    key={loan.id}
                    className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : isReturned
                        ? 'bg-slate-950/60 border-slate-800 opacity-70'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{loan.bookTitle}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isReturned
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {isOverdue ? 'دارای دیرکرد' : isReturned ? 'تحویل داده شد' : 'در دست امانت'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>
                          امانت‌گیرنده: <strong className="text-slate-200">{loan.memberName}</strong>
                        </span>
                        <span>•</span>
                        <span>تاریخ امانت: {loan.loanDate}</span>
                        <span>•</span>
                        <span className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                          موعد تحویل: {loan.dueDate}
                        </span>
                        {loan.extendedCount > 0 && (
                          <span className="text-cyan-400 font-mono text-[10px]">
                            ({loan.extendedCount} بار تمدید شده)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Direct phone call & SMS */}
                      {loan.memberPhone && (
                        <>
                          <button
                            onClick={() => triggerPhoneCall(loan.memberPhone)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                            title="تماس مستقیم با امانت‌گیرنده"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemindOverdueSms(loan)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                            title="ارسال پیامک یادآوری تحویل"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {!isReturned && (
                        <>
                          <button
                            onClick={() => handleExtendLoan(loan.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold transition-all"
                            title="تمدید مهلت به مدت ۷ روز دیگر"
                          >
                            تمدید (+۷ روز)
                          </button>
                          <button
                            onClick={() => handleReturnBook(loan.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ثبت بازگشت</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 3: MEMBERS -------------------- */}
      {subTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-300">لیست اعضای کتابخانه ({members.length} نفر)</h3>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت عضو جدید</span>
            </button>
          </div>

          {members.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-xs font-bold text-slate-300">عضوی ثبت نشده است</h3>
              <p className="text-xs text-slate-500">مشخصات امانت‌گیرندگان را در این بخش ثبت کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                        {member.fullName.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{member.fullName}</h4>
                        <span className="text-[10px] text-cyan-400 font-mono block">
                          کد: {member.membershipNumber}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                      عضو فعال
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>شماره تماس:</span>
                      <span className="font-mono text-slate-200 dir-ltr">{member.phoneNumber}</span>
                    </div>
                    {member.nationalId && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>کد ملی:</span>
                        <span className="font-mono text-slate-200 dir-ltr">{member.nationalId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>کتاب‌های در دست:</span>
                      <span className="font-bold text-indigo-400 font-mono">
                        {member.currentBorrowsCount || 0} جلد
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="حذف عضو"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => triggerSendSms(member.phoneNumber, '')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                        title="ارسال پیامک"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => triggerPhoneCall(member.phoneNumber)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Phone className="w-3 h-3" />
                        <span>تماس</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 4: READING PROGRESS & QUOTES -------------------- */}
      {subTab === 'reading' && (
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-cyan-400" />
              <span>ردیاب مطالعه شخصی، درصد پیشرفت و گلچین نقل‌قول‌ها</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              کتاب‌هایی که خودتان در حال خواندن هستید را دنبال کنید و عبارات زیبای آن‌ها را ذخیره نمایید.
            </p>
          </div>

          {readingProgress.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2">
              <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-xs font-bold text-slate-300">هنوز کتابی در قفسه مطالعه شخصی ندارید</h3>
              <p className="text-xs text-slate-500">
                در تب کتاب‌ها، روی آیکون بوکمارک هر کتاب کلیک کنید تا آن را وارد قفسه مطالعه شخصی کنید.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {readingProgress.map((prog) => (
                <div
                  key={prog.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white">{prog.bookTitle}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        آخرین مطالعه: {prog.lastReadDate}
                      </span>
                    </div>

                    <span className="text-sm font-black text-cyan-400 font-mono">
                      {prog.percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500 rounded-full"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>صفحه {prog.currentPage}</span>
                    <span>کل کتاب: {prog.totalPages} صفحه</span>
                  </div>

                  {/* Quotes List */}
                  {prog.quotes && prog.quotes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-300 block">
                        نقل‌قول‌های ذخیره‌شده از این اثر:
                      </span>
                      {prog.quotes.map((q) => (
                        <blockquote
                          key={q.id}
                          className="p-3 rounded-2xl bg-slate-950/70 border-r-2 border-cyan-500 text-xs text-slate-200 italic leading-relaxed"
                        >
                          «{q.text}»
                          {q.page && (
                            <span className="block text-[9px] text-cyan-400 font-mono not-italic mt-1">
                              صفحه {q.page}
                            </span>
                          )}
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- MODAL: ADD BOOK -------------------- */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0c1220] border border-slate-750 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>ثبت کتاب جدید در کتابخانه</span>
              </h3>
              <button onClick={() => setIsAddBookOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">عنوان کتاب *</label>
                  <input
                    type="text"
                    required
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="مثلاً: کلیدر، بوف کور، هنر شفاف اندیشیدن"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">نویسنده / مؤلف *</label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="نام نویسنده"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">مترجم (اختیاری)</label>
                  <input
                    type="text"
                    value={bookForm.translator}
                    onChange={(e) => setBookForm({ ...bookForm, translator: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">دسته‌بندی موضوعی</label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {BOOK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">محل قفسه / ردیف فیزیکی</label>
                  <input
                    type="text"
                    value={bookForm.shelfLocation}
                    onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="مثال: قفسه A-3، ردیف ۲"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">شابک (ISBN)</label>
                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono dir-ltr focus:outline-none focus:border-cyan-400"
                    placeholder="978-..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">تعداد نسخه‌های موجود</label>
                  <input
                    type="number"
                    min="1"
                    value={bookForm.totalCopies}
                    onChange={(e) => setBookForm({ ...bookForm, totalCopies: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">تعداد کل صفحات</label>
                  <input
                    type="number"
                    value={bookForm.pageCount}
                    onChange={(e) => setBookForm({ ...bookForm, pageCount: parseInt(e.target.value) || 200 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">خلاصه یا توضیحات کتاب</label>
                <textarea
                  rows={2}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  placeholder="موضوع اصلی، نکات یا معرفی کوتاه کتاب..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  ثبت کتاب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: CREATE LOAN -------------------- */}
      {isCreateLoanOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1220] border border-slate-750 p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-cyan-400" />
                <span>ثبت برگه امانت کتاب</span>
              </h3>
              <button onClick={() => setIsCreateLoanOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">انتخاب کتاب *</label>
                <select
                  required
                  value={loanForm.bookId}
                  onChange={(e) => setLoanForm({ ...loanForm, bookId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- یک کتاب را انتخاب کنید --</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                      {b.title} - اثر {b.author} ({b.availableCopies} نسخه موجود)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">انتخاب عضو / امانت‌گیرنده *</label>
                <select
                  required
                  value={loanForm.memberId}
                  onChange={(e) => setLoanForm({ ...loanForm, memberId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- عضو امانت‌گیرنده را انتخاب کنید --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">مدت زمان امانت</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: '۷ روزه' },
                    { days: 14, label: '۱۴ روزه (عادی)' },
                    { days: 30, label: '۳۰ روزه' },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setLoanForm({ ...loanForm, durationDays: opt.days })}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        loanForm.durationDays === opt.days
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateLoanOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!loanForm.bookId || !loanForm.memberId}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold shadow-md"
                >
                  ثبت قطعی امانت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ADD MEMBER -------------------- */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1220] border border-slate-750 p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>صدور کارت و ثبت عضو جدید</span>
              </h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">شماره تلفن همراه (جهت پیامک و تماس) *</label>
                <input
                  type="tel"
                  required
                  placeholder="0912..."
                  value={memberForm.phoneNumber}
                  onChange={(e) => setMemberForm({ ...memberForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono dir-ltr focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">کد ملی (اختیاری)</label>
                <input
                  type="text"
                  value={memberForm.nationalId}
                  onChange={(e) => setMemberForm({ ...memberForm, nationalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono dir-ltr focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  صدور کارت عضویت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: READING PROGRESS -------------------- */}
      {isProgressModalOpen && selectedBookForProgress && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1220] border border-slate-750 p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <span>ثبت پیشرفت مطالعه: {selectedBookForProgress.title}</span>
              </h3>
              <button onClick={() => setIsProgressModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  صفحه خوانده‌شده فعلی (از {selectedBookForProgress.pageCount || 200}):
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedBookForProgress.pageCount || 200}
                  value={progressPage}
                  onChange={(e) => setProgressPage(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-center text-sm font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  ثبت نقل‌قول یا جمله ماندگار از کتاب (اختیاری):
                </label>
                <textarea
                  rows={3}
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  placeholder="عبارت ماندگاری که در این صفحه خواندید..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  ذخیره پیشرفت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
