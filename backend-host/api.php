<?php
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

// دریافت و بررسی کلید احراز هویت از سربرگ‌ها، Bearer Token یا پارامتر URL
$receivedKey = $_SERVER['HTTP_X_API_KEY'] ?? $_SERVER['REDIRECT_HTTP_X_API_KEY'] ?? $_GET['key'] ?? $_POST['key'] ?? '';
if (empty($receivedKey)) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (empty($receivedKey)) {
            $receivedKey = $headers['X-API-KEY'] ?? $headers['x-api-key'] ?? '';
        }
    }
    if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        $receivedKey = $matches[1];
    }
}

if ($receivedKey !== API_SECRET_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'error' => 'کلید امنیتی نامعتبر است (Unauthorized)'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? 'ping';
$pdo = getDbConnection();

// بروزرسانی خودکار ساختار دیتابیس در صورت نیاز
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
        if (!in_array('shelf_location', $cols)) {
            $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `shelf_location` varchar(128) NOT NULL DEFAULT 'A-1' AFTER `category`");
        }
        if (!in_array('total_copies', $cols)) {
            $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `total_copies` int(11) NOT NULL DEFAULT 1 AFTER `shelf_location`");
        }
        if (!in_array('available_copies', $cols)) {
            $pdo->exec("ALTER TABLE `assistant_books` ADD COLUMN `available_copies` int(11) NOT NULL DEFAULT 1 AFTER `total_copies`");
        }
    }
} catch (Exception $e) {}

switch ($action) {
    // ۱. تست پینگ و سلامت ارتباط
    case 'ping':
        echo json_encode([
            'success' => true,
            'message' => 'اتصال امن به هاست با موفقیت برقرار شد.',
            'server_time' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION,
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ۲. همگام‌سازی مخاطبین
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
                if (!empty($c['id']) && !empty($c['name'])) {
                    $stmt->execute([
                        ':id' => $c['id'],
                        ':name' => $c['name'],
                        ':phone_number' => $c['phoneNumber'] ?? '',
                        ':email' => $c['email'] ?? null,
                        ':category' => $c['category'] ?? 'شخصی',
                        ':notes' => $c['notes'] ?? null,
                    ]);
                    $count++;
                }
            }

            echo json_encode(['success' => true, 'synced_count' => $count], JSON_UNESCAPED_UNICODE);
        } else {
            // متد GET: دریافت مخاطبین از سرور
            $stmt = $pdo->query("SELECT * FROM assistant_contacts ORDER BY name ASC");
            $rows = $stmt->fetchAll();
            echo json_encode(['success' => true, 'contacts' => $rows], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۳. همگام‌سازی تراکنش‌های مالی (حسابداری پیامک‌ها)
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

            echo json_encode(['success' => true, 'synced_count' => $count], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۴. ثبت پیام و تیکت پشتیبانی فنی
    case 'submit_ticket':
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['title']) || empty($input['message'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'عنوان و متن پیام الزامی است.'], JSON_UNESCAPED_UNICODE);
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
            'message' => 'پیام شما در سرور هاست ثبت شد و در صف پیگیری قرار گرفت.'
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ۵. همگام‌سازی جامع ماژول مدیریت کتابخانه (کتاب‌ها، اعضا، امانات)
    case 'sync_library':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $books = $input['books'] ?? [];
            $members = $input['members'] ?? [];
            $loans = $input['loans'] ?? [];

            $booksCount = 0;
            $membersCount = 0;
            $loansCount = 0;

            // ۱. ثبت و به‌روزرسانی کتاب‌ها
            if (!empty($books)) {
                $stmtBook = $pdo->prepare("
                    INSERT INTO assistant_books (id, title, author, translator, publisher, congress_code, publish_year, isbn, category, shelf_location, total_copies, available_copies, status, tags, notes, created_at, updated_at)
                    VALUES (:id, :title, :author, :translator, :publisher, :congress_code, :publish_year, :isbn, :category, :shelf_location, :total_copies, :available_copies, :status, :tags, :notes, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        author = VALUES(author),
                        translator = VALUES(translator),
                        publisher = VALUES(publisher),
                        congress_code = VALUES(congress_code),
                        publish_year = VALUES(publish_year),
                        isbn = VALUES(isbn),
                        category = VALUES(category),
                        shelf_location = VALUES(shelf_location),
                        total_copies = VALUES(total_copies),
                        available_copies = VALUES(available_copies),
                        status = VALUES(status),
                        tags = VALUES(tags),
                        notes = VALUES(notes),
                        updated_at = NOW()
                ");

                foreach ($books as $b) {
                    if (!empty($b['id']) && !empty($b['title'])) {
                        $stmtBook->execute([
                            ':id' => $b['id'],
                            ':title' => $b['title'],
                            ':author' => $b['author'] ?? 'نامشخص',
                            ':translator' => $b['translator'] ?? null,
                            ':publisher' => $b['publisher'] ?? null,
                            ':congress_code' => $b['congressCode'] ?? $b['congress_code'] ?? null,
                            ':publish_year' => $b['publishYear'] ?? $b['publish_year'] ?? null,
                            ':isbn' => $b['isbn'] ?? null,
                            ':category' => $b['category'] ?? 'عمومی',
                            ':shelf_location' => $b['shelfLocation'] ?? $b['shelf_location'] ?? 'A-1',
                            ':total_copies' => (int)($b['totalCopies'] ?? $b['total_copies'] ?? 1),
                            ':available_copies' => (int)($b['availableCopies'] ?? $b['available_copies'] ?? 1),
                            ':status' => $b['status'] ?? 'available',
                            ':tags' => is_array($b['tags'] ?? null) ? implode(',', $b['tags']) : ($b['tags'] ?? null),
                            ':notes' => $b['notes'] ?? null,
                        ]);
                        $booksCount++;
                    }
                }
            }

            // ۲. ثبت و به‌روزرسانی اعضا
            if (!empty($members)) {
                $stmtMember = $pdo->prepare("
                    INSERT INTO assistant_members (id, membership_number, full_name, national_id, phone_number, email, membership_date, expiry_date, status, borrowed_count, address, notes, created_at)
                    VALUES (:id, :membership_number, :full_name, :national_id, :phone_number, :email, :membership_date, :expiry_date, :status, :borrowed_count, :address, :notes, NOW())
                    ON DUPLICATE KEY UPDATE
                        membership_number = VALUES(membership_number),
                        full_name = VALUES(full_name),
                        national_id = VALUES(national_id),
                        phone_number = VALUES(phone_number),
                        email = VALUES(email),
                        membership_date = VALUES(membership_date),
                        expiry_date = VALUES(expiry_date),
                        status = VALUES(status),
                        borrowed_count = VALUES(borrowed_count),
                        address = VALUES(address),
                        notes = VALUES(notes)
                ");

                foreach ($members as $m) {
                    if (!empty($m['id']) && !empty($m['fullName'])) {
                        $stmtMember->execute([
                            ':id' => $m['id'],
                            ':membership_number' => $m['membershipNumber'] ?? '',
                            ':full_name' => $m['fullName'],
                            ':national_id' => $m['nationalId'] ?? null,
                            ':phone_number' => $m['phoneNumber'] ?? '',
                            ':email' => $m['email'] ?? null,
                            ':membership_date' => $m['membershipDate'] ?? date('Y/m/d'),
                            ':expiry_date' => $m['expiryDate'] ?? null,
                            ':status' => $m['status'] ?? 'active',
                            ':borrowed_count' => (int)($m['borrowedCount'] ?? 0),
                            ':address' => $m['address'] ?? null,
                            ':notes' => $m['notes'] ?? null,
                        ]);
                        $membersCount++;
                    }
                }
            }

            // ۳. ثبت و به‌روزرسانی امانات و گردش کتاب
            if (!empty($loans)) {
                $stmtLoan = $pdo->prepare("
                    INSERT INTO assistant_loans (id, book_id, book_title, member_id, member_name, member_phone, loan_date, due_date, return_date, status, renew_count, notes, created_at)
                    VALUES (:id, :book_id, :book_title, :member_id, :member_name, :member_phone, :loan_date, :due_date, :return_date, :status, :renew_count, :notes, NOW())
                    ON DUPLICATE KEY UPDATE
                        return_date = VALUES(return_date),
                        status = VALUES(status),
                        renew_count = VALUES(renew_count),
                        notes = VALUES(notes)
                ");

                foreach ($loans as $l) {
                    if (!empty($l['id']) && !empty($l['bookId'])) {
                        $stmtLoan->execute([
                            ':id' => $l['id'],
                            ':book_id' => $l['bookId'],
                            ':book_title' => $l['bookTitle'] ?? '',
                            ':member_id' => $l['memberId'] ?? '',
                            ':member_name' => $l['memberName'] ?? '',
                            ':member_phone' => $l['memberPhone'] ?? '',
                            ':loan_date' => $l['loanDate'] ?? date('Y/m/d'),
                            ':due_date' => $l['dueDate'] ?? date('Y/m/d'),
                            ':return_date' => $l['returnDate'] ?? null,
                            ':status' => $l['status'] ?? 'active',
                            ':renew_count' => (int)($l['renewCount'] ?? 0),
                            ':notes' => $l['notes'] ?? null,
                        ]);
                        $loansCount++;
                    }
                }
            }

            $freshBooks = $pdo->query("SELECT * FROM assistant_books ORDER BY title ASC")->fetchAll();
            $freshMembers = $pdo->query("SELECT * FROM assistant_members ORDER BY full_name ASC")->fetchAll();
            $freshLoans = $pdo->query("SELECT * FROM assistant_loans ORDER BY loan_date DESC")->fetchAll();

            echo json_encode([
                'success' => true,
                'synced_books' => $booksCount,
                'synced_members' => $membersCount,
                'synced_loans' => $loansCount,
                'books' => $freshBooks,
                'members' => $freshMembers,
                'loans' => $freshLoans,
                'message' => 'همگام‌سازی اطلاعات کتابخانه با موفقیت روی هاست ثبت شد.'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            // دریافت فهرست کتاب‌ها، اعضا و امانات از سرور
            $books = $pdo->query("SELECT * FROM assistant_books ORDER BY title ASC")->fetchAll();
            $members = $pdo->query("SELECT * FROM assistant_members ORDER BY full_name ASC")->fetchAll();
            $loans = $pdo->query("SELECT * FROM assistant_loans ORDER BY loan_date DESC")->fetchAll();

            echo json_encode([
                'success' => true,
                'books' => $books,
                'members' => $members,
                'loans' => $loans,
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۶. دریافت آمار جامع وضعیت سرور و ماژول‌ها
    case 'stats':
        $contactsCount = $pdo->query("SELECT COUNT(*) FROM assistant_contacts")->fetchColumn();
        $txCount = $pdo->query("SELECT COUNT(*) FROM assistant_transactions")->fetchColumn();
        $ticketsCount = $pdo->query("SELECT COUNT(*) FROM assistant_tickets")->fetchColumn();
        
        $booksCount = 0;
        $membersCount = 0;
        $loansCount = 0;
        $coursesCount = 0;
        $assignmentsCount = 0;
        $announcementsCount = 0;
        try {
            $booksCount = $pdo->query("SELECT COUNT(*) FROM assistant_books")->fetchColumn();
            $membersCount = $pdo->query("SELECT COUNT(*) FROM assistant_members")->fetchColumn();
            $loansCount = $pdo->query("SELECT COUNT(*) FROM assistant_loans WHERE status = 'active' OR status = 'overdue'")->fetchColumn();
            $coursesCount = $pdo->query("SELECT COUNT(*) FROM assistant_courses WHERE status = 'active'")->fetchColumn();
            $assignmentsCount = $pdo->query("SELECT COUNT(*) FROM assistant_assignments WHERE status = 'published'")->fetchColumn();
            $announcementsCount = $pdo->query("SELECT COUNT(*) FROM assistant_announcements WHERE status = 'published'")->fetchColumn();
        } catch (Exception $e) {}

        echo json_encode([
            'success' => true,
            'stats' => [
                'contacts' => (int)$contactsCount,
                'transactions' => (int)$txCount,
                'tickets' => (int)$ticketsCount,
                'books' => (int)$booksCount,
                'members' => (int)$membersCount,
                'active_loans' => (int)$loansCount,
                'courses' => (int)$coursesCount,
                'assignments' => (int)$assignmentsCount,
                'announcements' => (int)$announcementsCount,
                'server_time' => date('Y-m-d H:i:s'),
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ۷. دریافت تنظیمات سراسری سیستم از هاست
    case 'get_settings':
        try {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM assistant_settings");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            echo json_encode(['success' => true, 'settings' => $rows], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => true, 'settings' => []], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۸. ذخیره و به‌روزرسانی تنظیمات سیستم
    case 'save_settings':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $settings = $input['settings'] ?? [];
            $stmt = $pdo->prepare("
                INSERT INTO assistant_settings (setting_key, setting_value, updated_at)
                VALUES (:k, :v, NOW())
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            foreach ($settings as $k => $v) {
                $stmt->execute([':k' => $k, ':v' => is_string($v) ? $v : json_encode($v, JSON_UNESCAPED_UNICODE)]);
            }
            echo json_encode(['success' => true, 'message' => 'تنظیمات سامانه ذخیره شدند.'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۹. دریافت دوره‌های آموزشی LMS
    case 'get_courses':
        try {
            $stmt = $pdo->query("SELECT * FROM assistant_courses ORDER BY created_at DESC");
            $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'courses' => $courses], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۱۰. دریافت اطلاعیه‌های آموزشی LMS
    case 'get_announcements':
        try {
            $stmt = $pdo->query("SELECT * FROM assistant_announcements WHERE status = 'published' ORDER BY priority = 'urgent' DESC, priority = 'pinned' DESC, created_at DESC");
            $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'announcements' => $announcements], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۱۱. دریافت تکالیف درسی LMS
    case 'get_assignments':
        try {
            $courseId = $_GET['course_id'] ?? null;
            if ($courseId) {
                $stmt = $pdo->prepare("SELECT a.*, c.title AS course_title FROM assistant_assignments a JOIN assistant_courses c ON a.course_id = c.id WHERE a.course_id = :cid ORDER BY a.due_date ASC");
                $stmt->execute([':cid' => $courseId]);
            } else {
                $stmt = $pdo->query("SELECT a.*, c.title AS course_title FROM assistant_assignments a JOIN assistant_courses c ON a.course_id = c.id ORDER BY a.due_date ASC");
            }
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'assignments' => $assignments], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۱۲. حذف کتاب از سرور
    case 'delete_book':
        $bookId = $_GET['id'] ?? '';
        if ($bookId) {
            $stmt = $pdo->prepare("DELETE FROM assistant_books WHERE id = :id");
            $stmt->execute([':id' => $bookId]);
            echo json_encode(['success' => true, 'message' => 'کتاب با موفقیت حذف شد.'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // ۱۳. حذف عضو از سرور
    case 'delete_member':
        $memberId = $_GET['id'] ?? '';
        if ($memberId) {
            $stmt = $pdo->prepare("DELETE FROM assistant_members WHERE id = :id");
            $stmt->execute([':id' => $memberId]);
            echo json_encode(['success' => true, 'message' => 'عضو با موفقیت حذف شد.'], JSON_UNESCAPED_UNICODE);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action نامعتبر است'], JSON_UNESCAPED_UNICODE);
        break;
}
