<?php
/**
 * Companion Assistant - Server Configuration
 * تنظیمات دیتابیس و کلید امنیتی برای هاست اشتراکی (cPanel / DirectAdmin)
 */

// ۱. اطلاعات اتصال به دیتابیس MySQL (از بخش MySQL Databases در هاست)
define('DB_HOST', 'localhost');
define('DB_NAME', 'my_companion_db');       // نام دیتابیس ساخته‌شده
define('DB_USER', 'db_username');           // نام کاربری دیتابیس
define('DB_PASS', 'your_secure_password');  // رمز عبور کاربر دیتابیس
define('DB_CHARSET', 'utf8mb4');

// ۲. کلید امنیتی اتصال برنامه (API Secret Token)
// این کلید را شخصی‌سازی کنید و عیناً در صفحه «همگام‌سازی» اپلیکیشن وارد نمایید.
define('API_SECRET_KEY', 'COMPANION_SECURE_TOKEN_2026');

// تنظیمات امنیتی نمایش خطا
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
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false, 
                'error' => 'Database connection failed: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    return $pdo;
}
