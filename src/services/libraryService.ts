import { Book, LibraryMember, BookLoan, ReadingProgress } from '../types';
import { localDB } from './db';
import { getHostingConfig } from './sync';

const BOOKS_KEY = 'app_library_books';
const MEMBERS_KEY = 'app_library_members';
const LOANS_KEY = 'app_library_loans';
const READING_KEY = 'app_library_reading_progress';

// Initial clean state (starts empty without fabricated mock data, as requested by user)
export const INITIAL_BOOKS: Book[] = [];
export const INITIAL_MEMBERS: LibraryMember[] = [];
export const INITIAL_LOANS: BookLoan[] = [];
export const INITIAL_READING: ReadingProgress[] = [];

export const BOOK_CATEGORIES = [
  'رمان و ادبیات',
  'علمی و دانشگاهی',
  'روانشناسی و خودشناسی',
  'تاریخ و تمدن',
  'کسب‌وکار و مدیریت',
  'فلسفه و منطق',
  'هنر و معماری',
  'کودک و نوجوان',
  'تکنولوژی و برنامه‌نویسی',
  'مذهبی و عرفانی',
  'زبان‌های خارجی',
  'سایر موضوعات',
];

// --- Books Operations ---
export async function getBooks(): Promise<Book[]> {
  return await localDB.getSetting<Book[]>(BOOKS_KEY, INITIAL_BOOKS);
}

export async function saveBooks(books: Book[]): Promise<void> {
  await localDB.setSetting(BOOKS_KEY, books);
}

export async function addBook(book: Omit<Book, 'id' | 'addedDate'>): Promise<Book> {
  const books = await getBooks();
  const newBook: Book = {
    ...book,
    id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    addedDate: new Date().toLocaleDateString('fa-IR'),
  };
  const updated = [newBook, ...books];
  await saveBooks(updated);
  return newBook;
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<void> {
  const books = await getBooks();
  const updated = books.map((b) => (b.id === id ? { ...b, ...updates } : b));
  await saveBooks(updated);
}

export async function deleteBook(id: string): Promise<void> {
  const books = await getBooks();
  await saveBooks(books.filter((b) => b.id !== id));
}

// --- Members Operations ---
export async function getMembers(): Promise<LibraryMember[]> {
  return await localDB.getSetting<LibraryMember[]>(MEMBERS_KEY, INITIAL_MEMBERS);
}

export async function saveMembers(members: LibraryMember[]): Promise<void> {
  await localDB.setSetting(MEMBERS_KEY, members);
}

export async function addMember(member: Omit<LibraryMember, 'id' | 'joinDate' | 'currentBorrowsCount'>): Promise<LibraryMember> {
  const members = await getMembers();
  const newMember: LibraryMember = {
    ...member,
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    joinDate: new Date().toLocaleDateString('fa-IR'),
    currentBorrowsCount: 0,
  };
  const updated = [newMember, ...members];
  await saveMembers(updated);
  return newMember;
}

export async function updateMember(id: string, updates: Partial<LibraryMember>): Promise<void> {
  const members = await getMembers();
  const updated = members.map((m) => (m.id === id ? { ...m, ...updates } : m));
  await saveMembers(updated);
}

export async function deleteMember(id: string): Promise<void> {
  const members = await getMembers();
  await saveMembers(members.filter((m) => m.id !== id));
}

// --- Loans Operations ---
export async function getLoans(): Promise<BookLoan[]> {
  const loans = await localDB.getSetting<BookLoan[]>(LOANS_KEY, INITIAL_LOANS);
  // Auto-check overdue status based on date
  const todayIso = new Date().toISOString().slice(0, 10);
  return loans.map((loan) => {
    if (loan.status === 'active' && loan.dueDate < todayIso) {
      return { ...loan, status: 'overdue' as const };
    }
    return loan;
  });
}

export async function saveLoans(loans: BookLoan[]): Promise<void> {
  await localDB.setSetting(LOANS_KEY, loans);
}

export async function createLoan(params: {
  bookId: string;
  memberId: string;
  durationDays: number;
  notes?: string;
}): Promise<BookLoan> {
  const [books, members, loans] = await Promise.all([getBooks(), getMembers(), getLoans()]);
  const book = books.find((b) => b.id === params.bookId);
  const member = members.find((m) => m.id === params.memberId);

  if (!book) throw new Error('کتاب یافت نشد');
  if (!member) throw new Error('عضو یافت نشد');
  if (book.availableCopies <= 0) throw new Error('نسخه موجود برای این کتاب به اتمام رسیده است');

  const now = new Date();
  const due = new Date();
  due.setDate(now.getDate() + (params.durationDays || 14));

  const newLoan: BookLoan = {
    id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    bookId: book.id,
    bookTitle: book.title,
    memberId: member.id,
    memberName: member.fullName,
    memberPhone: member.phoneNumber,
    loanDate: now.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    status: 'active',
    extendedCount: 0,
    notes: params.notes,
  };

  // Update book copies
  const updatedAvailable = book.availableCopies - 1;
  await updateBook(book.id, {
    availableCopies: updatedAvailable,
    status: updatedAvailable <= 0 ? 'borrowed' : 'available',
  });

  // Update member count
  await updateMember(member.id, {
    currentBorrowsCount: (member.currentBorrowsCount || 0) + 1,
  });

  const updatedLoans = [newLoan, ...loans];
  await saveLoans(updatedLoans);
  return newLoan;
}

export async function returnLoan(loanId: string): Promise<void> {
  const [books, members, loans] = await Promise.all([getBooks(), getMembers(), getLoans()]);
  const loan = loans.find((l) => l.id === loanId);
  if (!loan || loan.status === 'returned') return;

  const nowIso = new Date().toISOString().slice(0, 10);
  const updatedLoans = loans.map((l) =>
    l.id === loanId ? { ...l, status: 'returned' as const, returnDate: nowIso } : l
  );
  await saveLoans(updatedLoans);

  // Restore book copy
  const book = books.find((b) => b.id === loan.bookId);
  if (book) {
    const newCopies = book.availableCopies + 1;
    await updateBook(book.id, {
      availableCopies: newCopies,
      status: 'available',
    });
  }

  // Decrement member count
  const member = members.find((m) => m.id === loan.memberId);
  if (member && member.currentBorrowsCount > 0) {
    await updateMember(member.id, {
      currentBorrowsCount: member.currentBorrowsCount - 1,
    });
  }
}

export async function extendLoan(loanId: string, additionalDays: number = 7): Promise<void> {
  const loans = await getLoans();
  const updatedLoans = loans.map((loan) => {
    if (loan.id === loanId && loan.status !== 'returned') {
      const currentDue = new Date(loan.dueDate);
      currentDue.setDate(currentDue.getDate() + additionalDays);
      return {
        ...loan,
        dueDate: currentDue.toISOString().slice(0, 10),
        status: 'active' as const,
        extendedCount: (loan.extendedCount || 0) + 1,
      };
    }
    return loan;
  });
  await saveLoans(updatedLoans);
}

// --- Reading Progress & Quotes Operations ---
export async function getReadingProgress(): Promise<ReadingProgress[]> {
  return await localDB.getSetting<ReadingProgress[]>(READING_KEY, INITIAL_READING);
}

export async function saveReadingProgress(items: ReadingProgress[]): Promise<void> {
  await localDB.setSetting(READING_KEY, items);
}

export async function updateBookProgress(
  bookId: string,
  bookTitle: string,
  currentPage: number,
  totalPages: number
): Promise<void> {
  const list = await getReadingProgress();
  const percent = Math.min(100, Math.round((currentPage / (totalPages || 1)) * 100));
  const existingIndex = list.findIndex((item) => item.bookId === bookId);

  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      currentPage,
      totalPages,
      percent,
      lastReadDate: new Date().toLocaleDateString('fa-IR'),
    };
  } else {
    list.unshift({
      id: `prog_${Date.now()}`,
      bookId,
      bookTitle,
      currentPage,
      totalPages,
      percent,
      quotes: [],
      lastReadDate: new Date().toLocaleDateString('fa-IR'),
    });
  }
  await saveReadingProgress([...list]);
}

export async function addBookQuote(
  bookId: string,
  text: string,
  page?: number
): Promise<void> {
  const list = await getReadingProgress();
  const item = list.find((i) => i.bookId === bookId);
  const newQuote = {
    id: `qt_${Date.now()}`,
    text,
    page,
    date: new Date().toLocaleDateString('fa-IR'),
  };
  if (item) {
    item.quotes.push(newQuote);
    await saveReadingProgress([...list]);
  }
}

// --- Host Cloud Sync for Library Data (Two-Way Sync) ---
export async function syncLibraryToHost(): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getHostingConfig();
    if (!config.apiUrl || !config.apiKey) {
      return { success: false, message: 'آدرس یا کلید هاست در بخش همگام‌سازی تنظیم نشده است.' };
    }

    const [localBooks, localMembers, localLoans] = await Promise.all([getBooks(), getMembers(), getLoans()]);

    // 1. ارسال امانات و وضعیت محلی به سرور
    await fetch(`${config.apiUrl}?action=sync_library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ books: localBooks, members: localMembers, loans: localLoans }),
    });

    // 2. دریافت فهرست به‌روز کتاب‌ها و اعضا (مثلاً موارد بارگذاری‌شده از اکسل در پنل وب)
    const pullRes = await fetch(`${config.apiUrl}?action=sync_library`, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
      },
    });

    if (pullRes.ok) {
      const serverData = await pullRes.json();
      if (serverData.success) {
        if (Array.isArray(serverData.books) && serverData.books.length > 0) {
          const mappedBooks: Book[] = serverData.books.map((b: any) => ({
            id: b.id || `book_${Date.now()}`,
            title: b.title || '',
            author: b.author || 'نامشخص',
            translator: b.translator || undefined,
            publisher: b.publisher || undefined,
            congressCode: b.congress_code || b.congressCode || undefined,
            publishYear: b.publish_year || b.publishYear || undefined,
            isbn: b.isbn || undefined,
            category: b.category || 'عمومی',
            shelfLocation: b.shelf_location || b.shelfLocation || 'A-1',
            totalCopies: Number(b.total_copies ?? b.totalCopies ?? 1),
            availableCopies: Number(b.available_copies ?? b.availableCopies ?? 1),
            status: b.status || 'available',
            description: b.notes || undefined,
            addedDate: b.created_at || new Date().toLocaleDateString('fa-IR'),
          }));
          await saveBooks(mappedBooks);
        }

        if (Array.isArray(serverData.members) && serverData.members.length > 0) {
          const mappedMembers: LibraryMember[] = serverData.members.map((m: any) => ({
            id: m.id || `mem_${Date.now()}`,
            membershipNumber: m.membership_number || m.membershipNumber || `LIB-${Math.floor(1000 + Math.random() * 9000)}`,
            fullName: m.full_name || m.fullName || 'عضو بدون نام',
            nationalId: m.national_id || m.nationalId || undefined,
            phoneNumber: m.phone_number || m.phoneNumber || '',
            email: m.email || undefined,
            joinDate: m.membership_date || m.membershipDate || new Date().toLocaleDateString('fa-IR'),
            expiryDate: m.expiry_date || m.expiryDate || undefined,
            status: m.status || 'active',
            currentBorrowsCount: Number(m.borrowed_count ?? m.currentBorrowsCount ?? 0),
            notes: m.notes || undefined,
          }));
          await saveMembers(mappedMembers);
        }

        return { 
          success: true, 
          message: `همگام‌سازی کامل شد (${serverData.books?.length || 0} کتاب و ${serverData.members?.length || 0} عضو از سرور به‌روز شدند).` 
        };
      }
    }

    return { success: true, message: 'اطلاعات با موفقیت با هاست همگام‌سازی شدند.' };
  } catch (err: any) {
    return { success: false, message: 'عدم ارتباط با هاست: ' + (err.message || 'خطای شبکه') };
  }
}

