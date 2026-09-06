<?php
// api/config.php

// Secure configuration for Titan SMTP
define('SMTP_HOST', 'smtp.titan.email');
define('SMTP_PORT', 465); // 465 for SSL, 587 for TLS
define('SMTP_USER', 'support@syndicateo.com');
define('SMTP_PASS', '@Syndicateo321'); // <-- Paste your Titan email password here

// Secret key for HMAC OTP verification
define('OTP_SECRET', 'SyndicateOLevel_Secured_OTP_Key_2026_x98f7a6b5c4');

