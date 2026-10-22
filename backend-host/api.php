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

    // ۵. دریافت آمار وضعیت سرور
    case 'stats':
        $contactsCount = $pdo->query("SELECT COUNT(*) FROM assistant_contacts")->fetchColumn();
        $txCount = $pdo->query("SELECT COUNT(*) FROM assistant_transactions")->fetchColumn();
        $ticketsCount = $pdo->query("SELECT COUNT(*) FROM assistant_tickets")->fetchColumn();

        echo json_encode([
            'success' => true,
            'stats' => [
                'contacts' => (int)$contactsCount,
                'transactions' => (int)$txCount,
                'tickets' => (int)$ticketsCount,
                'server_time' => date('Y-m-d H:i:s'),
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action نامعتبر است'], JSON_UNESCAPED_UNICODE);
        break;
}
