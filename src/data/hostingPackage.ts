/**
 * Pre-packaged PHP Backend & MySQL Schema for Shared Linux Hosting (cPanel / DirectAdmin)
 * Users can view, copy, or download these files directly from the applet to upload to their host.
 */

export interface HostingFile {
  name: string;
  path: string;
  description: string;
  content: string;
}

export const HOSTING_PACKAGE_FILES: HostingFile[] = [
  {
    name: 'config.php',
    path: 'api/config.php',
    description: 'فایل تنظیمات اتصال به دیتابیس MySQL و کلید امنیتی API',
    content: `<?php
/**
 * Companion Assistant - Server Configuration
 * تنظیمات دیتابیس و کلید امنیتی برای هاست اشتراکی
 */

// اطلاعات دیتابیس هاست (در سی‌پنل یا دایرکت‌ادمین ایجاد کنید)
define('DB_HOST', 'localhost');
define('DB_NAME', 'my_companion_db');
define('DB_USER', 'db_username');
define('DB_PASS', 'your_secure_password');
define('DB_CHARSET', 'utf8mb4');

// کلید امنیتی API (باید دقیقاً با کلیدی که در تنظیمات اپ وارد می‌کنید یکی باشد)
define('API_SECRET_KEY', 'COMPANION_SECURE_TOKEN_2026');

// تنظیمات خطایابی (برای امنیت در حالت پروداکشن خاموش است)
ini_set('display_errors', 0);
error_reporting(E_ALL);

function getDbConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
          {
    name: 'install.php',
    path: 'api/install.php',
    description: 'صفحه نصب تحت وب، ساخت خودکار جداول دیتابیس و داشبورد پایش داده‌ها',
    content: ', '\,
  },
];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database connection failed']);
            exit;
        }
    }
    return $pdo;
}
`,
  },
  {
    name: 'api.php',
    path: 'api/api.php',
    description: 'وب‌سرویس اصلی REST API جهت دریافت و همگام‌سازی اطلاعات دستیار',
    content: `<?php
/**
 * Companion Assistant - REST API Gateway
 * پردازش درخواست‌های همگام‌سازی، تست اتصال و ثبت تیکت‌ها
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

// بررسی احراز هویت با کلید امنیتی
$receivedKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['key'] ?? '';
if ($receivedKey !== API_SECRET_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized: Invalid or missing API key',
    ]);
    exit;
}

$action = $_GET['action'] ?? '';
$pdo = getDbConnection();

switch ($action) {
    // ۱. تست اتصال به سرور و سلامت سیستم
    case 'ping':
        echo json_encode([
            'success' => true,
            'message' => 'اتصال به هاست اشتراکی لینوکس با موفقیت برقرار است.',
            'server_time' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION,
        ]);
        break;

    // ۲. همگام‌سازی مخاطبین (دریافت یا ذخیره)
    case 'sync_contacts':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $contacts = $input['contacts'] ?? [];
            $count = 0;

            $stmt = $pdo->prepare("
                INSERT INTO assistant_contacts (id, name, phone_number, email, category, notes, updated_at)
                VALUES (:id, :name, :phone_number, :email, :category, :notes, NOW())
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    phone_number = VALUES(phone_number),
                    email = VALUES(email),
                    category = VALUES(category),
                    notes = VALUES(notes),
                    updated_at = NOW()
            ");

            foreach ($contacts as $c) {
                if (!empty($c['id']) && !empty($c['phoneNumber'])) {
                    $stmt->execute([
                        ':id' => $c['id'],
                        ':name' => $c['name'] ?? '',
                        ':phone_number' => $c['phoneNumber'],
                        ':email' => $c['email'] ?? null,
                        ':category' => $c['category'] ?? null,
                        ':notes' => $c['notes'] ?? null,
                    ]);
                    $count++;
                }
            }

            echo json_encode([
                'success' => true,
                'synced_count' => $count,
                'message' => "تعداد $count مخاطب با هاست ابری همگام شد."
            ]);
        } else {
            // دریافت لیست مخاطبین از هاست
            $stmt = $pdo->query("SELECT * FROM assistant_contacts ORDER BY name ASC");
            $rows = $stmt->fetchAll();
            echo json_encode(['success' => true, 'contacts' => $rows]);
        }
        break;

    // ۳. همگام‌سازی تراکنش‌های مالی و حسابداری
    case 'sync_transactions':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $txs = $input['transactions'] ?? [];
            $count = 0;

            $stmt = $pdo->prepare("
                INSERT INTO assistant_transactions (id, type, amount_toman, bank_name, card_account, balance_after, category, tracking_code, notes, raw_sms, timestamp)
                VALUES (:id, :type, :amount_toman, :bank_name, :card_account, :balance_after, :category, :tracking_code, :notes, :raw_sms, :timestamp)
                ON DUPLICATE KEY UPDATE
                    amount_toman = VALUES(amount_toman),
                    category = VALUES(category),
                    notes = VALUES(notes)
            ");

            foreach ($txs as $t) {
                if (!empty($t['id'])) {
                    $stmt->execute([
                        ':id' => $t['id'],
                        ':type' => $t['type'] ?? 'expense',
                        ':amount_toman' => $t['amountToman'] ?? 0,
                        ':bank_name' => $t['bankName'] ?? 'بانک',
                        ':card_account' => $t['cardOrAccount'] ?? null,
                        ':balance_after' => $t['balanceAfter'] ?? null,
                        ':category' => $t['category'] ?? 'سایر',
                        ':tracking_code' => $t['trackingCode'] ?? null,
                        ':notes' => $t['notes'] ?? null,
                        ':raw_sms' => $t['rawSms'] ?? null,
                        ':timestamp' => $t['timestamp'] ?? time(),
                    ]);
                    $count++;
                }
            }

            echo json_encode(['success' => true, 'synced_count' => $count]);
        }
        break;

    // ۴. ثبت پیام و تیکت پشتیبانی فنی
    case 'submit_ticket':
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['title']) || empty($input['message'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Title and message are required']);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO assistant_tickets (id, title, category, priority, message, status, created_at)
            VALUES (:id, :title, :category, :priority, :message, 'pending', NOW())
        ");

        $id = $input['id'] ?? uniqid('tkt_', true);
        $stmt->execute([
            ':id' => $id,
            ':title' => $input['title'],
            ':category' => $input['category'] ?? 'فنی',
            ':priority' => $input['priority'] ?? 'عادی',
            ':message' => $input['message'],
        ]);

        echo json_encode([
            'success' => true,
            'ticket_id' => $id,
            'message' => 'پیام شما در سرور هاست ثبت شد و در صف پیگیری پشتیبانی قرار گرفت.'
        ]);
        break;

    // دریافت وضعیت کلی دیتابیس سرور
    case 'stats':
        $contactsCount = $pdo->query("SELECT COUNT(*) FROM assistant_contacts")->fetchColumn();
        $callsCount = $pdo->query("SELECT COUNT(*) FROM assistant_call_logs")->fetchColumn();
        $ticketsCount = $pdo->query("SELECT COUNT(*) FROM assistant_tickets")->fetchColumn();

        echo json_encode([
            'success' => true,
            'stats' => [
                'contacts' => (int)$contactsCount,
                'calls' => (int)$callsCount,
                'tickets' => (int)$ticketsCount,
                'server_time' => date('Y-m-d H:i:s'),
            ]
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action نامعتبر است']);
        break;
}
`,
  },
  {
    name: 'database.sql',
    path: 'database.sql',
    description: 'کدهای SQL جهت ساخت جداول دیتابیس در phpMyAdmin هاست اشتراکی',
    content: `-- --------------------------------------------------------
-- اسکریپت دیتابیس اختصاصی دستیار هوشمند همراه
-- قابل ایمپورت در phpMyAdmin سی‌پنل و دایرکت‌ادمین
-- --------------------------------------------------------

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

-- ۱. جدول مخاطبین همگام‌سازی شده
CREATE TABLE IF NOT EXISTS \`assistant_contacts\` (
  \`id\` varchar(64) NOT NULL,
  \`name\` varchar(128) NOT NULL,
  \`phone_number\` varchar(32) NOT NULL,
  \`email\` varchar(128) DEFAULT NULL,
  \`category\` varchar(32) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`updated_at\` datetime NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`phone_idx\` (\`phone_number\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول تراکنش‌های مالی و حسابداری (استخراج‌شده از پیامک‌های بانکی)
CREATE TABLE IF NOT EXISTS \`assistant_transactions\` (
  \`id\` varchar(64) NOT NULL,
  \`type\` enum('income','expense') NOT NULL,
  \`amount_toman\` bigint(20) NOT NULL,
  \`bank_name\` varchar(64) NOT NULL,
  \`card_account\` varchar(64) DEFAULT NULL,
  \`balance_after\` bigint(20) DEFAULT NULL,
  \`category\` varchar(64) NOT NULL,
  \`tracking_code\` varchar(64) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`raw_sms\` text DEFAULT NULL,
  \`timestamp\` bigint(20) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`tx_type_idx\` (\`type\`),
  KEY \`tx_cat_idx\` (\`category\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول اسناد اسکن‌شده و فاکتورها
CREATE TABLE IF NOT EXISTS \`assistant_documents\` (
  \`id\` varchar(64) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`category\` varchar(64) NOT NULL,
  \`filter_applied\` varchar(32) NOT NULL,
  \`image_url\` longtext NOT NULL,
  \`file_size\` varchar(32) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`created_at\` datetime NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول تیکت‌ها و پیام‌های پشتیبانی فنی
CREATE TABLE IF NOT EXISTS \`assistant_tickets\` (
  \`id\` varchar(64) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`category\` varchar(64) NOT NULL,
  \`priority\` varchar(32) NOT NULL,
  \`message\` text NOT NULL,
  \`status\` enum('pending','in_progress','resolved') DEFAULT 'pending',
  \`response\` text DEFAULT NULL,
  \`created_at\` datetime NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`,
  },
  {
    name: 'README_INSTALL.txt',
    path: 'README_INSTALL.txt',
    description: 'راهنمای ۳ مرحله‌ای آپلود و فعال‌سازی در سی‌پنل (cPanel)',
    content: `راهنمای راه‌اندازی وب‌سرویس همگام‌سازی روی هاست لینوکس اشتراکی:

مرحله ۱: ایجاد پایگاه داده
۱. وارد cPanel هاست خود شوید.
۲. به بخش MySQL Database Wizard رفته و یک دیتابیس جدید (مثلاً my_companion_db) و کاربر بسازید و تمام دسترسی‌ها (ALL PRIVILEGES) را تیک بزنید.
۳. وارد phpMyAdmin شوید، دیتابیس ساخته‌شده را انتخاب کنید و از تب Import فایل database.sql را بارگذاری و اجرا کنید.

مرحله ۲: آپلود فایل‌های وب‌سرویس
۱. در File Manager هاست به پوشه public_html بروید.
۲. یک پوشه به نام api ایجاد کنید.
۳. دو فایل api.php و config.php را داخل پوشه api آپلود نمایید.
۴. فایل config.php را ویرایش کنید و نام دیتابیس، نام کاربری، رمز عبور و یک API_SECRET_KEY دلخواه را وارد کنید.

مرحله ۳: اتصال اپلیکیشن
۱. در اپلیکیشن به تب «همگام‌سازی هاست» بروید.
۲. آدرس کامل فایل api.php را وارد کنید:
   مثال: https://yourdomain.com/api/api.php
۳. کلید امنیتی (API_SECRET_KEY) را وارد کنید.
۴. دکمه «تست اتصال» را بزنید؛ در صورت سبز شدن وضعیت، سیستم آماده همگام‌سازی ۲ طرفه خواهد بود!
`,
  },
];
