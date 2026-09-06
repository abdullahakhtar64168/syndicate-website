<?php
// api/request-otp.php
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

require 'config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'src/Exception.php';
require 'src/PHPMailer.php';
require 'src/SMTP.php';

header('Content-Type: application/json');

// Get JSON payload
$data = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($data['email'] ?? ''));

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Valid email is required']);
    exit;
}

// Generate 6-digit OTP & Expiration
$otp = (string) random_int(100000, 999999);
$expires = time() + (10 * 60); // 10 minutes

// Layer 1: Stateless HMAC Token
$hash = hash_hmac('sha256', $email . '|' . $otp . '|' . $expires, OTP_SECRET);
$token = base64_encode($expires . '|' . $hash);

// Layer 2: PHP Session
$_SESSION['otp_' . $email] = [
    'code' => $otp,
    'expires' => $expires
];

// Layer 3: System Temp Directory Storage
$sysTempFile = sys_get_temp_dir() . '/syndicate_otp_' . md5($email) . '.txt';
@file_put_contents($sysTempFile, $otp . '|' . $expires);

// Layer 4: Local Folder Storage
$otpDir = __DIR__ . '/otps';
if (!is_dir($otpDir)) {
    @mkdir($otpDir, 0755, true);
    @file_put_contents($otpDir . '/.htaccess', "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>");
    @file_put_contents($otpDir . '/index.html', '');
}
$localFile = $otpDir . '/' . md5($email) . '.json';
@file_put_contents($localFile, json_encode([
    'code' => $otp,
    'expires' => $expires
]));

// Send Email using PHPMailer
$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // Enable SSL encryption (port 465)
    $mail->Port       = SMTP_PORT;

    // Recipients
    $mail->setFrom(SMTP_USER, 'Syndicate O-Level');
    $mail->addReplyTo('noreply@syndicateo.com', 'No Reply');
    $mail->addAddress($email);

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Your Verification Code - Syndicate';
    $mail->Body    = '
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2>Verify Your Email</h2>
            <p>This code is for your Syndicate Package / Early Bird registration.</p>
            <p>Your verification code is:</p>
            <h1 style="font-size: 40px; letter-spacing: 5px; color: #5bb1cc;">' . $otp . '</h1>
            <p>This code will expire in 10 minutes.</p>
        </div>
    ';
    $mail->AltBody = "Your verification code is: $otp\n\nThis code will expire in 10 minutes.";

    $mail->send();
    echo json_encode(['success' => true, 'token' => $token, 'message' => 'OTP sent successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Failed to send OTP. Please try again.']);
}



