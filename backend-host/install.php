<?php
/**
 * LMS & Academic Resource Management Platform (Enterprise Console)
 * سامانه مدیریت آموزش و منابع دانشگاهی • استودیو آناش
 */

// ۱. تنظیمات امنیتی سشن و سربرگ‌های حفاظتی
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

$configFile = __DIR__ . '/config.php';
$sqlFile = __DIR__ . '/database.sql';
$isConfigured = false;
$dbConnected = false;
$dbError = null;
$pdo = null;

// ایجاد توکن امنیتی CSRF
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// بررسی و برقراری اتصال دیتابیس
if (file_exists($configFile)) {
    require_once $configFile;
    if (defined('DB_NAME') && DB_NAME !== 'my_companion_db' && defined('DB_USER') && DB_USER !== 'db_username') {
        $isConfigured = true;
        try {
            $pdo = getDbConnection();
            $dbConnected = true;
            autoMigrateLmsDatabase($pdo);
        } catch (Exception $e) {
            $dbError = $e->getMessage();
        }
    }
}

/**
 * همگام‌سازی و ارتقای ساختار جداول دیتابیس LMS
 */
function autoMigrateLmsDatabase($pdo) {
    if (!$pdo) return;
    
    // ۱. جدول مدیران و اساتید
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `assistant_admins` (
          `id` varchar(64) NOT NULL,
          `username` varchar(64) NOT NULL,
          `password_hash` varchar(255) NOT NULL,
          `full_name` varchar(128) NOT NULL,
          `email` varchar(128) DEFAULT NULL,
          `role` enum('super_admin','instructor','librarian','registrar') NOT NULL DEFAULT 'super_admin',
          `status` enum('active','inactive') NOT NULL DEFAULT 'active',
          `last_login` datetime DEFAULT NULL,
          `created_at` datetime NOT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `username_idx` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // ۲. جدول دوره‌ها و کلاس‌ها
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `assistant_courses` (
          `id` varchar(64) NOT NULL,
          `code` varchar(32) NOT NULL,
          `title` varchar(255) NOT NULL,
          `instructor_name` varchar(128) NOT NULL,
          `department` varchar(128) NOT NULL,
          `term` varchar(64) NOT NULL,
          `credits` int(11) NOT NULL DEFAULT 3,
          `capacity` int(11) NOT NULL DEFAULT 40,
          `enrolled_count` int(11) NOT NULL DEFAULT 0,
          `syllabus` text DEFAULT NULL,
          `status` enum('active','archived','draft') NOT NULL DEFAULT 'active',
          `created_at` datetime NOT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `course_code_idx` (`code`),
          KEY `dept_idx` (`department`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // ۳. جدول ثبت‌نام، نمرات و حضور و غیاب
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `assistant_enrollments` (
          `id` varchar(64) NOT NULL,
          `course_id` varchar(64) NOT NULL,
          `member_id` varchar(64) NOT NULL,
          `enrollment_date` date NOT NULL,
          `grade` decimal(4,2) DEFAULT NULL,
          `attendance_rate` int(11) NOT NULL DEFAULT 100,
          `status` enum('enrolled','completed','dropped') NOT NULL DEFAULT 'enrolled',
          `notes` text DEFAULT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `enroll_unique_idx` (`course_id`,`member_id`),
          KEY `enroll_course_idx` (`course_id`),
          KEY `enroll_member_idx` (`member_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // ۴. جدول تکالیف و ارزیابی‌ها
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `assistant_assignments` (
          `id` varchar(64) NOT NULL,
          `course_id` varchar(64) NOT NULL,
          `title` varchar(255) NOT NULL,
          `description` text DEFAULT NULL,
          `due_date` date NOT NULL,
          `max_score` decimal(4,2) NOT NULL DEFAULT 20.00,
          `submissions_count` int(11) NOT NULL DEFAULT 0,
          `status` enum('open','closed') NOT NULL DEFAULT 'open',
          `created_at` datetime NOT NULL,
          PRIMARY KEY (`id`),
          KEY `assign_course_idx` (`course_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // ۵. جدول اعلانات و بخشنامه‌ها
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `assistant_announcements` (
          `id` varchar(64) NOT NULL,
          `title` varchar(255) NOT NULL,
          `content` text NOT NULL,
          `target_role` enum('all','instructors','students','librarians') NOT NULL DEFAULT 'all',
          `priority` enum('normal','urgent','pinned') NOT NULL DEFAULT 'normal',
          `author` varchar(128) NOT NULL,
          `created_at` datetime NOT NULL,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // ۶. جدول لاگ‌های امنیتی و رویدادها
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `assistant_audit_logs` (
          `id` varchar(64) NOT NULL,
          `actor` varchar(128) NOT NULL,
          `action` varchar(128) NOT NULL,
          `details` text DEFAULT NULL,
          `ip_address` varchar(45) NOT NULL,
          `created_at` datetime NOT NULL,
          PRIMARY KEY (`id`),
          KEY `actor_idx` (`actor`),
          KEY `action_idx` (`action`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // ۷. تطبیق ستون‌های جدول کتب رفرنس
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM assistant_books")->fetchAll(PDO::FETCH_COLUMN);
        if ($cols && count($cols) > 0) {
            if (!in_array('translator', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `translator` varchar(255) DEFAULT NULL AFTER `author`");
            if (!in_array('publisher', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `publisher` varchar(255) DEFAULT NULL AFTER `translator`");
            if (!in_array('congress_code', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `congress_code` varchar(64) DEFAULT NULL AFTER `publisher`");
            if (!in_array('publish_year', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `publish_year` varchar(32) DEFAULT NULL AFTER `congress_code`");
            if (!in_array('shelf_location', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `shelf_location` varchar(128) NOT NULL DEFAULT 'A-1' AFTER `category`");
            if (!in_array('total_copies', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `total_copies` int(11) NOT NULL DEFAULT 1 AFTER `shelf_location`");
            if (!in_array('available_copies', $cols)) $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `available_copies` int(11) NOT NULL DEFAULT 1 AFTER `total_copies`");
        }
    } catch (Exception $e) {}
}

/**
 * ثبت لاگ رویداد امنیتی در پایگاه داده
 */
function logAuditRecord($pdo, $actor, $action, $details = null) {
    if (!$pdo) return;
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $stmt = $pdo->prepare("INSERT INTO assistant_audit_logs (id, actor, action, details, ip_address, created_at) VALUES (:id, :actor, :action, :details, :ip, NOW())");
        $stmt->execute([
            ':id' => 'log_' . uniqid('', true),
            ':actor' => $actor,
            ':action' => $action,
            ':details' => $details,
            ':ip' => $ip,
        ]);
    } catch (Exception $e) {}
}

$tab = $_GET['tab'] ?? 'dashboard';
$action = $_GET['action'] ?? '';
$message = null;
$messageType = 'info';

// بررسی وضعیت وجود کاربر مدیر ارشد
$adminCount = 0;
if ($dbConnected && $pdo) {
    try {
        $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM assistant_admins")->fetchColumn();
    } catch (Exception $e) {}
}

// خروج از حساب کاربری
if ($action === 'logout') {
    if (!empty($_SESSION['admin_user'])) {
        logAuditRecord($pdo, $_SESSION['admin_user']['username'], 'LOGOUT', 'کاربر از سیستم خارج شد');
    }
    unset($_SESSION['admin_user']);
    session_destroy();
    header('Location: ?tab=login');
    exit;
}

// پردازش فرم‌ها (POST) با اعتبارسنجی CSRF
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submittedToken = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $submittedToken) && !isset($_POST['install_db'])) {
        $message = 'خطای امنیتی نشست (CSRF Token Mismatch). فرم را مجدداً ارسال نمایید.';
        $messageType = 'error';
    } else {

        // الف) راه‌اندازی دیتابیس MySQL
        if (isset($_POST['install_db'])) {
            $dbHost = trim($_POST['db_host'] ?? 'localhost');
            $dbName = trim($_POST['db_name'] ?? '');
            $dbUser = trim($_POST['db_user'] ?? '');
            $dbPass = trim($_POST['db_pass'] ?? '');
            $apiKey = trim($_POST['api_key'] ?? '');

            if (empty($dbName) || empty($dbUser) || empty($apiKey)) {
                $message = 'نام دیتابیس، نام کاربری و کلید API الزامی هستند.';
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
                            if (!empty($q)) $testPdo->exec($q);
                        }
                    }

                    $configContent = "<?php\n/**\n * Companion Assistant - Server Configuration\n * پیکربندی سامانه LMS\n */\n\ndefine('DB_HOST', '" . addslashes($dbHost) . "');\ndefine('DB_NAME', '" . addslashes($dbName) . "');\ndefine('DB_USER', '" . addslashes($dbUser) . "');\ndefine('DB_PASS', '" . addslashes($dbPass) . "');\ndefine('DB_CHARSET', 'utf8mb4');\n\ndefine('API_SECRET_KEY', '" . addslashes($apiKey) . "');\n\nini_set('display_errors', 0);\nerror_reporting(E_ALL);\n\nfunction getDbConnection() {\n    static \$pdo = null;\n    if (\$pdo === null) {\n        \$dsn = \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;\n        \$options = [\n            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n            PDO::ATTR_EMULATE_PREPARES => false,\n        ];\n        try {\n            \$pdo = new PDO(\$dsn, DB_USER, DB_PASS, \$options);\n        } catch (PDOException \$e) {\n            http_response_code(500);\n            echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . \$e->getMessage()], JSON_UNESCAPED_UNICODE);\n            exit;\n        }\n    }\n    return \$pdo;\n}\n";
                    file_put_contents($configFile, $configContent);

                    $isConfigured = true;
                    $dbConnected = true;
                    $pdo = $testPdo;
                    autoMigrateLmsDatabase($pdo);
                    $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM assistant_admins")->fetchColumn();

                    $message = 'اتصال دیتابیس با موفقیت برقرار و جداول LMS آماده‌سازی شدند.';
                    $messageType = 'success';
                } catch (Exception $e) {
                    $message = 'خطای اتصال به دیتابیس: ' . $e->getMessage();
                    $messageType = 'error';
                }
            }
        }

        // ب) ایجاد حساب اولیه مدیر ارشد (در اولین راه‌اندازی)
        if (isset($_POST['setup_initial_admin']) && $dbConnected && $pdo) {
            $username = trim($_POST['username'] ?? '');
            $fullName = trim($_POST['full_name'] ?? '');
            $password = trim($_POST['password'] ?? '');
            $email = trim($_POST['email'] ?? '');

            if (empty($username) || empty($password) || empty($fullName)) {
                $message = 'نام کاربری، نام کامل و رمز عبور الزامی است.';
                $messageType = 'error';
            } elseif (strlen($password) < 6) {
                $message = 'طول کلمه عبور باید حداقل ۶ کاراکتر باشد.';
                $messageType = 'error';
            } else {
                try {
                    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                    $stmt = $pdo->prepare("INSERT INTO assistant_admins (id, username, password_hash, full_name, email, role, status, created_at) VALUES (:id, :u, :p, :fn, :em, 'super_admin', 'active', NOW())");
                    $stmt->execute([
                        ':id' => 'adm_' . uniqid('', true),
                        ':u' => $username,
                        ':p' => $hash,
                        ':fn' => $fullName,
                        ':em' => $email ?: null,
                    ]);

                    $_SESSION['admin_user'] = [
                        'username' => $username,
                        'full_name' => $fullName,
                        'role' => 'super_admin',
                    ];
                    logAuditRecord($pdo, $username, 'ADMIN_INIT', 'مدیر ارشد سامانه پیکربندی شد');
                    $adminCount = 1;
                    $message = 'حساب مدیر ارشد با موفقیت ایجاد شد.';
                    $messageType = 'success';
                } catch (Exception $e) {
                    $message = 'خطا در ایجاد مدیر: ' . $e->getMessage();
                    $messageType = 'error';
                }
            }
        }

        // ج) ورود کاربر به سیستم
        if (isset($_POST['login_admin']) && $dbConnected && $pdo) {
            $username = trim($_POST['username'] ?? '');
            $password = trim($_POST['password'] ?? '');

            // کنترل حملات Brute-Force
            if (!isset($_SESSION['failed_attempts'])) $_SESSION['failed_attempts'] = 0;
            if ($_SESSION['failed_attempts'] >= 5) {
                $message = 'حساب به دلیل تلاش‌های مکرر ناموفق موقتاً مسدود است. لطفاً بعداً تلاش فرمایید.';
                $messageType = 'error';
            } else {
                $stmt = $pdo->prepare("SELECT * FROM assistant_admins WHERE username = :u AND status = 'active' LIMIT 1");
                $stmt->execute([':u' => $username]);
                $user = $stmt->fetch();

                if ($user && password_verify($password, $user['password_hash'])) {
                    session_regenerate_id(true);
                    $_SESSION['failed_attempts'] = 0;
                    $_SESSION['admin_user'] = [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'full_name' => $user['full_name'],
                        'role' => $user['role'],
                    ];
                    $pdo->prepare("UPDATE assistant_admins SET last_login = NOW() WHERE id = :id")->execute([':id' => $user['id']]);
                    logAuditRecord($pdo, $username, 'LOGIN_SUCCESS', 'ورود موفق به کنسول LMS');
                    header('Location: ?tab=dashboard');
                    exit;
                } else {
                    $_SESSION['failed_attempts']++;
                    logAuditRecord($pdo, $username ?: 'anonymous', 'LOGIN_FAILED', 'تلاش ناموفق برای ورود');
                    $message = 'نام کاربری یا کلمه عبور نادرست است.';
                    $messageType = 'error';
                }
            }
        }

        // بررسی احراز هویت برای تمام عملیات‌های بعدی
        if (!empty($_SESSION['admin_user']) && $dbConnected && $pdo) {
            $currentUser = $_SESSION['admin_user'];

            // ۱. ثبت دوره / کلاس درس جدید
            if (isset($_POST['create_course'])) {
                $tab = 'courses';
                $code = strtoupper(trim($_POST['code'] ?? ''));
                $title = trim($_POST['title'] ?? '');
                $instructor = trim($_POST['instructor_name'] ?? '');
                $department = trim($_POST['department'] ?? 'مهندسی');
                $term = trim($_POST['term'] ?? 'نیم‌سال اول ۱۴۰۴-۱۴۰۵');
                $credits = (int)($_POST['credits'] ?? 3);
                $capacity = (int)($_POST['capacity'] ?? 40);
                $syllabus = trim($_POST['syllabus'] ?? '');

                if (empty($code) || empty($title) || empty($instructor)) {
                    $message = 'کد درس، عنوان درس و نام استاد الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        $stmt = $pdo->prepare("
                            INSERT INTO assistant_courses (id, code, title, instructor_name, department, term, credits, capacity, enrolled_count, syllabus, status, created_at)
                            VALUES (:id, :code, :title, :inst, :dept, :term, :cred, :cap, 0, :syl, 'active', NOW())
                        ");
                        $stmt->execute([
                            ':id' => 'crs_' . uniqid('', true),
                            ':code' => $code,
                            ':title' => $title,
                            ':inst' => $instructor,
                            ':dept' => $department,
                            ':term' => $term,
                            ':cred' => $credits > 0 ? $credits : 3,
                            ':cap' => $capacity > 0 ? $capacity : 40,
                            ':syl' => $syllabus ?: null,
                        ]);
                        logAuditRecord($pdo, $currentUser['username'], 'COURSE_CREATE', "دوره {$code} - {$title} تعریف شد");
                        $message = "دوره «{$title}» ({$code}) با موفقیت ایجاد گردید.";
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت دوره: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۲. ثبت‌نام دانشجو در دوره و ثبت نمره
            if (isset($_POST['enroll_student'])) {
                $tab = 'enrollments';
                $courseId = trim($_POST['course_id'] ?? '');
                $memberId = trim($_POST['member_id'] ?? '');
                $grade = $_POST['grade'] !== '' ? floatval($_POST['grade']) : null;
                $attendance = (int)($_POST['attendance_rate'] ?? 100);
                $status = trim($_POST['status'] ?? 'enrolled');

                if (empty($courseId) || empty($memberId)) {
                    $message = 'انتخاب دوره و فراگیر الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        $stmt = $pdo->prepare("
                            INSERT INTO assistant_enrollments (id, course_id, member_id, enrollment_date, grade, attendance_rate, status, created_at)
                            VALUES (:id, :cid, :mid, CURDATE(), :grade, :att, :st, NOW())
                            ON DUPLICATE KEY UPDATE grade = VALUES(grade), attendance_rate = VALUES(attendance_rate), status = VALUES(status)
                        ");
                        $stmt->execute([
                            ':id' => 'enr_' . md5($courseId . '_' . $memberId),
                            ':cid' => $courseId,
                            ':mid' => $memberId,
                            ':grade' => $grade,
                            ':att' => $attendance,
                            ':st' => $status,
                        ]);
                        // بروزرسانی آمار ثبت‌نامی‌های دوره
                        $pdo->prepare("UPDATE assistant_courses SET enrolled_count = (SELECT COUNT(*) FROM assistant_enrollments WHERE course_id = :cid AND status != 'dropped') WHERE id = :cid")->execute([':cid' => $courseId]);
                        logAuditRecord($pdo, $currentUser['username'], 'ENROLL_UPDATE', "وضعیت دانشجو در دوره به‌روز شد");
                        $message = 'ثبت‌نام و سوابق نمره دانشجو ثبت گردید.';
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت‌نام: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۳. ایجاد تکلیف یا آزمون جدید
            if (isset($_POST['create_assignment'])) {
                $tab = 'assignments';
                $courseId = trim($_POST['course_id'] ?? '');
                $title = trim($_POST['title'] ?? '');
                $dueDate = trim($_POST['due_date'] ?? date('Y-m-d', strtotime('+7 days')));
                $maxScore = floatval($_POST['max_score'] ?? 20);
                $desc = trim($_POST['description'] ?? '');

                if (empty($courseId) || empty($title)) {
                    $message = 'انتخاب دوره و عنوان ارزیابی الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        $stmt = $pdo->prepare("INSERT INTO assistant_assignments (id, course_id, title, description, due_date, max_score, submissions_count, status, created_at) VALUES (:id, :cid, :title, :desc, :due, :ms, 0, 'open', NOW())");
                        $stmt->execute([
                            ':id' => 'asg_' . uniqid('', true),
                            ':cid' => $courseId,
                            ':title' => $title,
                            ':desc' => $desc ?: null,
                            ':due' => $dueDate,
                            ':ms' => $maxScore > 0 ? $maxScore : 20,
                        ]);
                        logAuditRecord($pdo, $currentUser['username'], 'ASSIGNMENT_CREATE', "ارزیابی {$title} تعریف شد");
                        $message = 'تکلیف/آزمون جدید در دوره تعریف شد.';
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت ارزیابی: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۴. صدور امانت کتب رفرنس و مراجع
            if (isset($_POST['issue_loan'])) {
                $tab = 'loans';
                $bookId = trim($_POST['book_id'] ?? '');
                $memberId = trim($_POST['member_id'] ?? '');
                $days = (int)($_POST['duration_days'] ?? 14);

                if (empty($bookId) || empty($memberId)) {
                    $message = 'انتخاب کتاب و فراگیر الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        $b = $pdo->prepare("SELECT * FROM assistant_books WHERE id = :id")->execute([':id' => $bookId]) ? $pdo->query("SELECT * FROM assistant_books WHERE id = '$bookId'")->fetch() : null;
                        $m = $pdo->prepare("SELECT * FROM assistant_members WHERE id = :id")->execute([':id' => $memberId]) ? $pdo->query("SELECT * FROM assistant_members WHERE id = '$memberId'")->fetch() : null;

                        if ($b && $m && (int)$b['available_copies'] > 0) {
                            $stmt = $pdo->prepare("
                                INSERT INTO assistant_loans (id, book_id, book_title, member_id, member_name, member_phone, loan_date, due_date, status, renew_count, created_at)
                                VALUES (:id, :bid, :bt, :mid, :mn, :mp, CURDATE(), DATE_ADD(CURDATE(), INTERVAL :days DAY), 'active', 0, NOW())
                            ");
                            $stmt->execute([
                                ':id' => 'loan_' . uniqid('', true),
                                ':bid' => $b['id'],
                                ':bt' => $b['title'],
                                ':mid' => $m['id'],
                                ':mn' => $m['full_name'],
                                ':mp' => $m['phone_number'],
                                ':days' => $days > 0 ? $days : 14,
                            ]);
                            $pdo->prepare("UPDATE assistant_books SET available_copies = available_copies - 1 WHERE id = :id")->execute([':id' => $bookId]);
                            logAuditRecord($pdo, $currentUser['username'], 'LOAN_ISSUE', "امانت کتاب {$b['title']} به {$m['full_name']}");
                            $message = 'امانت کتاب رفرنس با موفقیت ثبت شد.';
                            $messageType = 'success';
                        } else {
                            $message = 'موجودی کتاب در قفسه به اتمام رسیده است.';
                            $messageType = 'error';
                        }
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت امانت: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۵. بازگشت کتاب امانتی
            if ($action === 'return_loan' && !empty($_GET['id'])) {
                $tab = 'loans';
                try {
                    $loan = $pdo->query("SELECT * FROM assistant_loans WHERE id = " . $pdo->quote($_GET['id']))->fetch();
                    if ($loan && $loan['status'] === 'active') {
                        $pdo->prepare("UPDATE assistant_loans SET status = 'returned', return_date = CURDATE() WHERE id = :id")->execute([':id' => $_GET['id']]);
                        $pdo->prepare("UPDATE assistant_books SET available_copies = available_copies + 1 WHERE id = :bid")->execute([':bid' => $loan['book_id']]);
                        logAuditRecord($pdo, $currentUser['username'], 'LOAN_RETURN', "استرداد کتاب {$loan['book_title']}");
                        $message = 'استرداد کتاب ثبت و موجودی قفسه بازیابی شد.';
                        $messageType = 'success';
                    }
                } catch (Exception $e) {}
            }

            // ۶. ایجاد اعلان عمومی / دانشگاهی
            if (isset($_POST['create_announcement'])) {
                $tab = 'announcements';
                $title = trim($_POST['title'] ?? '');
                $content = trim($_POST['content'] ?? '');
                $target = trim($_POST['target_role'] ?? 'all');
                $priority = trim($_POST['priority'] ?? 'normal');

                if (empty($title) || empty($content)) {
                    $message = 'عنوان و شرح اعلان الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        $stmt = $pdo->prepare("INSERT INTO assistant_announcements (id, title, content, target_role, priority, author, created_at) VALUES (:id, :t, :c, :tr, :p, :a, NOW())");
                        $stmt->execute([
                            ':id' => 'ann_' . uniqid('', true),
                            ':t' => $title,
                            ':c' => $content,
                            ':tr' => $target,
                            ':p' => $priority,
                            ':a' => $currentUser['full_name'],
                        ]);
                        logAuditRecord($pdo, $currentUser['username'], 'ANNOUNCEMENT_CREATE', "ارسال اطلاعیه: {$title}");
                        $message = 'اطلاعیه جدید در تابلو منتشر شد.';
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت اعلان: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۷. ثبت تکی کتاب رفرنس در کتابخانه
            if (isset($_POST['add_single_book'])) {
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
                    $message = 'عنوان کتاب الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        $stmt = $pdo->prepare("
                            INSERT INTO assistant_books (id, title, author, translator, publisher, congress_code, shelf_location, publish_year, total_copies, available_copies, category, status, created_at, updated_at)
                            VALUES (:id, :title, :author, :translator, :publisher, :congress_code, :shelf_location, :publish_year, :total_copies, :available_copies, :category, 'available', NOW(), NOW())
                        ");
                        $stmt->execute([
                            ':id' => 'book_' . uniqid('', true),
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
                        logAuditRecord($pdo, $currentUser['username'], 'BOOK_CREATE', "کتاب رفرنس {$title} ثبت شد");
                        $message = "کتاب «{$title}» ثبت گردید.";
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت کتاب: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۸. ورود دسته‌جمعی کتب از اکسل / CSV با جداکننده‌های هوشمند
            if (isset($_POST['import_books_excel'])) {
                $tab = 'books';
                $csvText = '';
                if (!empty($_FILES['books_csv_file']['tmp_name']) && is_uploaded_file($_FILES['books_csv_file']['tmp_name'])) {
                    $csvText = file_get_contents($_FILES['books_csv_file']['tmp_name']);
                } elseif (!empty($_POST['books_csv_paste'])) {
                    $csvText = trim($_POST['books_csv_paste']);
                }

                if (empty(trim($csvText))) {
                    $message = 'فایلی برای بارگذاری انتخاب نشده یا متنی وارد نگردیده است.';
                    $messageType = 'error';
                } else {
                    try {
                        $csvText = preg_replace('/^\xEF\xBB\xBF/', '', $csvText);
                        $lines = preg_split('/\r\n|\r|\n/', $csvText);
                        $imported = 0;

                        $stmt = $pdo->prepare("
                            INSERT INTO assistant_books (id, title, author, translator, publisher, congress_code, shelf_location, publish_year, total_copies, available_copies, category, status, created_at, updated_at)
                            VALUES (:id, :title, :author, :translator, :publisher, :congress_code, :shelf_location, :publish_year, :total_copies, :available_copies, 'عمومی', 'available', NOW(), NOW())
                            ON DUPLICATE KEY UPDATE author=VALUES(author), translator=VALUES(translator), publisher=VALUES(publisher), congress_code=VALUES(congress_code), shelf_location=VALUES(shelf_location), total_copies=VALUES(total_copies), available_copies=VALUES(available_copies), updated_at=NOW()
                        ");

                        foreach ($lines as $i => $line) {
                            $line = trim($line);
                            if (empty($line)) continue;

                            $delims = [',', ';', "\t", '|'];
                            $bestDelim = ',';
                            $maxCount = 0;
                            foreach ($delims as $d) {
                                $c = substr_count($line, $d);
                                if ($c > $maxCount) { $maxCount = $c; $bestDelim = $d; }
                            }

                            $cols = str_getcsv($line, $bestDelim);
                            if (empty($cols) || empty(trim($cols[0] ?? ''))) continue;

                            if ($i === 0) {
                                $h = mb_strtolower(trim($cols[0]));
                                if (strpos($h, 'عنوان') !== false || strpos($h, 'title') !== false) continue;
                            }

                            $title = trim($cols[0] ?? '', " \t\n\r\0\x0B\"'");
                            $author = trim($cols[1] ?? 'نامشخص', " \t\n\r\0\x0B\"'") ?: 'نامشخص';
                            $translator = trim($cols[2] ?? '', " \t\n\r\0\x0B\"'");
                            $publisher = trim($cols[3] ?? '', " \t\n\r\0\x0B\"'");
                            $congressCode = trim($cols[4] ?? '', " \t\n\r\0\x0B\"'");
                            $shelfLoc = trim($cols[5] ?? 'A-1', " \t\n\r\0\x0B\"'") ?: 'A-1';
                            $year = trim($cols[6] ?? '', " \t\n\r\0\x0B\"'");
                            $copies = (int)preg_replace('/[^0-9]/', '', str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'], ['0','1','2','3','4','5','6','7','8','9'], $cols[7] ?? '1'));
                            if ($copies <= 0) $copies = 1;

                            if (!empty($title)) {
                                $stmt->execute([
                                    ':id' => 'book_' . md5($title . '_' . $author . '_' . $congressCode . '_' . $shelfLoc),
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
                        logAuditRecord($pdo, $currentUser['username'], 'BOOK_BULK_IMPORT', "تعداد {$imported} کتاب از فایل اکسل وارد شد");
                        $message = "تعداد {$imported} کتاب رفرنس با موفقیت ثبت شدند.";
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ورود اکسل: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۹. ثبت تکی عضو / فراگیر
            if (isset($_POST['add_single_member'])) {
                $tab = 'members';
                $mNumber = trim($_POST['membership_number'] ?? '');
                $fullName = trim($_POST['full_name'] ?? '');
                $nationalId = trim($_POST['national_id'] ?? '');
                $phone = trim($_POST['phone_number'] ?? '');
                $email = trim($_POST['email'] ?? '');

                if (empty($fullName) || empty($phone)) {
                    $message = 'نام و شماره تماس فراگیر الزامی است.';
                    $messageType = 'error';
                } else {
                    try {
                        if (empty($mNumber)) $mNumber = 'STD-' . rand(10000, 99999);
                        $stmt = $pdo->prepare("INSERT INTO assistant_members (id, membership_number, full_name, national_id, phone_number, email, membership_date, status, borrowed_count, created_at) VALUES (:id, :mn, :fn, :nid, :ph, :em, CURDATE(), 'active', 0, NOW())");
                        $stmt->execute([
                            ':id' => 'mem_' . uniqid('', true),
                            ':mn' => $mNumber,
                            ':fn' => $fullName,
                            ':nid' => $nationalId ?: null,
                            ':ph' => $phone,
                            ':em' => $email ?: null,
                        ]);
                        logAuditRecord($pdo, $currentUser['username'], 'MEMBER_CREATE', "فراگیر {$fullName} ({$mNumber}) افزوده شد");
                        $message = 'عضو/فراگیر جدید ثبت گردید.';
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت فراگیر: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۱۰. ایجاد کاربر مدیریتی جدید / استاد
            if (isset($_POST['create_admin_user'])) {
                $tab = 'users';
                $username = trim($_POST['new_username'] ?? '');
                $fullName = trim($_POST['new_full_name'] ?? '');
                $password = trim($_POST['new_password'] ?? '');
                $email = trim($_POST['new_email'] ?? '');
                $role = trim($_POST['new_role'] ?? 'instructor');

                if (empty($username) || empty($password) || empty($fullName)) {
                    $message = 'نام کاربری، نام و رمز عبور الزامی است.';
                    $messageType = 'error';
                } elseif (strlen($password) < 6) {
                    $message = 'کلمه عبور حداقل ۶ کاراکتر باشد.';
                    $messageType = 'error';
                } else {
                    try {
                        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                        $stmt = $pdo->prepare("INSERT INTO assistant_admins (id, username, password_hash, full_name, email, role, status, created_at) VALUES (:id, :u, :p, :fn, :em, :r, 'active', NOW())");
                        $stmt->execute([
                            ':id' => 'adm_' . uniqid('', true),
                            ':u' => $username,
                            ':p' => $hash,
                            ':fn' => $fullName,
                            ':em' => $email ?: null,
                            ':r' => in_array($role, ['super_admin','instructor','librarian','registrar']) ? $role : 'instructor',
                        ]);
                        logAuditRecord($pdo, $currentUser['username'], 'USER_CREATE', "حساب کاربری برای {$username} ({$role}) ایجاد شد");
                        $message = "کاربر {$username} با موفقیت ثبت شد.";
                        $messageType = 'success';
                    } catch (Exception $e) {
                        $message = 'خطا در ثبت کاربر: ' . $e->getMessage();
                        $messageType = 'error';
                    }
                }
            }

            // ۱۱. ذخیره تنظیمات کلان سامانه و هویت بصری اپلیکیشن
            if (isset($_POST['save_global_settings'])) {
                $tab = 'settings';
                $settingsToSave = [
                    'app_title' => trim($_POST['app_title'] ?? 'سامانه جامع مدیریت آموزش و منابع'),
                    'app_icon' => trim($_POST['app_icon'] ?? ''),
                    'app_theme_mode' => trim($_POST['app_theme_mode'] ?? 'dark'),
                    'app_accent_color' => trim($_POST['app_accent_color'] ?? 'cyan'),
                    'default_term' => trim($_POST['default_term'] ?? 'نیم‌سال اول ۱۴۰۴-۱۴۰۵'),
                    'default_loan_days' => trim($_POST['default_loan_days'] ?? '14'),
                    'max_books_per_member' => trim($_POST['max_books_per_member'] ?? '3'),
                ];

                $stmt = $pdo->prepare("INSERT INTO assistant_settings (setting_key, setting_value, updated_at) VALUES (:k, :v, NOW()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()");
                foreach ($settingsToSave as $k => $v) {
                    $stmt->execute([':k' => $k, ':v' => $v]);
                }
                logAuditRecord($pdo, $currentUser['username'], 'SETTINGS_UPDATE', 'تنظیمات کلان سامانه بروزرسانی شد');
                $message = 'تنظیمات سامانه ذخیره شد و در اپلیکیشن همگام خواهد گردید.';
                $messageType = 'success';
            }

            // حذف ردیف‌ها
            if ($action === 'delete_course' && !empty($_GET['id'])) {
                $tab = 'courses';
                $pdo->prepare("DELETE FROM assistant_courses WHERE id = :id")->execute([':id' => $_GET['id']]);
                logAuditRecord($pdo, $currentUser['username'], 'COURSE_DELETE', "دوره با شناسه {$_GET['id']} حذف شد");
                $message = 'دوره آموزشی از سیستم حذف شد.';
                $messageType = 'success';
            }
            if ($action === 'delete_book' && !empty($_GET['id'])) {
                $tab = 'books';
                $pdo->prepare("DELETE FROM assistant_books WHERE id = :id")->execute([':id' => $_GET['id']]);
                logAuditRecord($pdo, $currentUser['username'], 'BOOK_DELETE', "کتاب رفرنس با شناسه {$_GET['id']} حذف شد");
                $message = 'کتاب مورد نظر حذف گردید.';
                $messageType = 'success';
            }
            if ($action === 'delete_member' && !empty($_GET['id'])) {
                $tab = 'members';
                $pdo->prepare("DELETE FROM assistant_members WHERE id = :id")->execute([':id' => $_GET['id']]);
                logAuditRecord($pdo, $currentUser['username'], 'MEMBER_DELETE', "فراگیر با شناسه {$_GET['id']} حذف شد");
                $message = 'فراگیر حذف شد.';
                $messageType = 'success';
            }
            if ($action === 'delete_announcement' && !empty($_GET['id'])) {
                $tab = 'announcements';
                $pdo->prepare("DELETE FROM assistant_announcements WHERE id = :id")->execute([':id' => $_GET['id']]);
                $message = 'اطلاعیه حذف شد.';
                $messageType = 'success';
            }
        }
    }
}

// واکشی داده‌های مورد نیاز برای نمایش
$stats = ['courses' => 0, 'students' => 0, 'books' => 0, 'loans' => 0, 'assignments' => 0, 'admins' => 0];
$courses = [];
$enrollments = [];
$assignments = [];
$books = [];
$members = [];
$loans = [];
$announcements = [];
$auditLogs = [];
$adminUsers = [];
$globalSettings = [];

if ($dbConnected && $pdo) {
    try {
        $stats['courses'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_courses")->fetchColumn();
        $stats['students'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_members")->fetchColumn();
        $stats['books'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_books")->fetchColumn();
        $stats['loans'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_loans WHERE status = 'active'")->fetchColumn();
        $stats['assignments'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_assignments WHERE status = 'open'")->fetchColumn();
        $stats['admins'] = (int)$pdo->query("SELECT COUNT(*) FROM assistant_admins")->fetchColumn();

        $courses = $pdo->query("SELECT * FROM assistant_courses ORDER BY created_at DESC LIMIT 50")->fetchAll();
        $enrollments = $pdo->query("
            SELECT e.*, c.title AS course_title, c.code AS course_code, m.full_name AS student_name, m.membership_number AS student_number
            FROM assistant_enrollments e
            JOIN assistant_courses c ON e.course_id = c.id
            JOIN assistant_members m ON e.member_id = m.id
            ORDER BY e.enrollment_date DESC LIMIT 50
        ")->fetchAll();
        $assignments = $pdo->query("
            SELECT a.*, c.title AS course_title, c.code AS course_code
            FROM assistant_assignments a
            JOIN assistant_courses c ON a.course_id = c.id
            ORDER BY a.due_date ASC LIMIT 50
        ")->fetchAll();
        $books = $pdo->query("SELECT * FROM assistant_books ORDER BY created_at DESC LIMIT 50")->fetchAll();
        $members = $pdo->query("SELECT * FROM assistant_members ORDER BY created_at DESC LIMIT 50")->fetchAll();
        $loans = $pdo->query("SELECT * FROM assistant_loans ORDER BY loan_date DESC LIMIT 50")->fetchAll();
        $announcements = $pdo->query("SELECT * FROM assistant_announcements ORDER BY created_at DESC LIMIT 20")->fetchAll();
        $auditLogs = $pdo->query("SELECT * FROM assistant_audit_logs ORDER BY created_at DESC LIMIT 50")->fetchAll();
        $adminUsers = $pdo->query("SELECT id, username, full_name, email, role, status, last_login, created_at FROM assistant_admins ORDER BY created_at DESC")->fetchAll();
        $globalSettings = $pdo->query("SELECT setting_key, setting_value FROM assistant_settings")->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (Exception $e) {}
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$currentHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
$currentDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
$apiEndpointUrl = $protocol . $currentHost . $currentDir . '/api.php';
$activeApiKey = defined('API_SECRET_KEY') ? API_SECRET_KEY : 'LMS_SECRET_KEY';
$isLoggedIn = !empty($_SESSION['admin_user']);
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سامانه جامع مدیریت آموزش و منابع دانشگاهی (LMS Console)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
    <style>
        body { font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body class="bg-[#070b14] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-black">

    <!-- Top Master Header -->
    <header class="border-b border-slate-800 bg-[#0c1220] sticky top-0 z-40 px-4 py-2.5">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center font-mono font-bold text-cyan-400 text-sm shadow">
                    LMS
                </div>
                <div>
                    <h1 class="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                        <?php echo htmlspecialchars($globalSettings['app_title'] ?? 'سامانه جامع مدیریت آموزش و منابع دانشگاهی'); ?>
                        <span class="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">v3.0 Core</span>
                    </h1>
                    <span class="text-[10px] text-slate-400 font-mono"><?php echo htmlspecialchars($globalSettings['default_term'] ?? 'نیم‌سال اول ۱۴۰۴-۱۴۰۵'); ?></span>
                </div>
            </div>

            <div class="flex items-center gap-2 text-xs">
                <?php if ($isLoggedIn): ?>
                    <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span class="font-bold text-white"><?php echo htmlspecialchars($_SESSION['admin_user']['full_name']); ?></span>
                        <span class="text-[10px] text-cyan-400 font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40">
                            <?php echo htmlspecialchars($_SESSION['admin_user']['role']); ?>
                        </span>
                    </div>
                    <a href="?action=logout" class="px-2.5 py-1 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-xs font-bold transition-all">
                        خروج
                    </a>
                <?php else: ?>
                    <span class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs">
                        احراز هویت نشده
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Global Notification Banner -->
    <?php if ($message): ?>
        <div class="max-w-7xl mx-auto w-full px-4 pt-3">
            <div class="p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-md <?php echo $messageType === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'; ?>">
                <span><?php echo htmlspecialchars($message); ?></span>
                <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">✕</button>
            </div>
        </div>
    <?php endif; ?>

    <main class="max-w-7xl w-full mx-auto p-4 sm:p-5 flex-1 space-y-4">

        <!-- GATE 1: DATABASE SETUP REQUIRED -->
        <?php if (!$dbConnected): ?>
            <div class="max-w-xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div class="border-b border-slate-800 pb-2">
                    <h2 class="text-sm font-black text-white">پیکربندی اتصال دیتابیس سامانه LMS</h2>
                    <p class="text-xs text-slate-400 mt-1">مشخصات اتصال دیتابیس MySQL هاست را ثبت کنید:</p>
                </div>
                <form method="POST" class="space-y-3 text-xs">
                    <div>
                        <label class="block text-slate-300 mb-1">سرور دیتابیس (Host)</label>
                        <input type="text" name="db_host" value="<?php echo htmlspecialchars(defined('DB_HOST') ? DB_HOST : 'localhost'); ?>" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">نام دیتابیس (DB Name)</label>
                        <input type="text" name="db_name" value="<?php echo htmlspecialchars(defined('DB_NAME') && DB_NAME !== 'my_companion_db' ? DB_NAME : ''); ?>" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">نام کاربری دیتابیس (User)</label>
                        <input type="text" name="db_user" value="<?php echo htmlspecialchars(defined('DB_USER') && DB_USER !== 'db_username' ? DB_USER : ''); ?>" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">رمز عبور دیتابیس (Password)</label>
                        <input type="password" name="db_pass" value="<?php echo htmlspecialchars(defined('DB_PASS') && DB_PASS !== 'your_secure_password' ? DB_PASS : ''); ?>" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">کلید وب‌سرویس API</label>
                        <input type="text" name="api_key" value="<?php echo htmlspecialchars(defined('API_SECRET_KEY') ? API_SECRET_KEY : 'LMS_' . bin2hex(random_bytes(6))); ?>" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono dir-ltr">
                    </div>
                    <button type="submit" name="install_db" class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                        برقراری اتصال دیتابیس و راه‌اندازی ساختار LMS
                    </button>
                </form>
            </div>

        <!-- GATE 2: INITIAL SUPER ADMIN PROVISIONING -->
        <?php elseif ($adminCount === 0): ?>
            <div class="max-w-md mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div class="border-b border-slate-800 pb-2">
                    <h2 class="text-sm font-black text-white">راه‌اندازی حساب مدیر ارشد سامانه (Super Admin)</h2>
                    <p class="text-xs text-slate-400 mt-0.5">مشخصات اولین مدیر امنیتی برای ورود به کنسول LMS را تعیین نمایید:</p>
                </div>
                <form method="POST" class="space-y-3 text-xs">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                    <div>
                        <label class="block text-slate-300 mb-1">نام و نام خانوادگی مدیر</label>
                        <input type="text" name="full_name" required placeholder="مثال: مدیر سیستم" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">نام کاربری ورود (Username)</label>
                        <input type="text" name="username" required value="admin" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">ایمیل مدیر</label>
                        <input type="email" name="email" placeholder="admin@domain.com" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">کلمه عبور امن (حداقل ۶ کاراکتر)</label>
                        <input type="password" name="password" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <button type="submit" name="setup_initial_admin" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all">
                        ایجاد حساب مدیر ارشد و ورود به سیستم
                    </button>
                </form>
            </div>

        <!-- GATE 3: LOGIN SCREEN -->
        <?php elseif (!$isLoggedIn): ?>
            <div class="max-w-md mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div class="border-b border-slate-800 pb-2">
                    <h2 class="text-sm font-black text-white">ورود امن به کنسول مدیریت LMS</h2>
                    <p class="text-xs text-slate-400 mt-0.5">نام کاربری و رمز عبور مدیریتی خود را وارد نمایید:</p>
                </div>
                <form method="POST" class="space-y-3 text-xs">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                    <div>
                        <label class="block text-slate-300 mb-1">نام کاربری (Username)</label>
                        <input type="text" name="username" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <div>
                        <label class="block text-slate-300 mb-1">کلمه عبور (Password)</label>
                        <input type="password" name="password" required class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                    </div>
                    <button type="submit" name="login_admin" class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                        احراز هویت و ورود
                    </button>
                </form>
            </div>

        <!-- ACTIVE LMS OPERATIONAL WORKSPACE (WHEN LOGGED IN) -->
        <?php else: ?>

            <!-- Navigation Bar for LMS Subsystems -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
                <a href="?tab=dashboard" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'dashboard' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    📊 داشبورد آماری
                </a>
                <a href="?tab=courses" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'courses' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    📚 دوره‌ها و سرفصل‌ها (<?php echo $stats['courses']; ?>)
                </a>
                <a href="?tab=enrollments" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'enrollments' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    🎓 ثبت‌نام و کارنامه
                </a>
                <a href="?tab=assignments" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'assignments' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    📝 تکالیف و ارزیابی (<?php echo $stats['assignments']; ?>)
                </a>
                <a href="?tab=books" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'books' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    📖 مراجع و کتب (<?php echo $stats['books']; ?>)
                </a>
                <a href="?tab=loans" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'loans' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    🔄 امانات و گردش (<?php echo $stats['loans']; ?>)
                </a>
                <a href="?tab=members" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'members' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    👥 فراگیران (<?php echo $stats['students']; ?>)
                </a>
                <a href="?tab=announcements" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'announcements' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    📢 اعلانات
                </a>
                <a href="?tab=users" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'users' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    🛡 اساتید و دسترسی‌ها (<?php echo $stats['admins']; ?>)
                </a>
                <a href="?tab=audit" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'audit' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    📋 لاگ رویدادها
                </a>
                <a href="?tab=settings" class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold <?php echo $tab === 'settings' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'; ?>">
                    ⚙ تنظیمات سامانه
                </a>
            </div>

            <!-- TAB 1: EXECUTIVE DASHBOARD -->
            <?php if ($tab === 'dashboard'): ?>
                <div class="space-y-4">
                    <!-- Metric Counters -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <span class="text-[11px] text-slate-400 block font-semibold">دوره‌های آموزشی</span>
                            <span class="text-2xl font-black text-cyan-400 font-mono"><?php echo number_format($stats['courses']); ?></span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <span class="text-[11px] text-slate-400 block font-semibold">فراگیران و دانشجویان</span>
                            <span class="text-2xl font-black text-emerald-400 font-mono"><?php echo number_format($stats['students']); ?></span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <span class="text-[11px] text-slate-400 block font-semibold">تکالیف فعال</span>
                            <span class="text-2xl font-black text-indigo-400 font-mono"><?php echo number_format($stats['assignments']); ?></span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <span class="text-[11px] text-slate-400 block font-semibold">عناوین مراجع و کتب</span>
                            <span class="text-2xl font-black text-amber-400 font-mono"><?php echo number_format($stats['books']); ?></span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <span class="text-[11px] text-slate-400 block font-semibold">امانات در گردش</span>
                            <span class="text-2xl font-black text-rose-400 font-mono"><?php echo number_format($stats['loans']); ?></span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <span class="text-[11px] text-slate-400 block font-semibold">اساتید و کادر مدیریت</span>
                            <span class="text-2xl font-black text-teal-400 font-mono"><?php echo number_format($stats['admins']); ?></span>
                        </div>
                    </div>

                    <!-- Integration Endpoint Data -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 class="font-bold text-white">مشخصات همگام‌سازی اپلیکیشن و وب‌سرویس</h3>
                            <a href="<?php echo htmlspecialchars($apiEndpointUrl . '?action=ping&key=' . urlencode($activeApiKey)); ?>" target="_blank" class="text-cyan-400 hover:underline font-mono">تست وب‌سرویس (Ping) ↗</a>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                            <div>
                                <span class="text-[10px] text-slate-400 block font-sans">نشانی API Endpoint:</span>
                                <input type="text" readonly value="<?php echo htmlspecialchars($apiEndpointUrl); ?>" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 text-[11px] dir-ltr select-all">
                            </div>
                            <div>
                                <span class="text-[10px] text-slate-400 block font-sans">کلید احراز هویت (API Secret Key):</span>
                                <input type="text" readonly value="<?php echo htmlspecialchars($activeApiKey); ?>" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 text-[11px] dir-ltr select-all">
                            </div>
                        </div>
                    </div>

                    <!-- Recent Audit Logs Preview -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 class="text-xs font-bold text-white">آخرین رخدادهای امنیتی سیستم</h3>
                            <a href="?tab=audit" class="text-xs text-cyan-400 hover:underline">مشاهده همه لاگ‌ها</a>
                        </div>
                        <div class="overflow-x-auto text-xs font-mono">
                            <table class="w-full text-right">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">کاربر</th>
                                        <th class="p-2">عملیات</th>
                                        <th class="p-2">جزئیات</th>
                                        <th class="p-2">آدرس IP</th>
                                        <th class="p-2">زمان</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php foreach (array_slice($auditLogs, 0, 5) as $log): ?>
                                        <tr>
                                            <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($log['actor']); ?></td>
                                            <td class="p-2 text-cyan-300"><?php echo htmlspecialchars($log['action']); ?></td>
                                            <td class="p-2 text-slate-300 font-sans"><?php echo htmlspecialchars($log['details'] ?? '-'); ?></td>
                                            <td class="p-2 text-slate-400"><?php echo htmlspecialchars($log['ip_address']); ?></td>
                                            <td class="p-2 text-slate-500"><?php echo htmlspecialchars($log['created_at']); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 2: COURSES & SYLLABUS -->
            <?php if ($tab === 'courses'): ?>
                <div class="space-y-4 text-xs">
                    <!-- Course Creation Form -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">تعریف دوره آموزشی جدید</h3>
                        <form method="POST" action="?tab=courses" class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">کد درس *</label>
                                <input type="text" name="code" required placeholder="مثال: CS-201" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono dir-ltr">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">عنوان دوره *</label>
                                <input type="text" name="title" required placeholder="نام کامل دوره..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">استاد دوره *</label>
                                <input type="text" name="instructor_name" required placeholder="نام استاد..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">دپارتمان / گروه</label>
                                <input type="text" name="department" value="مهندسی نرم‌افزار" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نیم‌سال تحصیلی</label>
                                <input type="text" name="term" value="<?php echo htmlspecialchars($globalSettings['default_term'] ?? 'نیم‌سال اول ۱۴۰۴-۱۴۰۵'); ?>" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">تعداد واحد</label>
                                <input type="number" min="1" max="10" name="credits" value="3" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">ظرفیت کلاس</label>
                                <input type="number" min="1" max="500" name="capacity" value="40" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div class="sm:col-span-4">
                                <label class="block text-slate-300 mb-1">سرفصل‌ها و مباحث آموزشی</label>
                                <textarea name="syllabus" rows="2" placeholder="مباحث و سرفصل‌های تدریس..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"></textarea>
                            </div>
                            <div class="sm:col-span-4 flex justify-end">
                                <button type="submit" name="create_course" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                                    ثبت دوره در سامانه
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Courses Grid / Table -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">فهرست دوره‌های آموزشی تعریف‌شده</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">کد</th>
                                        <th class="p-2">عنوان دوره</th>
                                        <th class="p-2">استاد</th>
                                        <th class="p-2">دپارتمان</th>
                                        <th class="p-2">واحد</th>
                                        <th class="p-2">ثبت‌نامی / ظرفیت</th>
                                        <th class="p-2 text-center">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php if (empty($courses)): ?>
                                        <tr><td colspan="7" class="p-4 text-center text-slate-500">دوره‌ای ثبت نشده است.</td></tr>
                                    <?php else: ?>
                                        <?php foreach ($courses as $c): ?>
                                            <tr>
                                                <td class="p-2 font-mono text-cyan-300 font-bold"><?php echo htmlspecialchars($c['code']); ?></td>
                                                <td class="p-2 text-white font-semibold"><?php echo htmlspecialchars($c['title']); ?></td>
                                                <td class="p-2 text-slate-300"><?php echo htmlspecialchars($c['instructor_name']); ?></td>
                                                <td class="p-2 text-slate-400"><?php echo htmlspecialchars($c['department']); ?></td>
                                                <td class="p-2 font-mono text-slate-300"><?php echo $c['credits']; ?></td>
                                                <td class="p-2 font-mono text-emerald-400"><?php echo $c['enrolled_count']; ?> از <?php echo $c['capacity']; ?></td>
                                                <td class="p-2 text-center">
                                                    <a href="?tab=courses&action=delete_course&id=<?php echo urlencode($c['id']); ?>" onclick="return confirm('آیا از حذف این دوره اطمینان دارید؟')" class="text-rose-400 hover:text-rose-300">حذف</a>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 3: ENROLLMENTS & GRADING -->
            <?php if ($tab === 'enrollments'): ?>
                <div class="space-y-4 text-xs">
                    <!-- Enroll Form -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">ثبت‌نام دانشجو در دوره و ثبت نمره</h3>
                        <form method="POST" action="?tab=enrollments" class="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">انتخاب دوره *</label>
                                <select name="course_id" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="">انتخاب دوره...</option>
                                    <?php foreach ($courses as $c): ?>
                                        <option value="<?php echo $c['id']; ?>"><?php echo htmlspecialchars($c['code'] . ' - ' . $c['title']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">انتخاب دانشجو / فراگیر *</label>
                                <select name="member_id" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="">انتخاب فراگیر...</option>
                                    <?php foreach ($members as $m): ?>
                                        <option value="<?php echo $m['id']; ?>"><?php echo htmlspecialchars($m['full_name'] . ' (' . $m['membership_number'] . ')'); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نمره نهایی (از ۲۰)</label>
                                <input type="number" step="0.25" min="0" max="20" name="grade" placeholder="نمره..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">درصد حضور (%)</label>
                                <input type="number" min="0" max="100" name="attendance_rate" value="100" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">وضعیت تحصیلی</label>
                                <select name="status" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="enrolled">در حال تحصیل</option>
                                    <option value="completed">پایان‌یافته / قبولی</option>
                                    <option value="dropped">حذف درس</option>
                                </select>
                            </div>
                            <div class="sm:col-span-5 flex justify-end">
                                <button type="submit" name="enroll_student" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all">
                                    ثبت پرونده تحصیلی
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Enrollments Table -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">فهرست ثبت‌نام‌ها و نمرات ثبت‌شده</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">شماره دانشجویی</th>
                                        <th class="p-2">نام دانشجو</th>
                                        <th class="p-2">کد دوره</th>
                                        <th class="p-2">عنوان دوره</th>
                                        <th class="p-2">نمره</th>
                                        <th class="p-2">حضور و غیاب</th>
                                        <th class="p-2">وضعیت</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php if (empty($enrollments)): ?>
                                        <tr><td colspan="7" class="p-4 text-center text-slate-500">موردی یافت نشد.</td></tr>
                                    <?php else: ?>
                                        <?php foreach ($enrollments as $e): ?>
                                            <tr>
                                                <td class="p-2 font-mono text-cyan-300"><?php echo htmlspecialchars($e['student_number']); ?></td>
                                                <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($e['student_name']); ?></td>
                                                <td class="p-2 font-mono text-slate-400"><?php echo htmlspecialchars($e['course_code']); ?></td>
                                                <td class="p-2 text-slate-300"><?php echo htmlspecialchars($e['course_title']); ?></td>
                                                <td class="p-2 font-mono font-bold <?php echo ($e['grade'] !== null && $e['grade'] >= 10) ? 'text-emerald-400' : 'text-rose-400'; ?>">
                                                    <?php echo $e['grade'] !== null ? number_format($e['grade'], 2) : '-'; ?>
                                                </td>
                                                <td class="p-2 font-mono text-slate-300"><?php echo $e['attendance_rate']; ?>%</td>
                                                <td class="p-2">
                                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold <?php echo $e['status'] === 'completed' ? 'bg-emerald-950 text-emerald-300' : ($e['status'] === 'dropped' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-cyan-300'); ?>">
                                                        <?php echo htmlspecialchars($e['status']); ?>
                                                    </span>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 4: ASSIGNMENTS & ASSESSMENTS -->
            <?php if ($tab === 'assignments'): ?>
                <div class="space-y-4 text-xs">
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">تعریف تکلیف، آزمون یا ارزیابی جدید</h3>
                        <form method="POST" action="?tab=assignments" class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">دوره مربوطه *</label>
                                <select name="course_id" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="">انتخاب دوره...</option>
                                    <?php foreach ($courses as $c): ?>
                                        <option value="<?php echo $c['id']; ?>"><?php echo htmlspecialchars($c['code'] . ' - ' . $c['title']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">عنوان ارزیابی *</label>
                                <input type="text" name="title" required placeholder="مثال: پروژه میان‌ترم" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">مهلت تحویل (Due Date)</label>
                                <input type="date" name="due_date" value="<?php echo date('Y-m-d', strtotime('+7 days')); ?>" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">حداکثر بارم نمره</label>
                                <input type="number" step="0.5" name="max_score" value="20" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div class="sm:col-span-4">
                                <label class="block text-slate-300 mb-1">توضیحات و دستورالعمل تکلیف</label>
                                <textarea name="description" rows="2" placeholder="جزئیات ارزیابی..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"></textarea>
                            </div>
                            <div class="sm:col-span-4 flex justify-end">
                                <button type="submit" name="create_assignment" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all">
                                    ثبت ارزیابی
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">فهرست ارزیابی‌ها</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">دوره</th>
                                        <th class="p-2">عنوان</th>
                                        <th class="p-2">مهلت تحویل</th>
                                        <th class="p-2">بارم</th>
                                        <th class="p-2">وضعیت</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php if (empty($assignments)): ?>
                                        <tr><td colspan="5" class="p-4 text-center text-slate-500">ارزیابی ثبت نشده است.</td></tr>
                                    <?php else: ?>
                                        <?php foreach ($assignments as $a): ?>
                                            <tr>
                                                <td class="p-2 font-mono text-cyan-300"><?php echo htmlspecialchars($a['course_code']); ?></td>
                                                <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($a['title']); ?></td>
                                                <td class="p-2 font-mono text-amber-300"><?php echo htmlspecialchars($a['due_date']); ?></td>
                                                <td class="p-2 font-mono text-slate-300"><?php echo $a['max_score']; ?></td>
                                                <td class="p-2 font-bold <?php echo $a['status'] === 'open' ? 'text-emerald-400' : 'text-slate-500'; ?>"><?php echo htmlspecialchars($a['status']); ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 5: BOOKS & ACADEMIC REFERENCES -->
            <?php if ($tab === 'books'): ?>
                <div class="space-y-4 text-xs">
                    <!-- Excel Bulk Import Form with Smart Delimiter -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 class="font-bold text-white">ورود دسته‌جمعی مراجع و کتب از اکسل / CSV</h3>
                            <a href="?action=download_books_template" class="text-xs text-amber-300 hover:underline">دریافت فایل قالب CSV ↗</a>
                        </div>
                        <form method="POST" action="?tab=books" enctype="multipart/form-data" class="space-y-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-slate-300 mb-1">فایل اکسل ذخیره‌شده به عنوان CSV</label>
                                    <input type="file" name="books_csv_file" accept=".csv,.txt" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200">
                                </div>
                                <div>
                                    <label class="block text-slate-300 mb-1">یا پیست مستقیم متن ستون‌ها</label>
                                    <textarea name="books_csv_paste" rows="2" placeholder="عنوان کتاب,نویسنده,مترجم,ناشر,کد کنگره,کد قفسه,سال چاپ,تعداد" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"></textarea>
                                </div>
                            </div>
                            <button type="submit" name="import_books_excel" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all">
                                اجرای پردازش و ثبت دسته‌جمعی در دیتابیس
                            </button>
                        </form>
                    </div>

                    <!-- Single Book Form -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">ثبت تکی رفرنس جدید</h3>
                        <form method="POST" action="?tab=books" class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">عنوان کتاب *</label>
                                <input type="text" name="title" required placeholder="نام کتاب..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نویسنده</label>
                                <input type="text" name="author" placeholder="نویسنده..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">مترجم</label>
                                <input type="text" name="translator" placeholder="مترجم..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">ناشر</label>
                                <input type="text" name="publisher" placeholder="ناشر..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">کد کنگره (LCC)</label>
                                <input type="text" name="congress_code" placeholder="PZ3.D68" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-indigo-300 font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">کد قفسه</label>
                                <input type="text" name="shelf_location" value="A-1" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">سال چاپ</label>
                                <input type="text" name="publish_year" placeholder="1402" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">تعداد نسخه</label>
                                <input type="number" min="1" value="1" name="total_copies" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div class="sm:col-span-4 flex justify-end">
                                <button type="submit" name="add_single_book" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                                    ثبت منبع در سرور
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Books Table -->
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">فهرست مراجع و کتب</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">عنوان</th>
                                        <th class="p-2">نویسنده</th>
                                        <th class="p-2">مترجم / ناشر</th>
                                        <th class="p-2">کد کنگره</th>
                                        <th class="p-2">قفسه</th>
                                        <th class="p-2">موجودی</th>
                                        <th class="p-2 text-center">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php if (empty($books)): ?>
                                        <tr><td colspan="7" class="p-4 text-center text-slate-500">کتابی ثبت نشده است.</td></tr>
                                    <?php else: ?>
                                        <?php foreach ($books as $b): ?>
                                            <tr>
                                                <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($b['title']); ?></td>
                                                <td class="p-2 text-slate-300"><?php echo htmlspecialchars($b['author']); ?></td>
                                                <td class="p-2 text-slate-400"><?php echo htmlspecialchars(($b['translator'] ? $b['translator'] . ' / ' : '') . ($b['publisher'] ?? '-')); ?></td>
                                                <td class="p-2 font-mono text-indigo-300"><?php echo htmlspecialchars($b['congress_code'] ?? '-'); ?></td>
                                                <td class="p-2 font-mono text-amber-300"><?php echo htmlspecialchars($b['shelf_location']); ?></td>
                                                <td class="p-2 font-mono text-emerald-400"><?php echo $b['available_copies']; ?> از <?php echo $b['total_copies']; ?></td>
                                                <td class="p-2 text-center">
                                                    <a href="?tab=books&action=delete_book&id=<?php echo urlencode($b['id']); ?>" onclick="return confirm('حذف کتاب؟')" class="text-rose-400 hover:text-rose-300">حذف</a>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 6: CIRCULATION & LOANS -->
            <?php if ($tab === 'loans'): ?>
                <div class="space-y-4 text-xs">
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">صدور امانت رفرنس دانشگاهی</h3>
                        <form method="POST" action="?tab=loans" class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">انتخاب کتاب *</label>
                                <select name="book_id" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="">انتخاب کتاب...</option>
                                    <?php foreach ($books as $b): if ($b['available_copies'] > 0): ?>
                                        <option value="<?php echo $b['id']; ?>"><?php echo htmlspecialchars($b['title'] . ' (موجودی: ' . $b['available_copies'] . ')'); ?></option>
                                    <?php endif; endforeach; ?>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">انتخاب فراگیر / امانت‌گیرنده *</label>
                                <select name="member_id" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="">انتخاب عضو...</option>
                                    <?php foreach ($members as $m): ?>
                                        <option value="<?php echo $m['id']; ?>"><?php echo htmlspecialchars($m['full_name'] . ' (' . $m['membership_number'] . ')'); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">مدت امانت (روز)</label>
                                <input type="number" min="1" max="90" name="duration_days" value="<?php echo htmlspecialchars($globalSettings['default_loan_days'] ?? '14'); ?>" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div class="flex items-end">
                                <button type="submit" name="issue_loan" class="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                                    ثبت امانت
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">سوابق گردش و امانات</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">عنوان کتاب</th>
                                        <th class="p-2">فراگیر</th>
                                        <th class="p-2">تاریخ امانت</th>
                                        <th class="p-2">موعد استرداد</th>
                                        <th class="p-2">وضعیت</th>
                                        <th class="p-2 text-center">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php if (empty($loans)): ?>
                                        <tr><td colspan="6" class="p-4 text-center text-slate-500">امانتی در جریان نیست.</td></tr>
                                    <?php else: ?>
                                        <?php foreach ($loans as $l): ?>
                                            <tr>
                                                <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($l['book_title']); ?></td>
                                                <td class="p-2 text-slate-300"><?php echo htmlspecialchars($l['member_name']); ?></td>
                                                <td class="p-2 font-mono text-slate-400"><?php echo htmlspecialchars($l['loan_date']); ?></td>
                                                <td class="p-2 font-mono text-amber-400"><?php echo htmlspecialchars($l['due_date']); ?></td>
                                                <td class="p-2 font-bold <?php echo $l['status'] === 'active' ? 'text-cyan-400' : 'text-slate-500'; ?>"><?php echo htmlspecialchars($l['status']); ?></td>
                                                <td class="p-2 text-center">
                                                    <?php if ($l['status'] === 'active'): ?>
                                                        <a href="?tab=loans&action=return_loan&id=<?php echo urlencode($l['id']); ?>" class="text-emerald-400 hover:text-emerald-300 font-bold">استرداد</a>
                                                    <?php else: ?>
                                                        <span class="text-slate-500">تحویل شد</span>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 7: MEMBERS & STUDENTS -->
            <?php if ($tab === 'members'): ?>
                <div class="space-y-4 text-xs">
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">ثبت فراگیر / دانشجوی جدید</h3>
                        <form method="POST" action="?tab=members" class="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">شماره دانشجویی / عضویت</label>
                                <input type="text" name="membership_number" placeholder="STD-1001" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نام و نام خانوادگی *</label>
                                <input type="text" name="full_name" required placeholder="نام کامل..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">شماره تماس *</label>
                                <input type="text" name="phone_number" required placeholder="0912..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">کد ملی</label>
                                <input type="text" name="national_id" placeholder="001..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">ایمیل</label>
                                <input type="email" name="email" placeholder="user@domain.com" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                            </div>
                            <div class="sm:col-span-5 flex justify-end">
                                <button type="submit" name="add_single_member" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all">
                                    ثبت فراگیر
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">فهرست فراگیران و کاربران</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">شماره عضویت</th>
                                        <th class="p-2">نام و نام خانوادگی</th>
                                        <th class="p-2">شماره تماس</th>
                                        <th class="p-2">کد ملی</th>
                                        <th class="p-2">تاریخ ثبت‌نام</th>
                                        <th class="p-2 text-center">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php if (empty($members)): ?>
                                        <tr><td colspan="6" class="p-4 text-center text-slate-500">کاربری یافت نشد.</td></tr>
                                    <?php else: ?>
                                        <?php foreach ($members as $m): ?>
                                            <tr>
                                                <td class="p-2 font-mono text-cyan-300 font-bold"><?php echo htmlspecialchars($m['membership_number']); ?></td>
                                                <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($m['full_name']); ?></td>
                                                <td class="p-2 font-mono text-slate-300 dir-ltr"><?php echo htmlspecialchars($m['phone_number']); ?></td>
                                                <td class="p-2 font-mono text-slate-400"><?php echo htmlspecialchars($m['national_id'] ?? '-'); ?></td>
                                                <td class="p-2 font-mono text-slate-500"><?php echo htmlspecialchars($m['membership_date']); ?></td>
                                                <td class="p-2 text-center">
                                                    <a href="?tab=members&action=delete_member&id=<?php echo urlencode($m['id']); ?>" onclick="return confirm('حذف فراگیر؟')" class="text-rose-400 hover:text-rose-300">حذف</a>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 8: ANNOUNCEMENTS -->
            <?php if ($tab === 'announcements'): ?>
                <div class="space-y-4 text-xs">
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">ثبت اعلان / بخشنامه جدید</h3>
                        <form method="POST" action="?tab=announcements" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">عنوان اعلان *</label>
                                <input type="text" name="title" required placeholder="عنوان بخشنامه..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">گروه هدف</label>
                                <select name="target_role" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="all">عموم (اساتید و دانشجویان)</option>
                                    <option value="instructors">فقط اساتید</option>
                                    <option value="students">فقط دانشجویان</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">اولویت</label>
                                <select name="priority" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="normal">عادی</option>
                                    <option value="urgent">فوری</option>
                                    <option value="pinned">سنجاق‌شده</option>
                                </select>
                            </div>
                            <div class="sm:col-span-3">
                                <label class="block text-slate-300 mb-1">متن کامل اعلان</label>
                                <textarea name="content" rows="3" required placeholder="شرح مصوبه یا اعلان..." class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"></textarea>
                            </div>
                            <div class="sm:col-span-3 flex justify-end">
                                <button type="submit" name="create_announcement" class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all">
                                    انتشار اعلان
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <?php foreach ($announcements as $an): ?>
                            <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                                <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                    <h4 class="font-bold text-white"><?php echo htmlspecialchars($an['title']); ?></h4>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-mono <?php echo $an['priority'] === 'urgent' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'; ?>"><?php echo htmlspecialchars($an['priority']); ?></span>
                                </div>
                                <p class="text-slate-300 leading-relaxed"><?php echo nl2br(htmlspecialchars($an['content'])); ?></p>
                                <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                                    <span>توسط: <?php echo htmlspecialchars($an['author']); ?></span>
                                    <a href="?tab=announcements&action=delete_announcement&id=<?php echo urlencode($an['id']); ?>" onclick="return confirm('حذف اعلان؟')" class="text-rose-400 hover:underline">حذف</a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 9: FACULTY & ADMIN USERS -->
            <?php if ($tab === 'users'): ?>
                <div class="space-y-4 text-xs">
                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">ایجاد حساب دسترسی جدید (اساتید / مدیران)</h3>
                        <form method="POST" action="?tab=users" class="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                            <div>
                                <label class="block text-slate-300 mb-1">نام کاربری *</label>
                                <input type="text" name="new_username" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نام و نام خانوادگی *</label>
                                <input type="text" name="new_full_name" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">کلمه عبور *</label>
                                <input type="password" name="new_password" required class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono dir-ltr">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نقش دسترسی</label>
                                <select name="new_role" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="instructor">استاد / مدرس (Instructor)</option>
                                    <option value="librarian">مسئول کتابخانه (Librarian)</option>
                                    <option value="registrar">مسئول آموزش (Registrar)</option>
                                    <option value="super_admin">مدیر ارشد (Super Admin)</option>
                                </select>
                            </div>
                            <div class="flex items-end">
                                <button type="submit" name="create_admin_user" class="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                                    ایجاد حساب کاربری
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <h3 class="font-bold text-white border-b border-slate-800 pb-2">فهرست کاربران مدیریتی و اساتید</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs font-mono">
                                <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                    <tr>
                                        <th class="p-2">نام کاربری</th>
                                        <th class="p-2">نام کامل</th>
                                        <th class="p-2">نقش</th>
                                        <th class="p-2">آخرین ورود</th>
                                        <th class="p-2">تاریخ ایجاد</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    <?php foreach ($adminUsers as $u): ?>
                                        <tr>
                                            <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($u['username']); ?></td>
                                            <td class="p-2 font-sans text-slate-300"><?php echo htmlspecialchars($u['full_name']); ?></td>
                                            <td class="p-2 text-cyan-400"><?php echo htmlspecialchars($u['role']); ?></td>
                                            <td class="p-2 text-slate-400"><?php echo htmlspecialchars($u['last_login'] ?? 'هرگز'); ?></td>
                                            <td class="p-2 text-slate-500"><?php echo htmlspecialchars($u['created_at']); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 10: AUDIT LOGS -->
            <?php if ($tab === 'audit'): ?>
                <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                    <h3 class="font-bold text-white border-b border-slate-800 pb-2">سامانه ثبت وقایع و لاگ‌های امنیتی (Audit Trail)</h3>
                    <div class="overflow-x-auto font-mono">
                        <table class="w-full text-right">
                            <thead class="text-slate-400 border-b border-slate-800 text-[11px]">
                                <tr>
                                    <th class="p-2">کاربر</th>
                                    <th class="p-2">نوع عملیات</th>
                                    <th class="p-2">شرح</th>
                                    <th class="p-2">آدرس IP</th>
                                    <th class="p-2">زمان دقیق</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/60">
                                <?php if (empty($auditLogs)): ?>
                                    <tr><td colspan="5" class="p-4 text-center text-slate-500">لاگی ثبت نشده است.</td></tr>
                                <?php else: ?>
                                    <?php foreach ($auditLogs as $al): ?>
                                        <tr>
                                            <td class="p-2 font-bold text-white"><?php echo htmlspecialchars($al['actor']); ?></td>
                                            <td class="p-2 text-cyan-300 font-bold"><?php echo htmlspecialchars($al['action']); ?></td>
                                            <td class="p-2 font-sans text-slate-300"><?php echo htmlspecialchars($al['details'] ?? '-'); ?></td>
                                            <td class="p-2 text-slate-400"><?php echo htmlspecialchars($al['ip_address']); ?></td>
                                            <td class="p-2 text-slate-500"><?php echo htmlspecialchars($al['created_at']); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            <?php endif; ?>

            <!-- TAB 11: GLOBAL SETTINGS -->
            <?php if ($tab === 'settings'): ?>
                <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
                    <h3 class="font-bold text-white border-b border-slate-800 pb-2">تنظیمات کلان سامانه و هویت بصری اپلیکیشن</h3>
                    <form method="POST" action="?tab=settings" class="space-y-4">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-slate-300 mb-1">عنوان سامانه</label>
                                <input type="text" name="app_title" value="<?php echo htmlspecialchars($globalSettings['app_title'] ?? 'سامانه جامع مدیریت آموزش و منابع دانشگاهی'); ?>" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">نیم‌سال تحصیلی پیش‌فرض</label>
                                <input type="text" name="default_term" value="<?php echo htmlspecialchars($globalSettings['default_term'] ?? 'نیم‌سال اول ۱۴۰۴-۱۴۰۵'); ?>" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">تم پیش‌فرض اپلیکیشن</label>
                                <select name="app_theme_mode" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="dark" <?php echo ($globalSettings['app_theme_mode'] ?? '') === 'dark' ? 'selected' : ''; ?>>شبانه تیره (Dark)</option>
                                    <option value="oled" <?php echo ($globalSettings['app_theme_mode'] ?? '') === 'oled' ? 'selected' : ''; ?>>آمولد خالص (OLED)</option>
                                    <option value="light" <?php echo ($globalSettings['app_theme_mode'] ?? '') === 'light' ? 'selected' : ''; ?>>روز روشن (Light)</option>
                                    <option value="cyber" <?php echo ($globalSettings['app_theme_mode'] ?? '') === 'cyber' ? 'selected' : ''; ?>>سایبر نئون (Cyber)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1">رنگ شاخص اپلیکیشن (Accent Color)</label>
                                <select name="app_accent_color" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                                    <option value="cyan" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'cyan' ? 'selected' : ''; ?>>فیروزه‌ای (Cyan)</option>
                                    <option value="emerald" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'emerald' ? 'selected' : ''; ?>>زمردی (Emerald)</option>
                                    <option value="indigo" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'indigo' ? 'selected' : ''; ?>>ایندیگو (Indigo)</option>
                                    <option value="amber" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'amber' ? 'selected' : ''; ?>>کهربایی (Amber)</option>
                                    <option value="rose" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'rose' ? 'selected' : ''; ?>>یاقوتی (Rose)</option>
                                    <option value="violet" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'violet' ? 'selected' : ''; ?>>بنفش (Violet)</option>
                                    <option value="sky" <?php echo ($globalSettings['app_accent_color'] ?? '') === 'sky' ? 'selected' : ''; ?>>آبی آسمانی (Sky)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1">داده تصویری یا آدرس آیکون اپلیکیشن (Data URL / SVG / URL)</label>
                            <input type="text" name="app_icon" value="<?php echo htmlspecialchars($globalSettings['app_icon'] ?? ''); ?>" placeholder="data:image/svg+xml;utf8,..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-[11px] dir-ltr">
                        </div>

                        <div class="flex justify-end pt-2">
                            <button type="submit" name="save_global_settings" class="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
                                ذخیره تنظیمات سامانه
                            </button>
                        </div>
                    </form>
                </div>
            <?php endif; ?>

        <?php endif; ?>

    </main>

    <!-- Clean Footer -->
    <footer class="border-t border-slate-800 bg-[#0c1220] px-4 py-2 text-center text-[10px] text-slate-500 font-mono">
        LMS Platform Core v3.0 • PHP 8+ / MySQL • Security Hardened with Bcrypt & CSRF Guard
    </footer>

</body>
</html>
