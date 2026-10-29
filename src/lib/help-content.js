// Self-service troubleshooting content (PDF feature 1): topics the customer can pick,
// each with simple numbered steps, a retry action where one makes sense, and a way to
// escalate to Encore if the steps don't fix it.

export const HELP_TOPICS = [
  {
    key: 'booking_failed',
    icon: 'event_busy',
    title: 'My booking request failed',
    summary: "The request didn't go through after I pressed send.",
    steps: [
      'Check that every field marked with a red * is filled in, especially the pickup address, date and time.',
      "If it's an airport transfer, make sure the flight number is entered if the app is asking for one.",
      'Check your internet connection — look for the "Lost the signal" message at the top of the screen.',
      'Press "Send request" again. If the screen shows a result, the first attempt may have worked already — check My Bookings before sending a second time.',
    ],
    retry: { label: 'Go to Request a Journey', to: '/app/request' },
  },
  {
    key: 'login_failed',
    icon: 'lock_person',
    title: "I can't sign in",
    summary: 'My password or code is not being accepted.',
    steps: [
      'Double-check the email or mobile number you are using — a typo is the most common cause.',
      'For a password: make sure Caps Lock is off, and that you are not including a leading or trailing space.',
      'For a mobile code: codes expire after 10 minutes. Request a new one if yours is old.',
      'Still stuck? Use "Forgot password? Call us" on the sign-in screen, or try the other sign-in method (Mobile or Email).',
    ],
    retry: { label: 'Back to sign in', to: '/login' },
  },
  {
    key: 'payment_failed',
    icon: 'credit_card_off',
    title: 'My payment did not go through',
    summary: 'A payment link failed, or my payment status looks wrong.',
    steps: [
      'Check the payment status on your booking — it may say "Link sent" if a payment link was emailed to you but not yet completed.',
      'Open the payment link again from your email and make sure your card details and billing address are entered correctly.',
      'If your bank declined the payment, try a different card or contact your bank to authorise the transaction.',
      'Payments are arranged directly with Encore — if the link has expired or the amount looks wrong, contact us and we will resend it.',
    ],
  },
  {
    key: 'app_error',
    icon: 'bug_report',
    title: 'The app shows an error or looks broken',
    summary: 'A screen is blank, frozen, or shows an error message.',
    steps: [
      'Pull down on the screen or press "Try again" if you see an error card.',
      'Close the app fully and reopen it.',
      'Check you have the latest version of the app installed.',
      'If a screen stays blank, go back to Home and try again — this usually clears it.',
    ],
    retry: { label: 'Back to Home', to: '/app' },
  },
  {
    key: 'tracking_issue',
    icon: 'location_off',
    title: "I can't find my current location",
    summary: 'The "Use my current location" button is not working.',
    steps: [
      'Allow location permission when your phone asks — check Settings → Apps → Encore → Permissions → Location if you said no before.',
      'Make sure your phone\'s location service (GPS) is switched on.',
      'Move to an area with a clearer view of the sky if you are indoors or underground.',
      "If it still fails, just type your pickup address instead — it works exactly the same.",
    ],
  },
];

export const CONTACT_PROMPT = "If these steps didn't fix it, our team can help directly.";
