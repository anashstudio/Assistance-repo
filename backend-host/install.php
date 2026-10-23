<?php
/**
 * Companion Assistant - Web Management Center & Installer
 * مرکز مدیریت جامع تحت‌وب، ورود اطلاعات از اکسل، مدیریت کتب و اعضا و تنظیمات سامانه
 * استودیو آناش • محمدرضا امیریوسفی
 */

session_start();

$configFile = __DIR__ . '/config.php';
$sqlFile = __DIR__ . '/database.sql';
$isConfigured = false;
$dbConnected = false;
$dbError = null;
$pdo = null;

// ۱. بررسی اتصال دیتابیس
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
$tab = $_GET['tab'] ?? 'dashboard';
$message = null;
$messageType = 'info';

// دانلود قالب‌های نمونه اکسل / CSV
if ($action === 'download_books_template') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="books_template.csv"');
    // UTF-8 BOM for Persian display in Excel
    echo "\xEF\xBB\xBF";
    echo "عنوان کتاب,نویسنده,مترجم,ناشر,کد کنگره,کد قفسه,سال چاپ,تعداد\n";
    echo "کلیدر,محمود دولت‌آبادی,,نشر چشمه,PZ3.D68 K5 1368,A-12,1368,3\n";
    echo "بیگانه,آلبر کامو,جلال آل‌احمد,نشر نگاه,PQ2605.A37 E8 1395,B-04,1395,2\n";
    echo "انسان خردمند,یووال نوح هراری,نیک گرگین,نشر نو,CB113.H37 1396,C-01,1396,5\n";
    exit;
}

if ($action === 'download_members_template') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="members_template.csv"');
    echo "\xEF\xBB\xBF";
    echo "شماره عضویت,نام و نام خانوادگی,کدملی,شماره همراه,ایمیل\n";
    echo "LIB-1001,علی رضایی,0012345678,09121112233,ali@example.com\n";
    echo "LIB-1002,مریم احمدی,0098765432,09192223344,maryam@example.com\n";
    exit;
}

// دانلود نسخه پشتیبان کلی JSON
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

// حذف تکی کتاب از پنل
if ($action === 'delete_book' && $dbConnected && $pdo && !empty($_GET['id'])) {
    $stmt = $pdo->prepare("DELETE FROM assistant_books WHERE id = :id");
    $stmt->execute([':id' => $_GET['id']]);
    $message = 'کتاب مورد نظر از سرور حذف شد.';
    $messageType = 'success';
    $tab = 'books';
}

// حذف تکی عضو از پنل
if ($action === 'delete_member' && $dbConnected && $pdo && !empty($_GET['id'])) {
    $stmt = $pdo->prepare("DELETE FROM assistant_members WHERE id = :id");
    $stmt->execute([':id' => $_GET['id']]);
    $message = 'عضو مورد نظر از پایگاه داده حذف شد.';
    $messageType = 'success';
    $tab = 'members';
}

// پردازش فرم‌ها
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ۱. نصب و راه‌اندازی دیتابیس
    if (isset($_POST['install_db'])) {
        $dbHost = trim($_POST['db_host'] ?? 'localhost');
        $dbName = trim($_POST['db_name'] ?? '');
        $dbUser = trim($_POST['db_user'] ?? '');
        $dbPass = trim($_POST['db_pass'] ?? '');
        $apiKey = trim($_POST['api_key'] ?? '');

        if (empty($dbName) || empty($dbUser) || empty($apiKey)) {
            $message = 'لطفاً نام دیتابیس، نام کاربری و کلید API را وارد کنید.';
            $messageType = 'error';
        } else {
            try {
                $testPdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);

                if (file_exists($sqlFile)) {
                    $sqlContent = file_get_contents($sqlFile);
                    $queries = array_filter(array_map('trim', explode(';', $sqlContent)));
                    foreach ($queries as $q) {
                        if (!empty($q)) {
                            $testPdo->exec($q);
                        }
                    }
                }

                $configContent = "<?php\n/**\n * Companion Assistant - Server Configuration\n * تنظیم‌شده خودکار توسط Web Panel\n */\n\ndefine('DB_HOST', '" . addslashes($dbHost) . "');\ndefine('DB_NAME', '" . addslashes($dbName) . "');\ndefine('DB_USER', '" . addslashes($dbUser) . "');\ndefine('DB_PASS', '" . addslashes($dbPass) . "');\ndefine('DB_CHARSET', 'utf8mb4');\n\ndefine('API_SECRET_KEY', '" . addslashes($apiKey) . "');\n\nini_set('display_errors', 0);\nerror_reporting(E_ALL);\n\nfunction getDbConnection() {\n    static \$pdo = null;\n    if (\$pdo === null) {\n        \$dsn = \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;\n        \$options = [\n            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n            PDO::ATTR_EMULATE_PREPARES => false,\n        ];\n        try {\n            \$pdo = new PDO(\$dsn, DB_USER, DB_PASS, \$options);\n        } catch (PDOException \$e) {\n            http_response_code(500);\n            echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . \$e->getMessage()], JSON_UNESCAPED_UNICODE);\n            exit;\n        }\n    }\n    return \$pdo;\n}\n";
                file_put_contents($configFile, $configContent);

                $message = 'تبریک! اتصال برقرار شد و تمام جداول دیتابیس آماده‌سازی گردیدند.';
                $messageType = 'success';
                $isConfigured = true;
                $dbConnected = true;
                $pdo = $testPdo;
            } catch (Exception $e) {
                $message = 'خطا در اتصال: ' . $e->getMessage();
                $messageType = 'error';
            }
        }
    }

    // ۲. ورود دسته‌جمعی کتب از اکسل / CSV
    if (isset($_POST['import_books_excel']) && $dbConnected && $pdo) {
        $tab = 'books';
        $csvText = '';
        if (!empty($_FILES['books_csv_file']['tmp_name'])) {
            $csvText = file_get_contents($_FILES['books_csv_file']['tmp_name']);
        } elseif (!empty($_POST['books_csv_paste'])) {
            $csvText = trim($_POST['books_csv_paste']);
        }

        if (empty($csvText)) {
            $message = 'فایلی برای آپلود انتخاب نشده یا متنی پیست نگردیده است.';
            $messageType = 'error';
        } else {
            // حذف BOM
            $csvText = preg_replace('/^\xEF\xBB\xBF/', '', $csvText);
            $lines = preg_split('/\r\n|\r|\n/', $csvText);
            $imported = 0;

            $stmt = $pdo->prepare("
                INSERT INTO assistant_books (id, title, author, translator, publisher, congress_code, shelf_location, publish_year, total_copies, available_copies, category, status, created_at, updated_at)
                VALUES (:id, :title, :author, :translator, :publisher, :congress_code, :shelf_location, :publish_year, :total_copies, :available_copies, 'عمومی', 'available', NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    author = VALUES(author),
                    translator = VALUES(translator),
                    publisher = VALUES(publisher),
                    congress_code = VALUES(congress_code),
                    shelf_location = VALUES(shelf_location),
                    publish_year = VALUES(publish_year),
                    total_copies = VALUES(total_copies),
                    available_copies = VALUES(available_copies),
                    updated_at = NOW()
            ");

            foreach ($lines as $i => $line) {
                if (empty(trim($line))) continue;
                $cols = str_getcsv($line);
                // رد کردن خط سربرگ (هدر)
                if ($i === 0 && (strpos($cols[0], 'عنوان') !== false || strpos(strtolower($cols[0]), 'title') !== false)) {
                    continue;
                }

                $title = trim($cols[0] ?? '');
                $author = trim($cols[1] ?? 'نامشخص');
                $translator = trim($cols[2] ?? '');
                $publisher = trim($cols[3] ?? '');
                $congressCode = trim($cols[4] ?? '');
                $shelfLoc = trim($cols[5] ?? 'A-1');
                $year = trim($cols[6] ?? '');
                $copies = (int)($cols[7] ?? 1);
                if ($copies <= 0) $copies = 1;

                if (!empty($title)) {
                    $bookId = 'book_' . md5($title . '_' . $author . '_' . $congressCode);
                    $stmt->execute([
                        ':id' => $bookId,
                        ':title' => $title,
                        ':author' => $author,
                        ':translator' => $translator ?: null,
                        ':publisher' => $publisher ?: null,
                        ':congress_code' => $congressCode ?: null,
                        ':shelf_location' => $shelfLoc ?: 'A-1',
                        ':publish_year' => $year ?: null,
                        ':total_copies' => $copies,
                        ':available_copies' => $copies,
                    ]);
                    $imported++;
                }
            }

            $message = "تعداد {$imported} کتاب با موفقیت از اکسل/CSV وارد پایگاه داده سرور شدند.";
            $messageType = 'success';
        }
    }

    // ۳. ثبت تکی کتاب جدید
    if (isset($_POST['add_single_book']) && $dbConnected && $pdo) {
        $tab = 'books';
        $title = trim($_POST['title'] ?? '');
        $author = trim($_POST['author'] ?? '');
        $translator = trim($_POST['translator'] ?? '');
        $publisher = trim($_POST['publisher'] ?? '');
        $congressCode = trim($_POST['congress_code'] ?? '');
        $shelfLoc = trim($_POST['shelf_location'] ?? 'A-1');
        $year = trim($_POST['publish_year'] ?? '');
        $copies = (int)($_POST['total_copies'] ?? 1);
        $category = trim($_POST['category'] ?? 'عمومی');

        if (empty($title)) {
            $message = 'نام کتاب الزامی است.';
            $messageType = 'error';
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO assistant_books (id, title, author, translator, publisher, congress_code, shelf_location, publish_year, total_copies, available_copies, category, status, created_at, updated_at)
                VALUES (:id, :title, :author, :translator, :publisher, :congress_code, :shelf_location, :publish_year, :total_copies, :available_copies, :category, 'available', NOW(), NOW())
            ");
            $bookId = 'book_' . uniqid('', true);
            $stmt->execute([
                ':id' => $bookId,
                ':title' => $title,
                ':author' => $author ?: 'نامشخص',
                ':translator' => $translator ?: null,
                ':publisher' => $publisher ?: null,
                ':congress_code' => $congressCode ?: null,
                ':shelf_location' => $shelfLoc ?: 'A-1',
                ':publish_year' => $year ?: null,
                ':total_copies' => $copies > 0 ? $copies : 1,
                ':available_copies' => $copies > 0 ? $copies : 1,
                ':category' => $category,
            ]);
            $message = 'کتاب جدید با موفقیت در کاتالوگ ثبت گردید.';
            $messageType = 'success';
        }
    }

    // ۴. ورود دسته‌جمعی اعضای کتابخانه از اکسل / CSV
    if (isset($_POST['import_members_excel']) && $dbConnected && $pdo) {
        $tab = 'members';
        $csvText = '';
        if (!empty($_FILES['members_csv_file']['tmp_name'])) {
            $csvText = file_get_contents($_FILES['members_csv_file']['tmp_name']);
        } elseif (!empty($_POST['members_csv_paste'])) {
            $csvText = trim($_POST['members_csv_paste']);
        }

        if (empty($csvText)) {
            $message = 'فایلی برای آپلود انتخاب نشده یا متنی پیست نگردیده است.';
            $messageType = 'error';
        } else {
            $csvText = preg_replace('/^\xEF\xBB\xBF/', '', $csvText);
            $lines = preg_split('/\r\n|\r|\n/', $csvText);
            $imported = 0;

            $stmt = $pdo->prepare("
                INSERT INTO assistant_members (id, membership_number, full_name, national_id, phone_number, email, membership_date, status, borrowed_count, created_at)
                VALUES (:id, :membership_number, :full_name, :national_id, :phone_number, :email, NOW(), 'active', 0, NOW())
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    national_id = VALUES(national_id),
                    phone_number = VALUES(phone_number),
                    email = VALUES(email)
            ");

            foreach ($lines as $i => $line) {
                if (empty(trim($line))) continue;
                $cols = str_getcsv($line);
                if ($i === 0 && (strpos($cols[0], 'شماره') !== false || strpos(strtolower($cols[0]), 'member') !== false)) {
                    continue;
                }

                $mNumber = trim($cols[0] ?? '');
                $fullName = trim($cols[1] ?? '');
                $nationalId = trim($cols[2] ?? '');
                $phone = trim($cols[3] ?? '');
                $email = trim($cols[4] ?? '');

                if (!empty($fullName)) {
                    if (empty($mNumber)) {
                        $mNumber = 'LIB-' . rand(1000, 9999);
                    }
                    $memId = 'mem_' . md5($mNumber . '_' . $phone);
                    $stmt->execute([
                        ':id' => $memId,
                        ':membership_number' => $mNumber,
                        ':full_name' => $fullName,
                        ':national_id' => $nationalId ?: null,
                        ':phone_number' => $phone,
                        ':email' => $email ?: null,
                    ]);
                    $imported++;
                }
            }

            $message = "تعداد {$imported} عضو با موفقیت از فایل اکسل/CSV در پنل ثبت شدند.";
            $messageType = 'success';
        }
    }

    // ۵. ثبت تکی عضو جدید در پنل
    if (isset($_POST['add_single_member']) && $dbConnected && $pdo) {
        $tab = 'members';
        $mNumber = trim($_POST['membership_number'] ?? '');
        $fullName = trim($_POST['full_name'] ?? '');
        $nationalId = trim($_POST['national_id'] ?? '');
        $phone = trim($_POST['phone_number'] ?? '');
        $email = trim($_POST['email'] ?? '');

        if (empty($fullName) || empty($phone)) {
            $message = 'نام و شماره تماس عضو الزامی است.';
            $messageType = 'error';
        } else {
            if (empty($mNumber)) {
                $mNumber = 'LIB-' . rand(1000, 9999);
            }
            $stmt = $pdo->prepare("
                INSERT INTO assistant_members (id, membership_number, full_name, national_id, phone_number, email, membership_date, status, borrowed_count, created_at)
                VALUES (:id, :membership_number, :full_name, :national_id, :phone_number, :email, NOW(), 'active', 0, NOW())
            ");
            $stmt->execute([
                ':id' => 'mem_' . uniqid('', true),
                ':membership_number' => $mNumber,
                ':full_name' => $fullName,
                ':national_id' => $nationalId ?: null,
                ':phone_number' => $phone,
                ':email' => $email ?: null,
            ]);
            $message = 'عضو جدید با موفقیت به سامانه افزوده شد.';
            $messageType = 'success';
        }
    }

    // ۶. ذخیره تنظیمات کلان سامانه
    if (isset($_POST['save_global_settings']) && $dbConnected && $pdo) {
        $tab = 'settings';
        $settingsToSave = [
            'app_title' => trim($_POST['app_title'] ?? 'دستیار همراه هوشمند آناش'),
            'default_loan_days' => trim($_POST['default_loan_days'] ?? '14'),
            'max_books_per_member' => trim($_POST['max_books_per_member'] ?? '3'),
            'sms_reminder_template' => trim($_POST['sms_reminder_template'] ?? ''),
            'enable_cloud_backup' => isset($_POST['enable_cloud_backup']) ? '1' : '0',
        ];

        $stmt = $pdo->prepare("
            INSERT INTO assistant_settings (setting_key, setting_value, updated_at)
            VALUES (:k, :v, NOW())
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        foreach ($settingsToSave as $k => $v) {
            $stmt->execute([':k' => $k, ':v' => $v]);
        }
        $message = 'تنظیمات سراسری سامانه با موفقیت در پایگاه داده هاست ذخیره گردید.';
        $messageType = 'success';
    }
}

// واکشی آمار و فهرست‌ها
$stats = ['contacts' => 0, 'transactions' => 0, 'tickets' => 0, 'books' => 0, 'members' => 0, 'loans' => 0];
$allBooks = [];
$allMembers = [];
$allLoans = [];
$globalSettings = [];

if ($dbConnected && $pdo) {
    try {
        $stats['contacts'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_contacts")->fetchColumn();
        $stats['transactions'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_transactions")->fetchColumn();
        $stats['tickets'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_tickets")->fetchColumn();
        $stats['books'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_books")->fetchColumn();
        $stats['members'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_members")->fetchColumn();
        $stats['loans'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_loans WHERE status = 'active' OR status = 'overdue'")->fetchColumn();

        $allBooks = $pdo->query("SELECT * FROM assistant_books ORDER BY created_at DESC LIMIT 100")->fetchAll();
        $allMembers = $pdo->query("SELECT * FROM assistant_members ORDER BY created_at DESC LIMIT 100")->fetchAll();
        $allLoans = $pdo->query("SELECT * FROM assistant_loans ORDER BY loan_date DESC LIMIT 50")->fetchAll();

        $rawSettings = $pdo->query("SELECT setting_key, setting_value FROM assistant_settings")->fetchAll(PDO::FETCH_KEY_PAIR);
        if ($rawSettings) $globalSettings = $rawSettings;
    } catch (Exception $e) {}
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$currentHost = $_SERVER['HTTP_HOST'] ?? 'yourdomain.com';
$currentDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
$apiEndpointUrl = $protocol . $currentHost . $currentDir . '/api.php';
$activeApiKey = defined('API_SECRET_KEY') ? API_SECRET_KEY : 'ANASH_KEY_2026';
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل مدیریت و راه‌اندازی سرور دستیار همراه</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
    <style>
        body { font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body class="bg-[#070b14] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-black">

    <!-- Header Bar -->
    <header class="border-b border-slate-800 bg-[#0c1220]/95 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-cyan-500/20">
                    A
                </div>
                <div>
                    <h1 class="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                        پنل مدیریت و وب‌سرویس دستیار همراه
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                            v2.4.0
                        </span>
                    </h1>
                    <p class="text-[10px] text-slate-400">استودیو آناش • محمدرضا امیریوسفی</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <?php if ($dbConnected): ?>
                    <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        دیتابیس متصل
                    </span>
                <?php else: ?>
                    <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                        نیاز به اتصال
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="border-b border-slate-800 bg-[#0a0f1c]">
        <div class="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5 text-xs font-bold">
            <a href="?tab=dashboard" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 <?php echo $tab === 'dashboard' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'; ?>">
                <span>📊 پیشخوان و آمار</span>
            </a>
            <a href="?tab=books" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 <?php echo $tab === 'books' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'; ?>">
                <span>📚 مدیریت کتب و ورود اکسل (<?php echo $stats['books']; ?>)</span>
            </a>
            <a href="?tab=members" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 <?php echo $tab === 'members' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'; ?>">
                <span>👥 اعضا و کاربران (<?php echo $stats['members']; ?>)</span>
            </a>
            <a href="?tab=loans" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 <?php echo $tab === 'loans' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'; ?>">
                <span>🔄 امانات کتاب (<?php echo $stats['loans']; ?>)</span>
            </a>
            <a href="?tab=settings" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 <?php echo $tab === 'settings' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'; ?>">
                <span>⚙ تنظیمات سامانه</span>
            </a>
            <a href="?tab=setup" class="px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 <?php echo $tab === 'setup' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'; ?>">
                <span>🔌 اتصال دیتابیس و توکن</span>
            </a>
        </div>
    </div>

    <!-- Main Container -->
    <main class="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">

        <!-- Notification Banner -->
        <?php if ($message): ?>
            <div class="p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg <?php echo $messageType === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'; ?>">
                <div class="flex items-center gap-2">
                    <span><?php echo $messageType === 'success' ? '✓' : '⚠'; ?></span>
                    <span><?php echo htmlspecialchars($message); ?></span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">✕</button>
            </div>
        <?php endif; ?>

        <!-- TAB 1: DASHBOARD & STATS -->
        <?php if ($tab === 'dashboard'): ?>
            <!-- Connection Endpoint Box -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                        <h2 class="text-sm font-black text-white">📲 اطلاعات وب‌سرویس همگام‌سازی اپلیکیشن</h2>
                        <p class="text-[11px] text-slate-400">این مشخصات را در برنامه گوشی در «ابزارها ← هاست و همگام‌سازی» قرار دهید:</p>
                    </div>
                    <a href="<?php echo htmlspecialchars($apiEndpointUrl . '?action=ping&key=' . urlencode($activeApiKey)); ?>" target="_blank" class="px-3 py-1 rounded-xl bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-bold text-center border border-cyan-500/30">
                        تست زنده API ↗
                    </a>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <span class="text-[10px] text-slate-400 block font-medium">آدرس API Endpoint:</span>
                        <div class="flex items-center gap-2">
                            <input type="text" id="api_url_input" readonly value="<?php echo htmlspecialchars($apiEndpointUrl); ?>" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-cyan-300 dir-ltr select-all">
                            <button onclick="copyToClipboard('api_url_input', this)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold">کپی</button>
                        </div>
                    </div>
                    <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <span class="text-[10px] text-slate-400 block font-medium">کلید امنیتی (API Secret Key):</span>
                        <div class="flex items-center gap-2">
                            <input type="text" id="api_key_input" readonly value="<?php echo htmlspecialchars($activeApiKey); ?>" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-amber-300 dir-ltr select-all">
                            <button onclick="copyToClipboard('api_key_input', this)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold">کپی</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 6 Stat Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">کتاب‌های کتابخانه</span>
                    <span class="text-2xl font-black text-amber-400 font-mono mt-0.5 block"><?php echo number_format($stats['books']); ?></span>
                    <span class="text-[9px] text-slate-500">عنوان در سرور</span>
                </div>
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">اعضا و کاربران</span>
                    <span class="text-2xl font-black text-teal-400 font-mono mt-0.5 block"><?php echo number_format($stats['members']); ?></span>
                    <span class="text-[9px] text-slate-500">کارت عضویت</span>
                </div>
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">امانات فعال</span>
                    <span class="text-2xl font-black text-rose-400 font-mono mt-0.5 block"><?php echo number_format($stats['loans']); ?></span>
                    <span class="text-[9px] text-slate-500">در دست مطالعه</span>
                </div>
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">مخاطبین گوشی</span>
                    <span class="text-2xl font-black text-cyan-400 font-mono mt-0.5 block"><?php echo number_format($stats['contacts']); ?></span>
                    <span class="text-[9px] text-slate-500">همگام‌شده</span>
                </div>
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">تراکنش‌های بانکی</span>
                    <span class="text-2xl font-black text-emerald-400 font-mono mt-0.5 block"><?php echo number_format($stats['transactions']); ?></span>
                    <span class="text-[9px] text-slate-500">پیامکی</span>
                </div>
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                    <span class="text-[11px] text-slate-400 block">تیکت‌های ارسالی</span>
                    <span class="text-2xl font-black text-indigo-400 font-mono mt-0.5 block"><?php echo number_format($stats['tickets']); ?></span>
                    <span class="text-[9px] text-slate-500">پشتیبانی</span>
                </div>
            </div>

            <!-- Export Backup -->
            <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 class="text-xs font-bold text-white">پشتیبان‌گیری کلی از داده‌های سرور (JSON Backup)</h3>
                    <p class="text-[10px] text-slate-400">دانلود یکجای تمامی کتب، اعضا، امانات، تراکنش‌ها و مخاطبین ذخیره‌شده در دیتابیس</p>
                </div>
                <a href="?action=export_json" class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs text-center transition-all">
                    ⬇ دانلود نسخه پشتیبان JSON
                </a>
            </div>
        <?php endif; ?>

        <!-- TAB 2: BOOKS & EXCEL BULK IMPORT -->
        <?php if ($tab === 'books'): ?>
            <!-- Excel / CSV Bulk Import Form -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                        <h2 class="text-sm font-black text-white flex items-center gap-2">
                            <span>📥 ورود دسته‌جمعی کتاب‌ها از اکسل یا فایل CSV</span>
                        </h2>
                        <p class="text-[11px] text-slate-400 mt-0.5">فایل اکسل کتب خود را آپلود کنید تا فوراً در دیتابیس ثبت شده و به اپلیکیشن گوشی ارسال شوند.</p>
                    </div>
                    <a href="?action=download_books_template" class="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30 text-xs font-bold text-center transition-all">
                        ⬇ دانلود قالب نمونه اکسل (CSV)
                    </a>
                </div>

                <form method="POST" enctype="multipart/form-data" class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                            <label class="block text-xs font-semibold text-slate-300">انتخاب فایل CSV یا اکسل ذخیره‌شده با فرمت CSV:</label>
                            <input type="file" name="books_csv_file" accept=".csv,.txt" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-xs font-semibold text-slate-300">یا متن ستون‌ها را اینجا پیست کنید (Comma Separated):</label>
                            <textarea name="books_csv_paste" rows="2" placeholder="عنوان کتاب,نویسنده,مترجم,ناشر,کد کنگره,کد قفسه,سال چاپ,تعداد" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 font-mono"></textarea>
                        </div>
                    </div>
                    <button type="submit" name="import_books_excel" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2">
                        <span>⚡ اجرای ورود دسته‌جمعی کتاب‌ها به پایگاه داده</span>
                    </button>
                </form>
            </div>

            <!-- Single Book Addition Form -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h3 class="text-xs font-bold text-white border-b border-slate-800 pb-2">ثبت تکی کتاب جدید</h3>
                <form method="POST" class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <label class="block text-slate-300 mb-1">نام کتاب *</label>
                        <input type="text" name="title" required placeholder="عنوان کتاب..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">نویسنده *</label>
                        <input type="text" name="author" required placeholder="نام نویسنده..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">مترجم</label>
                        <input type="text" name="translator" placeholder="نام مترجم (اختیاری)..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">ناشر</label>
                        <input type="text" name="publisher" placeholder="نام انتشارات..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    </div>

                    <div>
                        <label class="block text-slate-300 mb-1 font-bold text-indigo-300">کد رده‌بندی کنگره (LCC)</label>
                        <input type="text" name="congress_code" placeholder="مثال: PZ3.D68 K5" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-indigo-300 font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1 font-bold text-amber-300">کد قفسه فیزیکی</label>
                        <input type="text" name="shelf_location" placeholder="مثال: A-12 یا ردیف ۳" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">سال چاپ</label>
                        <input type="text" name="publish_year" placeholder="مثال: 1402" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">تعداد نسخه</label>
                        <input type="number" min="1" value="1" name="total_copies" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                    </div>

                    <div class="sm:col-span-4 flex justify-end">
                        <button type="submit" name="add_single_book" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                            ثبت کتاب در سرور
                        </button>
                    </div>
                </form>
            </div>

            <!-- Books Table -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 class="text-xs font-bold text-white">فهرست کتاب‌های ثبت‌شده در پایگاه داده (<?php echo count($allBooks); ?> مورد اخیر)</h3>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-right text-xs">
                        <thead class="text-[11px] text-slate-400 border-b border-slate-800 bg-slate-950/50">
                            <tr>
                                <th class="p-2.5">نام کتاب</th>
                                <th class="p-2.5">نویسنده</th>
                                <th class="p-2.5">مترجم</th>
                                <th class="p-2.5">ناشر</th>
                                <th class="p-2.5">کد کنگره</th>
                                <th class="p-2.5">کد قفسه</th>
                                <th class="p-2.5">موجودی</th>
                                <th class="p-2.5 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            <?php if (empty($allBooks)): ?>
                                <tr>
                                    <td colspan="8" class="p-6 text-center text-slate-500">هنوز کتابی در دیتابیس ثبت نشده است. از فرم‌های بالا فایل اکسل خود را آپلود کنید.</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($allBooks as $b): ?>
                                    <tr class="hover:bg-slate-800/40">
                                        <td class="p-2.5 font-bold text-white"><?php echo htmlspecialchars($b['title']); ?></td>
                                        <td class="p-2.5 text-slate-300"><?php echo htmlspecialchars($b['author']); ?></td>
                                        <td class="p-2.5 text-slate-400"><?php echo htmlspecialchars($b['translator'] ?? '-'); ?></td>
                                        <td class="p-2.5 text-slate-400"><?php echo htmlspecialchars($b['publisher'] ?? '-'); ?></td>
                                        <td class="p-2.5 font-mono text-indigo-300"><?php echo htmlspecialchars($b['congress_code'] ?? '-'); ?></td>
                                        <td class="p-2.5 font-mono text-amber-300"><?php echo htmlspecialchars($b['shelf_location']); ?></td>
                                        <td class="p-2.5 font-mono text-emerald-400"><?php echo $b['available_copies']; ?> از <?php echo $b['total_copies']; ?></td>
                                        <td class="p-2.5 text-center">
                                            <a href="?tab=books&action=delete_book&id=<?php echo urlencode($b['id']); ?>" onclick="return confirm('آیا از حذف این کتاب اطمینان دارید؟')" class="text-rose-400 hover:text-rose-300 font-bold">
                                                حذف
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>

        <!-- TAB 3: MEMBERS & EXCEL BULK IMPORT -->
        <?php if ($tab === 'members'): ?>
            <!-- Members Bulk Import Form -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                        <h2 class="text-sm font-black text-white flex items-center gap-2">
                            <span>👥 ورود دسته‌جمعی اعضای کتابخانه از اکسل یا فایل CSV</span>
                        </h2>
                        <p class="text-[11px] text-slate-400 mt-0.5">کاربران و اعضا فقط در پنل هاست تعریف می‌شوند و اپلیکیشن مشخصات آن‌ها را همگام‌سازی می‌نماید.</p>
                    </div>
                    <a href="?action=download_members_template" class="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-black border border-teal-500/30 text-xs font-bold text-center transition-all">
                        ⬇ دانلود قالب اکسل اعضا (CSV)
                    </a>
                </div>

                <form method="POST" enctype="multipart/form-data" class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                            <label class="block text-xs font-semibold text-slate-300">انتخاب فایل CSV اعضا:</label>
                            <input type="file" name="members_csv_file" accept=".csv,.txt" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-xs font-semibold text-slate-300">یا پیست محتوای ستون‌ها:</label>
                            <textarea name="members_csv_paste" rows="2" placeholder="شماره عضویت,نام و نام خانوادگی,کدملی,شماره همراه,ایمیل" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 font-mono"></textarea>
                        </div>
                    </div>
                    <button type="submit" name="import_members_excel" class="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2">
                        <span>⚡ ثبت دسته‌جمعی اعضا در پایگاه داده</span>
                    </button>
                </form>
            </div>

            <!-- Single Member Add -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h3 class="text-xs font-bold text-white border-b border-slate-800 pb-2">ثبت تکی عضو جدید در پنل</h3>
                <form method="POST" class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <label class="block text-slate-300 mb-1">شماره عضویت (اختیاری)</label>
                        <input type="text" name="membership_number" placeholder="مثال: LIB-1005" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">نام و نام خانوادگی *</label>
                        <input type="text" name="full_name" required placeholder="نام عضو..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">شماره تلفن همراه *</label>
                        <input type="text" name="phone_number" required placeholder="0912..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">کد ملی</label>
                        <input type="text" name="national_id" placeholder="کد ملی ده رقمی..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                    </div>

                    <div class="sm:col-span-4 flex justify-end">
                        <button type="submit" name="add_single_member" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all">
                            افزودن عضو
                        </button>
                    </div>
                </form>
            </div>

            <!-- Members List Table -->
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h3 class="text-xs font-bold text-white border-b border-slate-800 pb-2">فهرست اعضای ثبت‌شده در سرور (<?php echo count($allMembers); ?> عضو)</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-right text-xs">
                        <thead class="text-[11px] text-slate-400 border-b border-slate-800 bg-slate-950/50">
                            <tr>
                                <th class="p-2.5">شماره عضویت</th>
                                <th class="p-2.5">نام و نام خانوادگی</th>
                                <th class="p-2.5">شماره تماس</th>
                                <th class="p-2.5">کد ملی</th>
                                <th class="p-2.5">کتاب در دست امانت</th>
                                <th class="p-2.5 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            <?php if (empty($allMembers)): ?>
                                <tr>
                                    <td colspan="6" class="p-6 text-center text-slate-500">هیچ عضوی در سرور ثبت نشده است. از فرم بالا اکسل اعضا را ایمپورت کنید.</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($allMembers as $m): ?>
                                    <tr class="hover:bg-slate-800/40">
                                        <td class="p-2.5 font-mono text-cyan-300 font-bold"><?php echo htmlspecialchars($m['membership_number']); ?></td>
                                        <td class="p-2.5 font-bold text-white"><?php echo htmlspecialchars($m['full_name']); ?></td>
                                        <td class="p-2.5 font-mono text-slate-300 dir-ltr text-right"><?php echo htmlspecialchars($m['phone_number']); ?></td>
                                        <td class="p-2.5 font-mono text-slate-400"><?php echo htmlspecialchars($m['national_id'] ?? '-'); ?></td>
                                        <td class="p-2.5 font-mono text-amber-400"><?php echo $m['borrowed_count']; ?> جلد</td>
                                        <td class="p-2.5 text-center">
                                            <a href="?tab=members&action=delete_member&id=<?php echo urlencode($m['id']); ?>" onclick="return confirm('آیا از حذف این عضو اطمینان دارید؟')" class="text-rose-400 hover:text-rose-300 font-bold">
                                                حذف
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>

        <!-- TAB 4: LOANS & CIRCULATION -->
        <?php if ($tab === 'loans'): ?>
            <div class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 class="text-xs font-bold text-white">فهرست امانات و گردش کتاب‌ها (<?php echo count($allLoans); ?> امانت)</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-right text-xs">
                        <thead class="text-[11px] text-slate-400 border-b border-slate-800 bg-slate-950/50">
                            <tr>
                                <th class="p-2.5">عنوان کتاب</th>
                                <th class="p-2.5">نام امانت‌گیرنده</th>
                                <th class="p-2.5">شماره همراه</th>
                                <th class="p-2.5">تاریخ امانت</th>
                                <th class="p-2.5">موعد تحویل</th>
                                <th class="p-2.5">وضعیت</th>
                                <th class="p-2.5 text-center">تماس / پیامک</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            <?php if (empty($allLoans)): ?>
                                <tr>
                                    <td colspan="7" class="p-6 text-center text-slate-500">امانتی در سرور ثبت نشده است. ثبت امانات از طریق اپلیکیشن موبایل صورت می‌گیرد.</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($allLoans as $l): ?>
                                    <tr class="hover:bg-slate-800/40">
                                        <td class="p-2.5 font-bold text-white"><?php echo htmlspecialchars($l['book_title']); ?></td>
                                        <td class="p-2.5 text-slate-200"><?php echo htmlspecialchars($l['member_name']); ?></td>
                                        <td class="p-2.5 font-mono text-cyan-300 dir-ltr text-right"><?php echo htmlspecialchars($l['member_phone']); ?></td>
                                        <td class="p-2.5 font-mono text-slate-400"><?php echo htmlspecialchars($l['loan_date']); ?></td>
                                        <td class="p-2.5 font-mono <?php echo $l['status'] === 'overdue' ? 'text-rose-400 font-bold' : 'text-amber-300'; ?>">
                                            <?php echo htmlspecialchars($l['due_date']); ?>
                                        </td>
                                        <td class="p-2.5">
                                            <span class="text-[10px] px-2 py-0.5 rounded <?php echo $l['status'] === 'overdue' ? 'bg-rose-500/20 text-rose-300' : ($l['status'] === 'returned' ? 'bg-slate-800 text-slate-400' : 'bg-cyan-500/20 text-cyan-300'); ?>">
                                                <?php echo $l['status'] === 'overdue' ? 'دارای دیرکرد' : ($l['status'] === 'returned' ? 'بازگشت داده شده' : 'در دست مطالعه'); ?>
                                            </span>
                                        </td>
                                        <td class="p-2.5 text-center">
                                            <?php if (!empty($l['member_phone'])): ?>
                                                <a href="tel:<?php echo htmlspecialchars($l['member_phone']); ?>" class="p-1 rounded bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 mx-1" title="تماس">📞</a>
                                                <a href="sms:<?php echo htmlspecialchars($l['member_phone']); ?>?body=<?php echo urlencode('با سلام، موعد بازگشت کتاب «' . $l['book_title'] . '» فرارسیده است.'); ?>" class="p-1 rounded bg-slate-800 hover:bg-indigo-600/30 text-indigo-400 mx-1" title="پیامک">💬</a>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>

        <!-- TAB 5: GLOBAL SETTINGS -->
        <?php if ($tab === 'settings'): ?>
            <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div class="border-b border-slate-800 pb-3">
                    <h2 class="text-sm font-black text-white flex items-center gap-2">
                        <span>⚙ مرکز مدیریت تنظیمات کلان سامانه و اپلیکیشن</span>
                    </h2>
                    <p class="text-xs text-slate-400 mt-1">
                        تنظیمات اصلی و قوانین سیستم کتابخانه و اپلیکیشن در این بخش مدیریت می‌شوند.
                    </p>
                </div>

                <form method="POST" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-slate-300 mb-1.5 font-semibold">عنوان برند و سامانه</label>
                            <input type="text" name="app_title" value="<?php echo htmlspecialchars($globalSettings['app_title'] ?? 'دستیار همراه هوشمند آناش'); ?>" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1.5 font-semibold">مدت پیش‌فرض امانت کتاب (روزها)</label>
                            <input type="number" min="1" max="90" name="default_loan_days" value="<?php echo htmlspecialchars($globalSettings['default_loan_days'] ?? '14'); ?>" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1.5 font-semibold">سقف تعداد کتاب مجاز در دست هر عضو</label>
                            <input type="number" min="1" max="15" name="max_books_per_member" value="<?php echo htmlspecialchars($globalSettings['max_books_per_member'] ?? '3'); ?>" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1.5 font-semibold">پشتیبان‌گیری خودکار ابری</label>
                            <label class="flex items-center gap-2 mt-2 cursor-pointer">
                                <input type="checkbox" name="enable_cloud_backup" value="1" <?php echo ($globalSettings['enable_cloud_backup'] ?? '1') === '1' ? 'checked' : ''; ?> class="rounded bg-slate-950 border-slate-700 text-cyan-500 w-4 h-4">
                                <span class="text-slate-300">پشتیبان‌گیری دوره‌ای از داده‌ها در هاست فعال باشد</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-slate-300 mb-1.5 font-semibold">متن پیش‌فرض قالب پیامک یادآوری استرداد کتاب</label>
                        <textarea name="sms_reminder_template" rows="3" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600"><?php echo htmlspecialchars($globalSettings['sms_reminder_template'] ?? 'با سلام و احترام، موعد بازگشت کتاب به کتابخانه فرارسیده است. لطفاً جهت استرداد یا تمدید اقدام فرمایید.'); ?></textarea>
                    </div>

                    <div class="pt-2">
                        <button type="submit" name="save_global_settings" class="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-600/30">
                            ذخیره تنظیمات سامانه
                        </button>
                    </div>
                </form>
            </div>
        <?php endif; ?>

        <!-- TAB 6: DB SETUP & RECONFIGURATION -->
        <?php if ($tab === 'setup'): ?>
            <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div class="border-b border-slate-800 pb-3">
                    <h2 class="text-sm font-black text-white">پیکربندی اتصال دیتابیس MySQL و کلید امنیتی</h2>
                    <p class="text-xs text-slate-400 mt-1">مشخصات پایگاه داده cPanel یا DirectAdmin خود را وارد کنید:</p>
                </div>

                <form method="POST" action="?tab=setup" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1.5">سرور دیتابیس (Host)</label>
                            <input type="text" name="db_host" value="<?php echo htmlspecialchars(defined('DB_HOST') ? DB_HOST : 'localhost'); ?>" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1.5">نام دیتابیس (Database Name) *</label>
                            <input type="text" name="db_name" value="<?php echo htmlspecialchars(defined('DB_NAME') && DB_NAME !== 'my_companion_db' ? DB_NAME : ''); ?>" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1.5">نام کاربری (User) *</label>
                            <input type="text" name="db_user" value="<?php echo htmlspecialchars(defined('DB_USER') && DB_USER !== 'db_username' ? DB_USER : ''); ?>" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1.5">رمز عبور (Password)</label>
                            <input type="password" name="db_pass" value="<?php echo htmlspecialchars(defined('DB_PASS') && DB_PASS !== 'your_secure_password' ? DB_PASS : ''); ?>" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-300 mb-1.5">کلید امنیتی اتصال اپلیکیشن (API Secret Key) *</label>
                        <div class="flex items-center gap-2">
                            <input type="text" id="custom_api_key" name="api_key" value="<?php echo htmlspecialchars(defined('API_SECRET_KEY') ? API_SECRET_KEY : 'ANASH_' . bin2hex(random_bytes(6))); ?>" required class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono dir-ltr">
                            <button type="button" onclick="generateRandomToken()" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0">🎲 کلید جدید</button>
                        </div>
                    </div>

                    <div class="pt-2">
                        <button type="submit" name="install_db" class="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition-all shadow-lg shadow-cyan-600/30">
                            ⚡ ذخیره تنظیمات و ایجاد خودکار ۸ جدول پایگاه داده
                        </button>
                    </div>
                </form>
            </div>
        <?php endif; ?>

    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-800 bg-[#090e1a] text-center p-3 text-[10px] text-slate-500">
        پنل تحت‌وب دستیار همراه هوشمند آناش • نسخه ۲.۴.۰ • هماهنگ با هاست‌های اشتراکی لینوکس (cPanel / DirectAdmin)
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
