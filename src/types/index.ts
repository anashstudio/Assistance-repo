export type ActiveTab = 
  | 'dashboard'
  | 'messenger'
  | 'finance'
  | 'personal'
  | 'tools'
  | 'scanner'
  | 'app_usage'
  | 'vehicle'
  | 'health'
  | 'vault'
  | 'meetings'
  | 'crm'
  | 'habits'
  | 'contacts'
  | 'sync'
  | 'support'
  | 'about'
  | 'library';

export interface AppModuleConfig {
  id: ActiveTab;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  category: 'اصلی' | 'شخصی' | 'ابزار' | 'مالی' | 'پایش و عادات' | 'خودرو و سفر' | 'سلامت و محرمانه' | 'بهره‌وری و کار' | 'ابزار و تنظیمات' | 'ابزار و مالی' | 'ابزار و ارتباطات';
  isEnabled: boolean;
  isCore?: boolean;
}

// App Usage & Digital Habit Recognition
export interface AppUsageStat {
  id: string;
  appName: string;
  category: 'شبکه‌های اجتماعی' | 'پیام‌رسان' | 'کاری و ابزارها' | 'سرگرمی و ویدیو' | 'وب‌گردی' | 'تماس و پیامک';
  usageMinutesToday: number;
  usageMinutesYesterday: number;
  opensCount: number;
  limitMinutes?: number;
  iconColor: string;
}

export interface HabitInsight {
  id: string;
  type: 'positive' | 'warning' | 'tip';
  title: string;
  description: string;
  timeContext?: string;
}

// Minimal Dashboard Custom Shortcuts
export interface DashboardShortcut {
  id: string;
  moduleId: ActiveTab;
  title: string;
}

// Theme & Appearance Settings
export type ThemeMode = 'dark' | 'light' | 'oled' | 'cyber';
export type AccentColor = 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose';

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: AccentColor;
  compactMode: boolean;
}

// 1. Vehicle Module Types
export interface VehicleInfo {
  model: string;
  plateNumber: string;
  currentKilometers: number;
  insuranceExpiryDate?: string;
  inspectionExpiryDate?: string;
  parkingSpot?: string;
  parkingFloor?: string;
  parkingNotes?: string;
}

export interface VehicleServiceItem {
  id: string;
  title: string;
  intervalKm: number;
  lastReplacedKm: number;
  lastReplacedDate: string;
  notes?: string;
}

// 2. Health & Medical Module Types
export interface MedicalIdInfo {
  fullName: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes?: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timesPerDay: string[];
  takenToday: boolean;
  stockCount?: number;
  reminderNote?: string;
}

export interface HealthVitalLog {
  id: string;
  type: 'فشار خون' | 'قند خون' | 'وزن' | 'ضربان قلب';
  value: string;
  unit: string;
  timestamp: number;
  notes?: string;
}

// 3. Secret Vault Types
export interface VaultAccountItem {
  id: string;
  title: string;
  username: string;
  passwordEncrypted: string;
  category: 'ایمیل' | 'بانکی' | 'شبکه اجتماعی' | 'سرور و هاستینگ' | 'سایر';
  websiteUrl?: string;
  notes?: string;
  updatedAt: number;
}

export interface SecretNoteItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface WarrantyItem {
  id: string;
  deviceName: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiryDate: string;
  sellerShop?: string;
  notes?: string;
}

// 4. Executive Meetings Types
export interface MeetingItem {
  id: string;
  title: string;
  attendees: string;
  date: string;
  time: string;
  locationOrLink?: string;
  notes?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  actionItems: { id: string; text: string; done: boolean; assignee?: string }[];
  audioRecordings?: { id: string; title: string; dataUrl: string; duration: number }[];
}

// 5. Personal CRM & Occasions Types
export interface OccasionItem {
  id: string;
  personName: string;
  title: string;
  solarDate: string;
  daysRemaining?: number;
  category: 'تولد' | 'سالگرد' | 'کاری' | 'خانوادگی';
  notes?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  phoneNumber?: string;
  relation: 'دوست' | 'همکار' | 'خانواده' | 'مشتری' | 'مدیر';
  lastInteractionDate?: number;
  clothingSize?: string;
  favoriteCoffeeDrink?: string;
  hobbies?: string;
  personalNotes?: string;
}

// 6. Habits & Focus Types
export interface HabitItem {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  currentStreak: number;
  history: Record<string, boolean>;
  color: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'عادی' | 'مهم' | 'فوری';
  dueDate?: string;
  category?: string;
}

// Scanned Documents (Multi-page consecutive scan & PDF)
export type DocumentFilterType = 'original' | 'document_bw' | 'enhanced_color' | 'grayscale';

export interface ScannedDocumentItem {
  id: string;
  title: string;
  category: 'فاکتور و رسید' | 'مدرک شناسایی' | 'چک بانکی' | 'قرارداد و نامه' | 'سایر';
  filterApplied: DocumentFilterType;
  imageUrl: string; // First page or main thumbnail
  pages?: string[]; // Consecutive scanned pages (data URLs)
  pageCount?: number;
  pdfDataUrl?: string; // Stored PDF or generated on-demand
  fileSize?: string;
  createdAt: number;
  notes?: string;
  linkedTransactionId?: string;
}

// Finance types with Bank Shortcode & Draft Initial Registration
export type TransactionCategory = 
  | 'خوراک و سوپرمارکت'
  | 'خرید و پوشاک'
  | 'قبض و خدمات'
  | 'اجاره و مسکن'
  | 'حمل و نقل و بنزین'
  | 'پزشکی و سلامت'
  | 'انتقال و کارت‌به‌کارت'
  | 'حقوق و دستمزد'
  | 'سایر';

export interface TransactionItem {
  id: string;
  type: 'income' | 'expense';
  amountToman: number;
  bankName: string;
  senderNumber?: string; // سرشماره بانکی مثل 2000400 یا 20006424
  bankShortcode?: string;
  isDraftInitial?: boolean; // ثبت اولیه جهت تایید کاربر
  cardOrAccount?: string;
  balanceAfter?: number;
  category: TransactionCategory;
  trackingCode?: string;
  timestamp: number;
  rawSms?: string;
  receiptDocId?: string;
  notes?: string;
}

export interface ContactItem {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  notes?: string;
  category?: 'کاری' | 'شخصی' | 'خانواده' | 'ضروری';
  favorite?: boolean;
  createdAt: number;
}

export interface SupportTicket {
  id: string;
  title: string;
  category: 'فنی' | 'امنیت' | 'هاستینگ' | 'پیشنهاد';
  priority: 'عادی' | 'مهم' | 'فوری';
  message: string;
  status: 'pending' | 'sent' | 'resolved';
  createdAt: number;
  response?: string;
}

export interface HostingConfig {
  apiUrl: string;
  apiKey: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTimestamp?: number;
}

export interface SecuritySettings {
  isBiometricEnabled: boolean;
  pinHash: string;
  isLockEnabled: boolean;
  autoLockMinutes: number;
  lastUnlockTimestamp: number;
}

export interface StorageStats {
  transactionsCount: number;
  documentsCount: number;
  contactsCount: number;
  ticketsCount: number;
  totalScreenTimeMinutes?: number;
  estimatedBytes: number;
}

// Messenger & Chat types
export interface ChatConversation {
  id: string;
  contactId?: string;
  participantName: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isPinned?: boolean;
  isOnline?: boolean;
  phoneNumber?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'contact';
  text?: string;
  mediaType?: 'text' | 'voice' | 'image';
  mediaUrl?: string;
  audioDurationSeconds?: number;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

// --- ماژول مدیریت کتابخانه و گردش کتاب ---
export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'lost';

export interface Book {
  id: string;
  title: string;
  author: string;
  translator?: string;
  publisher?: string;
  congressCode?: string; // کد رده‌بندی کنگره (LCC)
  isbn?: string;
  category: string;
  shelfLocation?: string; // کد قفسه فیزیکی
  publishYear?: string;
  totalCopies: number;
  availableCopies: number;
  status: BookStatus;
  coverUrl?: string;
  description?: string;
  pageCount?: number;
  addedDate: string;
  isDigital?: boolean;
}

export type MemberStatus = 'active' | 'suspended' | 'expired';

export interface LibraryMember {
  id: string;
  membershipNumber: string;
  fullName: string;
  nationalId?: string;
  phoneNumber: string;
  email?: string;
  joinDate: string;
  expiryDate: string;
  status: MemberStatus;
  notes?: string;
  avatarUrl?: string;
  currentBorrowsCount: number;
}

export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface BookLoan {
  id: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: LoanStatus;
  extendedCount: number;
  renewCount?: number;
  fineAmountToman?: number;
  notes?: string;
}

export interface ReadingProgress {
  id: string;
  bookId: string;
  bookTitle: string;
  currentPage: number;
  totalPages: number;
  percent: number;
  quotes: { id: string; text: string; page?: number; date: string }[];
  lastReadDate: string;
}
