<?php
// 1. Settings
$to = "paul@thinkamigo.com";
$subject = "Thinkamigo Expert for Hire Enquiry";

// 2. Anti-Spam Honeypot
if (!empty($_POST['honeypot'])) {
    exit;
}

// 3. Collect and Sanitize Data
$name         = htmlspecialchars($_POST['name'] ?? '');
$organisation = htmlspecialchars($_POST['organisation'] ?? '');
$email        = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
$message      = htmlspecialchars($_POST['message']);

// 4. Construct the Email Body
$body  = "New enquiry from the Expert for Hire page:\n\n";
$body .= "Name: $name\n";
$body .= "Organisation: $organisation\n";
$body .= "Email: $email\n\n";
$body .= "Message:\n$message";

// 5. Headers
$headers = "From: webmaster@thinkamigo.com" . "\r\n" .
           "Reply-To: $email";

// 6. Send and Redirect
if (mail($to, $subject, $body, $headers)) {
    header("Location: thanks.html");
    exit;
} else {
    echo "Something went wrong. Please email <a href='mailto:paul@thinkamigo.com'>paul@thinkamigo.com</a> directly.";
}
?>
