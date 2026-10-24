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
            autoMigrateDatabase($pdo);
        } catch (Exception $e) {
            $dbError = $e->getMessage();
        }
    }
}

/**
 * بروزرسانی خودکار ساختار جداول دیتابیس (جلوگیری از خطای ستون‌های ناشناخته)
 */
function autoMigrateDatabase($pdo) {
    if (!$pdo) return;
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM assistant_books")->fetchAll(PDO::FETCH_COLUMN);
        if ($cols && count($cols) > 0) {
            if (!in_array('translator', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `translator` varchar(255) DEFAULT NULL AFTER `author`");
            }
            if (!in_array('publisher', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `publisher` varchar(255) DEFAULT NULL AFTER `translator`");
            }
            if (!in_array('congress_code', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `congress_code` varchar(64) DEFAULT NULL AFTER `publisher`");
            }
            if (!in_array('publish_year', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `publish_year` varchar(32) DEFAULT NULL AFTER `congress_code`");
            }
            if (!in_array('isbn', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `isbn` varchar(64) DEFAULT NULL AFTER `publish_year`");
            }
            if (!in_array('shelf_location', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `shelf_location` varchar(128) NOT NULL DEFAULT 'A-1' AFTER `category`");
            }
            if (!in_array('total_copies', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `total_copies` int(11) NOT NULL DEFAULT 1 AFTER `shelf_location`");
            }
            if (!in_array('available_copies', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `available_copies` int(11) NOT NULL DEFAULT 1 AFTER `total_copies`");
            }
            if (!in_array('category', $cols)) {
                $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `category` varchar(64) NOT NULL DEFAULT 'عمومی' AFTER `publish_year`");
            }
        }
    } catch (Exception $e) {}

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `assistant_settings` (
              `setting_key` varchar(64) NOT NULL,
              `setting_value` longtext DEFAULT NULL,
              `updated_at` datetime NOT NULL,
              PRIMARY KEY (`setting_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $e) {}

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `assistant_books` (
              `id` varchar(64) NOT NULL,
              `title` varchar(255) NOT NULL,
              `author` varchar(255) NOT NULL,
              `translator` varchar(255) DEFAULT NULL,
              `publisher` varchar(255) DEFAULT NULL,
              `congress_code` varchar(64) DEFAULT NULL,
              `publish_year` varchar(32) DEFAULT NULL,
              `isbn` varchar(64) DEFAULT NULL,
              `category` varchar(64) NOT NULL DEFAULT 'عمومی',
              `shelf_location` varchar(128) NOT NULL DEFAULT 'A-1',
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
        ");
    } catch (Exception $e) {}
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
    if (isset($_POST['import_books_excel'])) {
        $tab = 'books';
        if (!$dbConnected || !$pdo) {
            $message = 'اتصال به دیتابیس برقرار نیست! لطفاً ابتدا از تب «اتصال دیتابیس و توکن» پایگاه داده را پیکربندی نمایید.';
            $messageType = 'error';
        } else {
            $csvText = '';
            if (!empty($_FILES['books_csv_file']['tmp_name']) && is_uploaded_file($_FILES['books_csv_file']['tmp_name'])) {
                $csvText = file_get_contents($_FILES['books_csv_file']['tmp_name']);
            } elseif (!empty($_POST['books_csv_paste'])) {
                $csvText = trim($_POST['books_csv_paste']);
            }

            if (empty(trim($csvText))) {
                $message = 'فایلی برای آپلود انتخاب نشده یا متنی در کادر پیست نگردیده است.';
                $messageType = 'error';
            } else {
                try {
                    autoMigrateDatabase($pdo);
                    // حذف BOM و نرمال‌سازی انتهای خطوط
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
                        $line = trim($line);
                        if (empty($line)) continue;

                        // تشخیص هوشمند جداکننده (کاما، سمیکالن، تب، پایپ)
                        $delims = [',', ';', "\t", '|'];
                        $bestDelim = ',';
                        $bestCount = 0;
                        foreach ($delims as $d) {
                            $cnt = substr_count($line, $d);
                            if ($cnt > $bestCount) {
                                $bestCount = $cnt;
                                $bestDelim = $d;
                            }
                        }

                        $cols = str_getcsv($line, $bestDelim);
                        if (empty($cols) || empty(trim($cols[0] ?? ''))) continue;

                        // رد کردن خط سربرگ در سطر اول
                        if ($i === 0) {
                            $h = mb_strtolower(trim($cols[0]));
                            if (strpos($h, 'عنوان') !== false || strpos($h, 'کتاب') !== false || strpos($h, 'title') !== false || strpos($h, 'ردیف') !== false) {
                                continue;
                            }
                        }

                        $title = trim($cols[0] ?? '', " \t\n\r\0\x0B\"'");
                        $author = trim($cols[1] ?? '', " \t\n\r\0\x0B\"'");
                        if (empty($author)) $author = 'نامشخص';
                        $translator = trim($cols[2] ?? '', " \t\n\r\0\x0B\"'");
                        $publisher = trim($cols[3] ?? '', " \t\n\r\0\x0B\"'");
                        $congressCode = trim($cols[4] ?? '', " \t\n\r\0\x0B\"'");
                        $shelfLoc = trim($cols[5] ?? '', " \t\n\r\0\x0B\"'");
                        if (empty($shelfLoc)) $shelfLoc = 'A-1';
                        $year = trim($cols[6] ?? '', " \t\n\r\0\x0B\"'");
                        $copiesRaw = trim($cols[7] ?? '1');
                        $copies = (int)preg_replace('/[^0-9]/', '', str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'], ['0','1','2','3','4','5','6','7','8','9'], $copiesRaw));
                        if ($copies <= 0) $copies = 1;

                        if (!empty($title)) {
                            $bookId = 'book_' . md5($title . '_' . $author . '_' . $congressCode . '_' . $shelfLoc);
                            $stmt->execute([
                                ':id' => $bookId,
                                ':title' => $title,
                                ':author' => $author,
                                ':translator' => $translator ?: null,
                                ':publisher' => $publisher ?: null,
                                ':congress_code' => $congressCode ?: null,
                                ':shelf_location' => $shelfLoc,
                                ':publish_year' => $year ?: null,
                                ':total_copies' => $copies,
                                ':available_copies' => $copies,
                            ]);
                            $imported++;
                        }
                    }

                    $message = "تعداد {$imported} کتاب با موفقیت از فایل اکسل/CSV وارد پایگاه داده سرور شدند.";
                    $messageType = 'success';
                } catch (Exception $e) {
                    $message = 'خطا در پردازش یا ثبت کتب اکسل: ' . $e->getMessage();
                    $messageType = 'error';
                }
            }
        }
    }

    // ۳. ثبت تکی کتاب جدید در پنل
    if (isset($_POST['add_single_book'])) {
        $tab = 'books';
        if (!$dbConnected || !$pdo) {
            $message = 'اتصال به دیتابیس برقرار نیست! لطفاً ابتدا از تب «اتصال دیتابیس و توکن» پایگاه داده را پیکربندی نمایید.';
            $messageType = 'error';
        } else {
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
                $message = 'عنوان کتاب الزامی است.';
                $messageType = 'error';
            } else {
                try {
                    autoMigrateDatabase($pdo);
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
                        ':category' => $category ?: 'عمومی',
                    ]);
                    $message = "کتاب «{$title}» با موفقیت در کاتالوگ سرور ثبت گردید.";
                    $messageType = 'success';
                } catch (Exception $e) {
                    $message = 'خطا در ثبت کتاب در دیتابیس: ' . $e->getMessage();
                    $messageType = 'error';
                }
            }
        }
    }

    // ۴. ورود دسته‌جمعی اعضای کتابخانه از اکسل / CSV
    if (isset($_POST['import_members_excel'])) {
        $tab = 'members';
        if (!$dbConnected || !$pdo) {
            $message = 'اتصال به دیتابیس برقرار نیست! لطفاً ابتدا از تب «اتصال دیتابیس و توکن» پایگاه داده را متصل نمایید.';
            $messageType = 'error';
        } else {
            $csvText = '';
            if (!empty($_FILES['members_csv_file']['tmp_name']) && is_uploaded_file($_FILES['members_csv_file']['tmp_name'])) {
                $csvText = file_get_contents($_FILES['members_csv_file']['tmp_name']);
            } elseif (!empty($_POST['members_csv_paste'])) {
                $csvText = trim($_POST['members_csv_paste']);
            }

            if (empty(trim($csvText))) {
                $message = 'فایلی برای آپلود انتخاب نشده یا متنی در کادر پیست نگردیده است.';
                $messageType = 'error';
            } else {
                try {
                    autoMigrateDatabase($pdo);
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
                        $line = trim($line);
                        if (empty($line)) continue;

                        $delims = [',', ';', "\t", '|'];
                        $bestDelim = ',';
                        $bestCount = 0;
                        foreach ($delims as $d) {
                            $cnt = substr_count($line, $d);
                            if ($cnt > $bestCount) {
                                $bestCount = $cnt;
                                $bestDelim = $d;
                            }
                        }

                        $cols = str_getcsv($line, $bestDelim);
                        if (empty($cols) || empty(trim($cols[0] ?? ''))) continue;

                        if ($i === 0) {
                            $h = mb_strtolower(trim($cols[0]));
                            if (strpos($h, 'شماره') !== false || strpos($h, 'member') !== false || strpos($h, 'نام') !== false) {
                                continue;
                            }
                        }

                        $mNumber = trim($cols[0] ?? '', " \t\n\r\0\x0B\"'");
                        $fullName = trim($cols[1] ?? '', " \t\n\r\0\x0B\"'");
                        $nationalId = trim($cols[2] ?? '', " \t\n\r\0\x0B\"'");
                        $phone = trim($cols[3] ?? '', " \t\n\r\0\x0B\"'");
                        $email = trim($cols[4] ?? '', " \t\n\r\0\x0B\"'");

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
                } catch (Exception $e) {
                    $message = 'خطا در ثبت اعضای اکسل: ' . $e->getMessage();
                    $messageType = 'error';
                }
            }
        }
    }

    // ۵. ثبت تکی عضو جدید در پنل
    if (isset($_POST['add_single_member'])) {
        $tab = 'members';
        if (!$dbConnected || !$pdo) {
            $message = 'اتصال به دیتابیس برقرار نیست! لطفاً ابتدا از تب «اتصال دیتابیس و توکن» پایگاه داده را متصل نمایید.';
            $messageType = 'error';
        } else {
            $mNumber = trim($_POST['membership_number'] ?? '');
            $fullName = trim($_POST['full_name'] ?? '');
            $nationalId = trim($_POST['national_id'] ?? '');
            $phone = trim($_POST['phone_number'] ?? '');
            $email = trim($_POST['email'] ?? '');

            if (empty($fullName) || empty($phone)) {
                $message = 'نام و شماره تماس عضو الزامی است.';
                $messageType = 'error';
            } else {
                try {
                    autoMigrateDatabase($pdo);
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
                } catch (Exception $e) {
                    $message = 'خطا در ثبت عضو: ' . $e->getMessage();
                    $messageType = 'error';
                }
            }
        }
    }

    // ۶. ذخیره تنظیمات کلان سامانه و هویت بصری اپلیکیشن
    if (isset($_POST['save_global_settings']) && $dbConnected && $pdo) {
        $tab = 'settings';
        $settingsToSave = [
            'app_title' => trim($_POST['app_title'] ?? 'دستیار همراه هوشمند آناش'),
            'app_icon' => trim($_POST['app_icon'] ?? ''),
            'app_theme_mode' => trim($_POST['app_theme_mode'] ?? 'dark'),
            'app_accent_color' => trim($_POST['app_accent_color'] ?? 'cyan'),
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
        $message = 'تنظیمات سراسری سامانه و هویت ظاهری اپلیکیشن با موفقیت ذخیره شد و در اپلیکیشن همگام خواهد شد.';
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
            <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6">
                <div class="border-b border-slate-800 pb-3">
                    <h2 class="text-sm font-black text-white flex items-center gap-2">
                        <span>⚙ مرکز مدیریت تنظیمات کلان، هویت بصری و اپلیکیشن</span>
                    </h2>
                    <p class="text-xs text-slate-400 mt-1">
                        آیکون اپلیکیشن، رنگ‌بندی شاخص، تم و قوانین عمومی سامانه و کتابخانه در این بخش مدیریت می‌شوند.
                    </p>
                </div>

                <form method="POST" class="space-y-6 text-xs">
                    <!-- SECTION A: VISUAL IDENTITY & APP ICON -->
                    <div class="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                            <div class="flex items-center gap-2">
                                <span class="text-base">🎨</span>
                                <h3 class="font-bold text-white text-xs sm:text-sm">هویت بصری، نشان تجاری و آیکون اپلیکیشن</h3>
                            </div>
                            <span class="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                                مدیریت انحصاری از پنل
                            </span>
                        </div>

                        <div class="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-[11px] leading-relaxed">
                            💡 <strong>سیاست یکپارچگی نشان:</strong> دکمه و ابزار تغییر آیکون از محیط اپلیکیشن حذف شده و انتخاب نشان تجاری منحصراً از این پنل کنترل می‌شود. با ذخیره در این بخش، تمام دستگاه‌ها بلافاصله نشان و تم هماهنگ را نمایش می‌دهند.
                        </div>

                        <!-- Current Icon Live Preview & Preset Selection -->
                        <div>
                            <label class="block text-slate-300 mb-2 font-semibold">انتخاب از الگوهای لوکس آیکون یا درج نشان اختصاصی:</label>
                            
                            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                                <!-- Preset 1 -->
                                <button type="button" onclick="selectPresetIcon(1)" class="group p-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500 transition-all text-center flex flex-col items-center gap-2">
                                    <div class="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-cyan-400 to-indigo-500 shadow-md">
                                        <div class="w-full h-full bg-[#090f1d] rounded-[10px] flex items-center justify-center font-black text-cyan-300 text-lg">A</div>
                                    </div>
                                    <span class="text-[10px] text-slate-300 group-hover:text-cyan-300 font-semibold">نشان استودیو آناش</span>
                                </button>

                                <!-- Preset 2 -->
                                <button type="button" onclick="selectPresetIcon(2)" class="group p-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-emerald-500 transition-all text-center flex flex-col items-center gap-2">
                                    <div class="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-md">
                                        <div class="w-full h-full bg-[#04120e] rounded-[10px] flex items-center justify-center text-emerald-400 text-lg font-mono">✦</div>
                                    </div>
                                    <span class="text-[10px] text-slate-300 group-hover:text-emerald-300 font-semibold">سایبر زمردی</span>
                                </button>

                                <!-- Preset 3 -->
                                <button type="button" onclick="selectPresetIcon(3)" class="group p-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-amber-500 transition-all text-center flex flex-col items-center gap-2">
                                    <div class="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-amber-400 to-yellow-600 shadow-md">
                                        <div class="w-full h-full bg-[#161005] rounded-[10px] flex items-center justify-center font-black text-amber-300 text-lg">A</div>
                                    </div>
                                    <span class="text-[10px] text-slate-300 group-hover:text-amber-300 font-semibold">طلایی لوکس</span>
                                </button>

                                <!-- Preset 4 -->
                                <button type="button" onclick="selectPresetIcon(4)" class="group p-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-purple-500 transition-all text-center flex flex-col items-center gap-2">
                                    <div class="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-purple-400 to-pink-500 shadow-md">
                                        <div class="w-full h-full bg-[#14051a] rounded-[10px] flex items-center justify-center text-purple-300 text-lg">★</div>
                                    </div>
                                    <span class="text-[10px] text-slate-300 group-hover:text-purple-300 font-semibold">نئون ارغوانی</span>
                                </button>

                                <!-- Preset 5 -->
                                <button type="button" onclick="selectPresetIcon(5)" class="group p-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-sky-500 transition-all text-center flex flex-col items-center gap-2">
                                    <div class="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-sky-400 to-blue-600 shadow-md">
                                        <div class="w-full h-full bg-[#061226] rounded-[10px] flex items-center justify-center text-sky-300 text-lg">📖</div>
                                    </div>
                                    <span class="text-[10px] text-slate-300 group-hover:text-sky-300 font-semibold">کتابخانه و دانش</span>
                                </button>
                            </div>

                            <!-- Icon URL / SVG Data Input & Live Box -->
                            <div class="flex items-start gap-4">
                                <div class="w-16 h-16 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 shrink-0 shadow-lg shadow-cyan-500/20">
                                    <img id="icon_live_preview" src="<?php echo htmlspecialchars(!empty($globalSettings['app_icon']) ? $globalSettings['app_icon'] : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="26" fill="%23090f1d"/><text x="50" y="65" font-family="sans-serif" font-weight="900" font-size="44" text-anchor="middle" fill="%2306b6d4">A</text></svg>'); ?>" alt="Preview" class="w-full h-full object-cover rounded-[14px] bg-slate-950">
                                </div>
                                <div class="flex-1 space-y-1">
                                    <label class="block text-slate-300 font-semibold">محتوای آیکون (Data URL تصویر یا SVG یا آدرس اینترنتی):</label>
                                    <input type="text" id="app_icon_input" name="app_icon" value="<?php echo htmlspecialchars($globalSettings['app_icon'] ?? ''); ?>" placeholder="با کلیک روی گزینه‌های بالا پر می‌شود یا آدرس تصویر را وارد کنید" oninput="updateIconPreview(this.value)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-[11px] dir-ltr">
                                    <p class="text-[10px] text-slate-400">می‌توانید آدرس هر فایل PNG، WebP یا کدهای SVG استاندارد را در این فیلد قرار دهید.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Theme & Accent Dropdowns -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                            <div>
                                <label class="block text-slate-300 mb-1.5 font-semibold">تم ظاهری کلی اپلیکیشن:</label>
                                <select name="app_theme_mode" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium">
                                    <?php 
                                    $currTheme = $globalSettings['app_theme_mode'] ?? 'dark';
                                    $themes = [
                                        'dark' => 'شبانه تیره استاندارد (Dark)',
                                        'oled' => 'آمولد مشکی خالص (OLED Black)',
                                        'light' => 'روز روشن و شفاف (Light)',
                                        'cyber' => 'سایبر نئون با کنتراست بالا (Cyberpunk)',
                                    ];
                                    foreach ($themes as $tk => $tv):
                                    ?>
                                        <option value="<?php echo $tk; ?>" <?php echo $currTheme === $tk ? 'selected' : ''; ?>>
                                            <?php echo $tv; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div>
                                <label class="block text-slate-300 mb-1.5 font-semibold">رنگ شاخص و هایلایت‌ها (Accent Color):</label>
                                <select name="app_accent_color" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium">
                                    <?php 
                                    $currAccent = $globalSettings['app_accent_color'] ?? 'cyan';
                                    $accents = [
                                        'cyan' => 'فیروزه‌ای نئون (Cyan)',
                                        'emerald' => 'زمردی باطراوت (Emerald)',
                                        'indigo' => 'ایندیگو ملوکانه (Indigo)',
                                        'amber' => 'کهربایی طلایی (Amber)',
                                        'rose' => 'یاقوتی سرخ (Rose)',
                                        'violet' => 'بنفش کریستالی (Violet)',
                                        'sky' => 'آبی آسمانی (Sky)',
                                    ];
                                    foreach ($accents as $ak => $av):
                                    ?>
                                        <option value="<?php echo $ak; ?>" <?php echo $currAccent === $ak ? 'selected' : ''; ?>>
                                            <?php echo $av; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- SECTION B: GENERAL & LIBRARY SETTINGS -->
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

                    <div class="pt-2 flex items-center gap-3">
                        <button type="submit" name="save_global_settings" class="px-7 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-600/30">
                            💾 ذخیره تنظیمات سامانه و اعمال هویت بصری
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

        const PRESET_ICONS = {
            1: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="50%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%238b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%23090f1d"/><rect x="2" y="2" width="96" height="96" rx="24" fill="none" stroke="url(%23grad)" stroke-width="3" opacity="0.8"/><path d="M50 18 L76 78 L62 78 L56 63 L44 63 L38 78 L24 78 Z M50 35 L47 53 L53 53 Z" fill="url(%23grad)"/><circle cx="50" cy="24" r="3.5" fill="%2338bdf8"/></svg>',
            2: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="emg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%2304120e"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23emg)" stroke-width="3"/><path d="M50 16 L80 50 L50 84 L20 50 Z" fill="none" stroke="url(%23emg)" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="url(%23emg)"/></svg>',
            3: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="gld" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%23161005"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23gld)" stroke-width="3"/><text x="50" y="65" font-family="sans-serif" font-weight="900" font-size="44" text-anchor="middle" fill="url(%23gld)">A</text></svg>',
            4: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="prp" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23c084fc"/><stop offset="100%" stop-color="%23ec4899"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%2314051a"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23prp)" stroke-width="3"/><polygon points="50,18 78,74 22,74" fill="none" stroke="url(%23prp)" stroke-width="5"/><circle cx="50" cy="54" r="8" fill="url(%23prp)"/></svg>',
            5: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="lb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%232563eb"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%23061226"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23lb)" stroke-width="3"/><path d="M25 35 Q50 30 50 70 Q50 30 75 35 L75 65 Q50 60 50 75 Q50 60 25 65 Z" fill="none" stroke="url(%23lb)" stroke-width="4"/><circle cx="50" cy="22" r="5" fill="%2338bdf8"/></svg>'
        };

        function selectPresetIcon(id) {
            const svgData = PRESET_ICONS[id];
            if (svgData) {
                const input = document.getElementById('app_icon_input');
                if (input) {
                    input.value = svgData;
                    updateIconPreview(svgData);
                }
            }
        }

        function updateIconPreview(val) {
            const preview = document.getElementById('icon_live_preview');
            if (preview) {
                preview.src = val ? val : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="26" fill="%23090f1d"/><text x="50" y="65" font-family="sans-serif" font-weight="900" font-size="44" text-anchor="middle" fill="%2306b6d4">A</text></svg>';
            }
        }
    </script>
</body>
</html>
