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

// بررسی احراز هویت با کلید امنیتی (X-API-KEY یا پارامتر key در URL)
$receivedKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['key'] ?? '';
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
                    INSERT INTO assistant_books (id, title, author, translator, publisher, publish_year, isbn, category, shelf_location, total_copies, available_copies, status, tags, notes, created_at, updated_at)
                    VALUES (:id, :title, :author, :translator, :publisher, :publish_year, :isbn, :category, :shelf_location, :total_copies, :available_copies, :status, :tags, :notes, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        author = VALUES(author),
                        translator = VALUES(translator),
                        publisher = VALUES(publisher),
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
                            ':publish_year' => $b['publishYear'] ?? null,
                            ':isbn' => $b['isbn'] ?? null,
                            ':category' => $b['category'] ?? 'عمومی',
                            ':shelf_location' => $b['shelfLocation'] ?? 'A-1',
                            ':total_copies' => (int)($b['totalCopies'] ?? 1),
                            ':available_copies' => (int)($b['availableCopies'] ?? 1),
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

            echo json_encode([
                'success' => true,
                'synced_books' => $booksCount,
                'synced_members' => $membersCount,
                'synced_loans' => $loansCount,
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
        try {
            $booksCount = $pdo->query("SELECT COUNT(*) FROM assistant_books")->fetchColumn();
            $membersCount = $pdo->query("SELECT COUNT(*) FROM assistant_members")->fetchColumn();
            $loansCount = $pdo->query("SELECT COUNT(*) FROM assistant_loans WHERE status = 'active' OR status = 'overdue'")->fetchColumn();
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
                'server_time' => date('Y-m-d H:i:s'),
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action نامعتبر است'], JSON_UNESCAPED_UNICODE);
        break;
}
