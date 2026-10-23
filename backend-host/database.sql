-- --------------------------------------------------------
-- پایگاه داده اختصاصی دستیار هوشمند همراه
-- قابل اجرا در phpMyAdmin سی‌پنل (cPanel) یا دایرکت‌ادمین (DirectAdmin)
-- --------------------------------------------------------

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

-- ۱. جدول مخاطبین همگام‌سازی شده
CREATE TABLE IF NOT EXISTS `assistant_contacts` (
  `id` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `phone_number` varchar(32) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `category` varchar(32) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `phone_idx` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول تراکنش‌های مالی و حسابداری (استخراج‌شده از پیامک‌های بانکی)
CREATE TABLE IF NOT EXISTS `assistant_transactions` (
  `id` varchar(64) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `amount_toman` bigint(20) NOT NULL,
  `bank_name` varchar(64) NOT NULL,
  `card_account` varchar(64) DEFAULT NULL,
  `balance_after` bigint(20) DEFAULT NULL,
  `category` varchar(64) NOT NULL,
  `tracking_code` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `raw_sms` text DEFAULT NULL,
  `timestamp` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tx_type_idx` (`type`),
  KEY `tx_cat_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول اسناد اسکن‌شده و فاکتورها
CREATE TABLE IF NOT EXISTS `assistant_documents` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(64) NOT NULL,
  `filter_applied` varchar(32) NOT NULL,
  `image_url` longtext NOT NULL,
  `file_size` varchar(32) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول تیکت‌ها و پیام‌های پشتیبانی فنی
CREATE TABLE IF NOT EXISTS `assistant_tickets` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(64) NOT NULL,
  `priority` varchar(32) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','in_progress','resolved') DEFAULT 'pending',
  `response` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول کتاب‌ها و موجودی قفسه‌ها (مدیریت کتابخانه)
CREATE TABLE IF NOT EXISTS `assistant_books` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `translator` varchar(255) DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `congress_code` varchar(64) DEFAULT NULL,
  `publish_year` varchar(32) DEFAULT NULL,
  `isbn` varchar(64) DEFAULT NULL,
  `category` varchar(64) NOT NULL,
  `shelf_location` varchar(128) NOT NULL,
  `total_copies` int(11) NOT NULL DEFAULT 1,
  `available_copies` int(11) NOT NULL DEFAULT 1,
  `status` enum('available','borrowed','reserved','lost') DEFAULT 'available',
  `tags` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `book_cat_idx` (`category`),
  KEY `shelf_idx` (`shelf_location`),
  KEY `congress_idx` (`congress_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول اعضای کتابخانه
CREATE TABLE IF NOT EXISTS `assistant_members` (
  `id` varchar(64) NOT NULL,
  `membership_number` varchar(64) NOT NULL,
  `full_name` varchar(128) NOT NULL,
  `national_id` varchar(32) DEFAULT NULL,
  `phone_number` varchar(32) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `membership_date` varchar(32) NOT NULL,
  `expiry_date` varchar(32) DEFAULT NULL,
  `status` enum('active','expired','suspended') DEFAULT 'active',
  `borrowed_count` int(11) NOT NULL DEFAULT 0,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `member_no_idx` (`membership_number`),
  KEY `member_phone_idx` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول امانات و گردش کتاب (امانت، تمدید، بازگشت)
CREATE TABLE IF NOT EXISTS `assistant_loans` (
  `id` varchar(64) NOT NULL,
  `book_id` varchar(64) NOT NULL,
  `book_title` varchar(255) NOT NULL,
  `member_id` varchar(64) NOT NULL,
  `member_name` varchar(128) NOT NULL,
  `member_phone` varchar(32) NOT NULL,
  `loan_date` varchar(32) NOT NULL,
  `due_date` varchar(32) NOT NULL,
  `return_date` varchar(32) DEFAULT NULL,
  `status` enum('active','returned','overdue') DEFAULT 'active',
  `renew_count` int(11) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_book_idx` (`book_id`),
  KEY `loan_member_idx` (`member_id`),
  KEY `loan_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول تنظیمات کلان و پیکربندی سامانه
CREATE TABLE IF NOT EXISTS `assistant_settings` (
  `setting_key` varchar(64) NOT NULL,
  `setting_value` text NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


