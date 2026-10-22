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
