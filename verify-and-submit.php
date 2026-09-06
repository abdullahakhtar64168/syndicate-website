<?php
// api/verify-and-submit.php
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

require 'config.php';

header('Content-Type: application/json');

// Get JSON payload
$data = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($data['email'] ?? ''));
$otp = trim((string)($data['otp'] ?? ''));
$token = trim((string)($data['token'] ?? ''));
$formData = $data['formData'] ?? [];

if (empty($email) || empty($otp)) {
    echo json_encode(['success' => false, 'message' => 'Email and OTP are required']);
    exit;
}

$isVerified = false;
$failureReason = 'Incorrect verification code or invalid session.';

// Method 1: HMAC Token (Stateless)
if (!empty($token)) {
    $decoded = base64_decode($token);
    $parts = explode('|', $decoded, 2);
    if (count($parts) === 2) {
        $expires = (int)$parts[0];
        $receivedHash = $parts[1];

        if (time() > $expires) {
            $failureReason = 'OTP has expired. Please request a new code.';
        } else {
            $expectedHash = hash_hmac('sha256', $email . '|' . $otp . '|' . $expires, OTP_SECRET);
            if (hash_equals($expectedHash, $receivedHash)) {
                $isVerified = true;
            }
        }
    }
}

// Method 2: PHP Session Fallback
if (!$isVerified && isset($_SESSION['otp_' . $email])) {
    $sessionData = $_SESSION['otp_' . $email];
    if (time() > $sessionData['expires']) {
        $failureReason = 'OTP has expired. Please request a new code.';
    } elseif ((string)$sessionData['code'] === (string)$otp) {
        $isVerified = true;
        unset($_SESSION['otp_' . $email]);
    }
}

// Method 3: System Temp Directory Storage Fallback
if (!$isVerified) {
    $sysTempFile = sys_get_temp_dir() . '/syndicate_otp_' . md5($email) . '.txt';
    if (file_exists($sysTempFile)) {
        $content = @file_get_contents($sysTempFile);
        if ($content) {
            $parts = explode('|', $content, 2);
            if (count($parts) === 2) {
                $savedOtp = trim($parts[0]);
                $savedExpires = (int)$parts[1];
                if (time() > $savedExpires) {
                    $failureReason = 'OTP has expired. Please request a new code.';
                    @unlink($sysTempFile);
                } elseif ($savedOtp === $otp) {
                    $isVerified = true;
                    @unlink($sysTempFile);
                }
            }
        }
    }
}

// Method 4: Local Folder Storage Fallback
if (!$isVerified) {
    $localFile = __DIR__ . '/otps/' . md5($email) . '.json';
    if (file_exists($localFile)) {
        $content = @file_get_contents($localFile);
        if ($content) {
            $json = json_decode($content, true);
            if ($json) {
                if (time() > $json['expires']) {
                    $failureReason = 'OTP has expired. Please request a new code.';
                    @unlink($localFile);
                } elseif ((string)$json['code'] === (string)$otp) {
                    $isVerified = true;
                    @unlink($localFile);
                }
            }
        }
    }
}

if (!$isVerified) {
    echo json_encode(['success' => false, 'message' => $failureReason]);
    exit;
}

// Clean up fallback files on success
@unlink(sys_get_temp_dir() . '/syndicate_otp_' . md5($email) . '.txt');
@unlink(__DIR__ . '/otps/' . md5($email) . '.json');

// Return success if OTP is verified
echo json_encode(['success' => true, 'message' => 'OTP Verified Successfully']);



