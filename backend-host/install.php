<?php
/**
 * Companion Assistant - Web Installer & Server Management Hub
 * صفحه راه‌اندازی، مدیریت پایگاه داده و وضعیت همگام‌سازی هاست
 * سازنده: استودیو آناش (محمدرضا امیریوسفی)
 */

session_start();

$configFile = __DIR__ . '/config.php';
$sqlFile = __DIR__ . '/database.sql';
$isConfigured = false;
$dbConnected = false;
$dbError = null;
$pdo = null;

// بررسی وضعیت وجود و اتصال با دیتابیس فعلی
if (file_exists($configFile)) {
    require_once $configFile;
    if (defined('DB_NAME') && DB_NAME !== 'my_companion_db' && defined('DB_USER') && DB_USER !== 'db_username') {
        $isConfigured = true;
        try {
            $pdo = getDbConnection();
            $dbConnected = true;
        } catch (Exception $e) {
            $dbError = $e->getMessage();
        }
    }
}

$action = $_GET['action'] ?? '';
$message = null;
$messageType = 'info';

// پردازش عملیات نصب و ذخیره تنظیمات دیتابیس
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['install_db'])) {
    $dbHost = trim($_POST['db_host'] ?? 'localhost');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = trim($_POST['db_pass'] ?? '');
    $apiKey = trim($_POST['api_key'] ?? '');

    if (empty($dbName) || empty($dbUser) || empty($apiKey)) {
        $message = 'لطفاً نام دیتابیس، نام کاربری و کلید امنیتی API را پر کنید.';
        $messageType = 'error';
    } else {
        // تست اتصال به MySQL
        try {
            $testPdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);

            // اجرای اسکریپت SQL برای ساخت جداول
            if (file_exists($sqlFile)) {
                $sqlContent = file_get_contents($sqlFile);
                $queries = array_filter(array_map('trim', explode(';', $sqlContent)));
                foreach ($queries as $q) {
                    if (!empty($q)) {
                        $testPdo->exec($q);
                    }
                }
            }

            // نوشتن محتوای جدید در config.php
            $configContent = "<?php\n/**\n * Companion Assistant - Server Configuration\n * تنظیم‌شده خودکار توسط Installer\n */\n\ndefine('DB_HOST', '" . addslashes($dbHost) . "');\ndefine('DB_NAME', '" . addslashes($dbName) . "');\ndefine('DB_USER', '" . addslashes($dbUser) . "');\ndefine('DB_PASS', '" . addslashes($dbPass) . "');\ndefine('DB_CHARSET', 'utf8mb4');\n\ndefine('API_SECRET_KEY', '" . addslashes($apiKey) . "');\n\nini_set('display_errors', 0);\nerror_reporting(E_ALL);\n\nfunction getDbConnection() {\n    static \$pdo = null;\n    if (\$pdo === null) {\n        \$dsn = \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;\n        \$options = [\n            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n            PDO::ATTR_EMULATE_PREPARES => false,\n        ];\n        try {\n            \$pdo = new PDO(\$dsn, DB_USER, DB_PASS, \$options);\n        } catch (PDOException \$e) {\n            http_response_code(500);\n            echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . \$e->getMessage()], JSON_UNESCAPED_UNICODE);\n            exit;\n        }\n    }\n    return \$pdo;\n}\n";

            file_put_contents($configFile, $configContent);

            $message = 'تبریک! اتصال برقرار شد، ۷ جدول پایگاه داده (از جمله سیستم جامع مدیریت کتابخانه و گردش کتاب) با موفقیت آماده‌سازی شدند.';
            $messageType = 'success';
            $isConfigured = true;
            $dbConnected = true;
            $pdo = $testPdo;
        } catch (Exception $e) {
            $message = 'خطا در اتصال یا ساخت جداول: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

// تولید اکسپورت JSON از کل داده‌های هاست
if ($action === 'export_json' && $dbConnected && $pdo) {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="assistant_server_backup_' . date('Y-m-d') . '.json"');
    $exportData = [
        'generated_at' => date('c'),
        'server' => $_SERVER['SERVER_NAME'] ?? 'host',
        'contacts' => $pdo->query("SELECT * FROM assistant_contacts")->fetchAll(),
        'transactions' => $pdo->query("SELECT * FROM assistant_transactions")->fetchAll(),
        'tickets' => $pdo->query("SELECT * FROM assistant_tickets")->fetchAll(),
        'books' => $pdo->query("SELECT * FROM assistant_books")->fetchAll(),
        'members' => $pdo->query("SELECT * FROM assistant_members")->fetchAll(),
        'loans' => $pdo->query("SELECT * FROM assistant_loans")->fetchAll(),
    ];
    echo json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// محاسبه آمارها در صورت اتصال
$stats = [
    'contacts' => 0, 
    'transactions' => 0, 
    'tickets' => 0,
    'books' => 0,
    'members' => 0,
    'loans' => 0
];
$recentTxs = [];
$recentContacts = [];
$recentBooks = [];
$recentLoans = [];

if ($dbConnected && $pdo) {
    try {
        $stats['contacts'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_contacts")->fetchColumn();
        $stats['transactions'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_transactions")->fetchColumn();
        $stats['tickets'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_tickets")->fetchColumn();
        $stats['books'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_books")->fetchColumn();
        $stats['members'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_members")->fetchColumn();
        $stats['loans'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_loans WHERE status = 'active' OR status = 'overdue'")->fetchColumn();
        
        $recentTxs = $pdo->query("SELECT * FROM assistant_transactions ORDER BY timestamp DESC LIMIT 6")->fetchAll();
        $recentContacts = $pdo->query("SELECT * FROM assistant_contacts ORDER BY updated_at DESC LIMIT 6")->fetchAll();
        $recentBooks = $pdo->query("SELECT * FROM assistant_books ORDER BY updated_at DESC LIMIT 6")->fetchAll();
        $recentLoans = $pdo->query("SELECT * FROM assistant_loans WHERE status = 'active' OR status = 'overdue' ORDER BY due_date ASC LIMIT 6")->fetchAll();
    } catch (Exception $e) {}
}

// محاسبه آدرس کامل فایل api.php
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$currentHost = $_SERVER['HTTP_HOST'] ?? 'yourdomain.com';
$currentDir = dirname($_SERVER['SCRIPT_NAME']);
$currentDir = rtrim($currentDir, '/\\');
$apiEndpointUrl = $protocol . $currentHost . $currentDir . '/api.php';
$activeApiKey = defined('API_SECRET_KEY') ? API_SECRET_KEY : 'COMPANION_SECURE_TOKEN_2026';
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مرکز مدیریت و نصب سرور دستیار همراه هوشمند</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
    <style>
        body { font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body class="bg-[#070b14] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-black">

    <!-- Top Navigation Header -->
    <header class="border-b border-slate-800 bg-[#0c1220]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div class="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center font-bold text-white text-lg">
                    A
                </div>
                <div>
                    <h1 class="text-sm font-black text-white flex items-center gap-2">
                        پنل مدیریت و نصب سرور دستیار همراه
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                            v2.4.0
                        </span>
                    </h1>
                    <p class="text-[11px] text-slate-400">استودیو آناش • محمدرضا امیریوسفی</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <?php if ($dbConnected): ?>
                    <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        دیتابیس متصل و فعال
                    </span>
                <?php else: ?>
                    <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                        در انتظار راه‌اندازی دیتابیس
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

        <!-- Notification Banner -->
        <?php if ($message): ?>
            <div class="p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg <?php echo $messageType === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'; ?>">
                <div class="flex items-center gap-2">
                    <span class="text-lg"><?php echo $messageType === 'success' ? '✓' : '⚠'; ?></span>
                    <span><?php echo htmlspecialchars($message); ?></span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">✕</button>
            </div>
        <?php endif; ?>

        <!-- Quick Connection Card (Always Ready for App Connection) -->
        <div class="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-[#0a1122] to-[#080d19] border border-cyan-500/30 shadow-2xl space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                    <h2 class="text-base font-black text-white flex items-center gap-2">
                        <span>📲 اطلاعات اتصال اپلیکیشن گوشی به این هاست</span>
                    </h2>
                    <p class="text-xs text-slate-400 mt-1">
                        این مشخصات را در برنامه دستیار همراه در بخش «ابزارها ← هاست و همگام‌سازی» وارد کنید:
                    </p>
                </div>
                <a href="<?php echo htmlspecialchars($apiEndpointUrl . '?action=ping&key=' . urlencode($activeApiKey)); ?>" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all text-center">
                    تست زنده API در مرورگر ↗
                </a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Endpoint URL Box -->
                <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span class="text-[11px] text-slate-400 block font-medium">آدرس وب‌سرویس API Endpoint:</span>
                    <div class="flex items-center gap-2">
                        <input type="text" id="api_url_input" readonly value="<?php echo htmlspecialchars($apiEndpointUrl); ?>" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 dir-ltr select-all">
                        <button onclick="copyToClipboard('api_url_input', this)" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shrink-0">
                            کپی آدرس
                        </button>
                    </div>
                </div>

                <!-- API Secret Key Box -->
                <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span class="text-[11px] text-slate-400 block font-medium">کلید امنیتی احراز هویت (API Secret Key):</span>
                    <div class="flex items-center gap-2">
                        <input type="text" id="api_key_input" readonly value="<?php echo htmlspecialchars($activeApiKey); ?>" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 dir-ltr select-all">
                        <button onclick="copyToClipboard('api_key_input', this)" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shrink-0">
                            کپی کلید
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Server Statistics Cards (When DB Connected) -->
        <?php if ($dbConnected): ?>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">مخاطبین</span>
                    <span class="text-xl font-black text-cyan-400 font-mono mt-0.5 block">
                        <?php echo number_format($stats['contacts']); ?>
                    </span>
                    <span class="text-[9px] text-slate-500">پشتیبان در سرور</span>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">تراکنش‌ها</span>
                    <span class="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                        <?php echo number_format($stats['transactions']); ?>
                    </span>
                    <span class="text-[9px] text-slate-500">بانکی و پیامکی</span>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">کتاب‌های کتابخانه</span>
                    <span class="text-xl font-black text-amber-400 font-mono mt-0.5 block">
                        <?php echo number_format($stats['books']); ?>
                    </span>
                    <span class="text-[9px] text-slate-500">نسخه ثبت‌شده</span>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">اعضای کتابخانه</span>
                    <span class="text-xl font-black text-teal-400 font-mono mt-0.5 block">
                        <?php echo number_format($stats['members']); ?>
                    </span>
                    <span class="text-[9px] text-slate-500">کارت عضویت</span>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">امانات فعال</span>
                    <span class="text-xl font-black text-rose-400 font-mono mt-0.5 block">
                        <?php echo number_format($stats['loans']); ?>
                    </span>
                    <span class="text-[9px] text-slate-500">در دست مطالعه</span>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">تیکت‌های ارسالی</span>
                    <span class="text-xl font-black text-indigo-400 font-mono mt-0.5 block">
                        <?php echo number_format($stats['tickets']); ?>
                    </span>
                    <span class="text-[9px] text-slate-500">پشتیبانی و پیام</span>
                </div>
            </div>

            <!-- Recent Synchronized Data Previews -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Recent Contacts -->
                <div class="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <h3 class="text-xs font-bold text-white flex items-center gap-2">
                            <span>👥 آخرین مخاطبین همگام‌شده</span>
                        </h3>
                        <span class="text-[10px] text-slate-400"><?php echo count($recentContacts); ?> مورد اخیر</span>
                    </div>
                    <div class="space-y-2">
                        <?php if (empty($recentContacts)): ?>
                            <div class="p-6 text-center text-xs text-slate-500">هنوز مخاطبی از گوشی به هاست همگام نشده است.</div>
                        <?php else: ?>
                            <?php foreach ($recentContacts as $c): ?>
                                <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                                    <div>
                                        <span class="font-bold text-white"><?php echo htmlspecialchars($c['name']); ?></span>
                                        <span class="text-[10px] text-cyan-400 block font-mono dir-ltr text-right"><?php echo htmlspecialchars($c['phone_number']); ?></span>
                                    </div>
                                    <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                        <?php echo htmlspecialchars($c['category'] ?? 'عمومی'); ?>
                                    </span>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Recent Transactions -->
                <div class="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <h3 class="text-xs font-bold text-white flex items-center gap-2">
                            <span>💳 آخرین تراکنش‌های بانکی همگام‌شده</span>
                        </h3>
                        <span class="text-[10px] text-slate-400"><?php echo count($recentTxs); ?> مورد اخیر</span>
                    </div>
                    <div class="space-y-2">
                        <?php if (empty($recentTxs)): ?>
                            <div class="p-6 text-center text-xs text-slate-500">هنوز تراکنشی ثبت نشده است.</div>
                        <?php else: ?>
                            <?php foreach ($recentTxs as $t): ?>
                                <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                                    <div>
                                        <span class="font-bold text-white"><?php echo htmlspecialchars($t['bank_name']); ?></span>
                                        <span class="text-[10px] text-slate-400 block"><?php echo htmlspecialchars($t['category']); ?></span>
                                    </div>
                                    <div class="text-left font-mono">
                                        <span class="font-bold <?php echo $t['type'] === 'income' ? 'text-emerald-400' : 'text-rose-400'; ?>">
                                            <?php echo ($t['type'] === 'income' ? '+ ' : '- ') . number_format($t['amount_toman']); ?> تومان
                                        </span>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Library Books & Loans Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Books Catalog Preview -->
                <div class="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <h3 class="text-xs font-bold text-white flex items-center gap-2">
                            <span>📚 کاتالوگ کتاب‌ها و قفسه‌ها</span>
                        </h3>
                        <span class="text-[10px] text-slate-400"><?php echo count($recentBooks); ?> کتاب اخیر</span>
                    </div>
                    <div class="space-y-2">
                        <?php if (empty($recentBooks)): ?>
                            <div class="p-6 text-center text-xs text-slate-500">هنوز کتابی در دیتابیس ثبت نشده است.</div>
                        <?php else: ?>
                            <?php foreach ($recentBooks as $b): ?>
                                <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                                    <div class="space-y-0.5">
                                        <div class="font-bold text-white flex items-center gap-2">
                                            <span><?php echo htmlspecialchars($b['title']); ?></span>
                                            <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                قفسه <?php echo htmlspecialchars($b['shelf_location']); ?>
                                            </span>
                                        </div>
                                        <span class="text-[10px] text-slate-400 block">نویسنده: <?php echo htmlspecialchars($b['author']); ?> • دسته‌بندی: <?php echo htmlspecialchars($b['category']); ?></span>
                                    </div>
                                    <div class="text-left font-mono">
                                        <span class="text-[10px] px-2 py-0.5 rounded <?php echo $b['available_copies'] > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'; ?>">
                                            <?php echo $b['available_copies']; ?> از <?php echo $b['total_copies']; ?> موجود
                                        </span>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Active Loans Preview -->
                <div class="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <h3 class="text-xs font-bold text-white flex items-center gap-2">
                            <span>🔄 امانات جاری و سررسید بازگشت</span>
                        </h3>
                        <span class="text-[10px] text-slate-400"><?php echo count($recentLoans); ?> مورد فعال</span>
                    </div>
                    <div class="space-y-2">
                        <?php if (empty($recentLoans)): ?>
                            <div class="p-6 text-center text-xs text-slate-500">در حال حاضر امانت فعالی ثبت نشده است.</div>
                        <?php else: ?>
                            <?php foreach ($recentLoans as $l): ?>
                                <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                                    <div class="space-y-0.5">
                                        <span class="font-bold text-white"><?php echo htmlspecialchars($l['book_title']); ?></span>
                                        <div class="text-[10px] text-slate-400 flex items-center gap-2">
                                            <span>امانت‌گیرنده: <strong class="text-slate-200"><?php echo htmlspecialchars($l['member_name']); ?></strong></span>
                                            <span class="dir-ltr text-cyan-400 font-mono"><?php echo htmlspecialchars($l['member_phone']); ?></span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="text-left font-mono text-[10px]">
                                            <span class="<?php echo $l['status'] === 'overdue' ? 'text-rose-400 font-bold' : 'text-slate-300'; ?>">
                                                سررسید: <?php echo htmlspecialchars($l['due_date']); ?>
                                            </span>
                                        </div>
                                        <?php if (!empty($l['member_phone'])): ?>
                                            <a href="tel:<?php echo htmlspecialchars($l['member_phone']); ?>" class="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="تماس">
                                                📞
                                            </a>
                                            <a href="sms:<?php echo htmlspecialchars($l['member_phone']); ?>?body=<?php echo urlencode('با سلام و احترام، موعد بازگشت کتاب «' . $l['book_title'] . '» فرارسیده است. لطفاً نسبت به تمدید یا تحویل آن به کتابخانه اقدام فرمایید.'); ?>" class="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" title="ارسال پیامک یادآوری">
                                                💬
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Export Full Backup Action Card -->
            <div class="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                    <h3 class="text-xs font-bold text-white">پشتیبان‌گیری کامل از داده‌های هاست (JSON Backup)</h3>
                    <p class="text-[11px] text-slate-400 mt-0.5">دریافت یک خروجی یکپارچه از تمام مخاطبین، فاکتورها، تراکنش‌ها و تیکت‌های موجود در دیتابیس هاست.</p>
                </div>
                <a href="?action=export_json" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-all shadow-lg shadow-cyan-600/20">
                    <span>⬇ دانلود نسخه پشتیبان JSON</span>
                </a>
            </div>
        <?php endif; ?>

        <!-- Setup & Reconfiguration Wizard Form -->
        <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl">
            <div class="border-b border-slate-800 pb-3">
                <h2 class="text-sm font-black text-white flex items-center gap-2">
                    <span>🛠 <?php echo $dbConnected ? 'ویرایش یا بازتنظیم اطلاعات دیتابیس و توکن' : 'نصب و راه‌اندازی سریع پایگاه داده MySQL'; ?></span>
                </h2>
                <p class="text-xs text-slate-400 mt-1">
                    <?php if ($dbConnected): ?>
                        دیتابیس در حال حاضر متصل است. در صورت نیاز به تغییر رمز عبور، دیتابیس یا کلید، فرم زیر را به‌روز کنید:
                    <?php else: ?>
                        مشخصات دیتابیسی که در کنترل‌پنل هاست (cPanel / DirectAdmin) ساخته‌اید را وارد کنید تا جداول به شکل خودکار ایجاد شوند:
                    <?php endif; ?>
                </p>
            </div>

            <!-- Pre-check System Specs -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <span class="text-[10px] text-slate-400 block">نسخه PHP سرور</span>
                    <span class="font-bold text-cyan-400 font-mono"><?php echo PHP_VERSION; ?></span>
                </div>
                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <span class="text-[10px] text-slate-400 block">اکستنشن PDO MySQL</span>
                    <span class="font-bold <?php echo extension_loaded('pdo_mysql') ? 'text-emerald-400' : 'text-rose-400'; ?>">
                        <?php echo extension_loaded('pdo_mysql') ? 'فعال ✓' : 'غیرفعال ✕'; ?>
                    </span>
                </div>
                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <span class="text-[10px] text-slate-400 block">پشتیبانی از cURL</span>
                    <span class="font-bold <?php echo extension_loaded('curl') ? 'text-emerald-400' : 'text-rose-400'; ?>">
                        <?php echo extension_loaded('curl') ? 'فعال ✓' : 'غیرفعال ✕'; ?>
                    </span>
                </div>
                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <span class="text-[10px] text-slate-400 block">دسترسی به فایل config</span>
                    <span class="font-bold <?php echo is_writable(__DIR__) || is_writable($configFile) ? 'text-emerald-400' : 'text-amber-400'; ?>">
                        <?php echo is_writable(__DIR__) || is_writable($configFile) ? 'قابل نوشتن ✓' : 'فقط خواندنی'; ?>
                    </span>
                </div>
            </div>

            <!-- Install Form -->
            <form method="POST" action="" class="space-y-4 pt-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1.5">آدرس سرور دیتابیس (Host)</label>
                        <input type="text" name="db_host" value="<?php echo htmlspecialchars(defined('DB_HOST') ? DB_HOST : 'localhost'); ?>" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs dir-ltr focus:outline-none focus:border-cyan-400">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1.5">نام دیتابیس (Database Name) *</label>
                        <input type="text" name="db_name" placeholder="مثلاً: cpaneluser_companion_db" value="<?php echo htmlspecialchars(defined('DB_NAME') && DB_NAME !== 'my_companion_db' ? DB_NAME : ''); ?>" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs dir-ltr focus:outline-none focus:border-cyan-400">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1.5">نام کاربری دیتابیس (User) *</label>
                        <input type="text" name="db_user" placeholder="مثلاً: cpaneluser_dbuser" value="<?php echo htmlspecialchars(defined('DB_USER') && DB_USER !== 'db_username' ? DB_USER : ''); ?>" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs dir-ltr focus:outline-none focus:border-cyan-400">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1.5">رمز عبور کاربر دیتابیس (Password)</label>
                        <input type="password" name="db_pass" placeholder="رمز عبور دیتابیس" value="<?php echo htmlspecialchars(defined('DB_PASS') && DB_PASS !== 'your_secure_password' ? DB_PASS : ''); ?>" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs dir-ltr focus:outline-none focus:border-cyan-400">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1.5">کلید امنیتی اتصال برنامه (API Secret Key) *</label>
                    <div class="flex items-center gap-2">
                        <input type="text" id="custom_api_key" name="api_key" value="<?php echo htmlspecialchars(defined('API_SECRET_KEY') ? API_SECRET_KEY : 'ANASH_' . bin2hex(random_bytes(6))); ?>" required class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs dir-ltr focus:outline-none focus:border-cyan-400">
                        <button type="button" onclick="generateRandomToken()" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0">
                            🎲 تولید کلید تصادفی
                        </button>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1">این کلید نقش رمز ورود برنامه گوشی به وب‌سرویس را دارد.</p>
                </div>

                <div class="pt-2">
                    <button type="submit" name="install_db" class="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2">
                        <span>⚡ ذخیره تنظیمات و ساخت خودکار جداول پایگاه داده</span>
                    </button>
                </div>
            </form>
        </div>

    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-850 bg-[#090e1a] text-center p-4 text-[11px] text-slate-500">
        دستیار همراه هوشمند آناش • نسخه ۲.۴.۰ • توسعه‌یافته برای هاست‌های لینوکسی اشتراکی (cPanel / DirectAdmin)
    </footer>

    <script>
        function copyToClipboard(elementId, btn) {
            const input = document.getElementById(elementId);
            input.select();
            input.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(input.value).then(() => {
                const orig = btn.innerText;
                btn.innerText = 'کپی شد ✓';
                btn.classList.add('bg-emerald-600');
                setTimeout(() => {
                    btn.innerText = orig;
                    btn.classList.remove('bg-emerald-600');
                }, 2000);
            });
        }

        function generateRandomToken() {
            const rand = 'ANASH_' + Math.random().toString(36).substring(2, 10).toUpperCase() + '_' + Math.floor(1000 + Math.random() * 9000);
            document.getElementById('custom_api_key').value = rand;
        }
    </script>
</body>
</html>
