# App UI & Microcopy Reference

Use this for all in-app copy: onboarding flows, empty states, error messages, button labels, tooltips, notifications, modals, and microcopy that shapes the user experience.

## The InReal App Copy Register

**Tone:** Minimal, functional, like Stripe's dashboard.
**Principle:** Every word serves a purpose. Never decorate.
**Goal:** Clarity without personality. Functional without cold.

---

## Button & CTA Copy

**Every button should start with a verb. Period.**

| Component | Bad | Good |
|-----------|-----|------|
| Primary action | "Yes" | "Complete Investment" |
| Secondary action | "Cancel" | "Save for Later" |
| Destructive | "Remove" | "Sell Shares" |
| Help | "More Info" | "How does this work?" |
| Disabled state | "Disabled" | "Verify identity to continue" |

**Microcopy (supporting text under buttons):**

```
Bad: "Click to proceed to the next step"

Good: "You'll verify your identity next (takes 2 minutes)"
```

---

## Onboarding Flow: Email Verification

```
SCREEN 1: Welcome
HEADLINE: "Welcome to InReal"
SUBHEADING: "Let's get you invested in real estate."
CTA: "Get Started"

SCREEN 2: Email Verification
HEADLINE: "Verify Your Email"
BODY: "We sent a link to [email]. Check your inbox."
MICROCOPY: "Didn't receive it? Check spam or request a new link."
PLACEHOLDER TEXT (email input): "name@example.com"
CTA: "Continue" [disabled until email verified]

SCREEN 3: Identity Verification
HEADLINE: "Verify Your Identity"
BODY: "We'll need your ID to comply with regulations."
MICROCOPY: "This is secure and takes 2 minutes."
OPTIONS: [Upload ID photo] [Use camera]
CTA: "Take a Photo"

SCREEN 4: Bank Details
HEADLINE: "How Should We Pay You?"
BODY: "We'll send monthly distributions here."
MICROCOPY: "Your bank details are encrypted and secure."
INPUT FIELDS: Bank name, account number, routing number
CTA: "Save Account"

SCREEN 5: You're Ready
HEADLINE: "You're all set! 🎉"
BODY: "Explore properties and make your first investment."
CTA: "See Available Properties"
```

---

## Empty States

**When a user has no investments, no notifications, no transaction history, etc.**

### First-Time User (No Investments Yet)

```
VISUAL: Simple illustration of properties or world map

HEADLINE: "Ready to invest?"

BODY: "Start with $500. Choose a property. Own real estate in minutes."

CTA: "Explore Properties"

SECONDARY TEXT: "Learn how it works" [links to help article]
```

### No Notifications

```
HEADLINE: "Nothing new."

BODY: "You'll see market updates, distribution confirmations, and investment opportunities here."

NO CTA (This is information, not a conversion point)
```

### No Transaction History

```
HEADLINE: "No transactions yet."

BODY: "Your activity appears here once you've made your first investment."

CTA: "Make Your First Investment"
```

### No Search Results

```
HEADLINE: "No properties match your filters."

BODY: "Try adjusting your yield range, market preference, or investment amount."

CTA: "Adjust Filters"

SECONDARY: "Browse all properties" [less prominent]
```

---

## Error States

**Tone:** Helpful, not blaming. Solution-oriented.**

| Error Type | Bad | Good |
|-----------|-----|------|
| Invalid email | "Invalid email format" | "Enter a valid email address (example: name@domain.com)" |
| Weak password | "Password too weak" | "Password must be at least 12 characters with numbers and symbols" |
| Failed payment | "Payment declined" | "Your card was declined. Check the details or try a different payment method." |
| Network error | "Error 500" | "We're having trouble. Try again in a moment, or check your internet connection." |
| Field required | "Required" | "This field is required to continue" |

**Format (in-line validation):**
```
[Input field]
[Red error icon]
"Please enter a valid phone number (e.g., +65 1234 5678)"
[Link to help]
```

---

## Success / Confirmation States

**Tone:** Reassuring, celebratory (but professional).**

### Investment Confirmed

```
VISUAL: Checkmark animation

HEADLINE: "$500 Invested Successfully"

DETAILS:
Property: Bangkok Marina Residence
Projected yield: 7.2%
First distribution: ~$3 (next month)

CTA: "View My Portfolio"

SECONDARY: "See property details" [less prominent]
```

### Distribution Received

```
VISUAL: Money bag icon

HEADLINE: "You Earned $47 in August"

DETAILS:
From 3 properties
Deposited to your bank account
Statement coming by Sept 5

CTA: "View Breakdown"

SECONDARY: "Download receipt"
```

---

## Tooltips & Contextual Help

**Tooltips (appear on hover or tap):**

```
TRIGGER: "?" icon next to "Projected Yield"

TOOLTIP: "Based on current rental income and market conditions. Actual returns may vary. Capital at risk."

DESIGN: Small card, 50-100 characters, clear dismissal
```

**Contextual help (persistent, small):**

```
FIELD: "Investment Amount"

HELP TEXT: "Choose between $500 and $50,000. Minimum varies by property."

STYLE: Small, gray, below the input field
```

---

## Notification Copy

### Push Notifications

**Format:** [Icon] Headline + 1-line body max

| Event | Headline | Body |
|-------|----------|------|
| New property listed | "New property available" | "Bangkok apartment, 7.2% yield, $500 min." |
| Distribution received | "You earned $47 in August" | "From 3 properties. View your breakdown." |
| Property fully subscribed | "Investment opportunity closed" | "Bangkok Marina sold out. Try Dubai Marina." |
| Account verification needed | "Verify your identity" | "Takes 2 minutes. Tap to complete." |
| Price change | "Market update: Dubai" | "Property values up 4% this quarter." |

### In-App Notifications (Toasts)

**Duration:** 4-5 seconds, auto-dismiss (unless critical)

```
✓ Investment complete. View your portfolio.

⚠ You'll need to verify identity before your next investment.

! Your payment method expires soon. Update payment info.
```

---

## Modal / Dialog Copy

### Confirmation Modals

```
MODAL TITLE: "Sell Your Shares?"

BODY: "You own $2,500 in Bangkok Marina Residence.
Listing to sell: takes 1-4 weeks to find a buyer."

RISK: "If no buyer is found, your shares remain unsold."

CTA 1 (primary): "Proceed to Sell" [red/destructive]
CTA 2 (secondary): "Keep Holding"
```

### Warning Modals

```
MODAL TITLE: "Are You Sure?"

BODY: "This will remove your bank account for distributions.
You'll need to add a new account before earning future returns."

CTA 1: "Yes, Remove Account"
CTA 2: "Cancel"
```

### Educational Modals (First-Time Users)

```
HEADLINE: "How Yields Work"

BODY: "Your 7.2% projected yield is calculated from monthly rental income divided by your investment.

If you own $500 worth of a property generating $100/month in rent, your return is 2.4% annually.

This is a projection based on current data. Actual returns may vary. Capital at risk."

CTA: "Got It"

OPTION: "Don't show again" [checkbox]
```

---

## Subscription / Pricing Copy

### Pricing Card

```
PLAN NAME: "Professional Investor"

PRICE: "Free"

FEATURES:
✓ Unlimited investments
✓ Access to all markets
✓ Real-time portfolio dashboard
✓ Monthly distributions
✓ Secondary market for selling

CTA: "Get Started"

FINE PRINT: "1.5% annual management fee on investments."
```

### Feature Lock (Premium Feature)

```
[Feature unavailable]

HEADLINE: "Portfolio Diversification Tools"

BODY: "This feature is coming soon. Enter your email to be notified."

[Email input] [Notify Me]

ALTERNATIVE: "Learn about our roadmap"
```

---

## Help & Support Copy

### FAQ Link / Help Center

```
TRIGGER: "?" icon in top-right corner of screen

LABEL: "Help"

DESTINATION: Help center with searchable articles:
- "How do distributions work?"
- "Can I sell my shares?"
- "What happens if a tenant stops paying?"
- "How is yield calculated?"
```

### Contact Support

```
HEADLINE: "Still have questions?"

OPTIONS:
[📧 Email us] — Response in 24 hours
[💬 Chat] — Available Mon-Fri, 9am-5pm Singapore time
[📖 FAQ] — Instant answers to common questions

DEFAULT: Email (most reliable)
```

---

## Preference & Settings Copy

### Toggle Switches

```
BAD:
[Toggle] Notifications

GOOD:
[Toggle] Email notifications about new properties
Helpful info: We'll email you weekly digests if enabled.
```

### Dropdown Menus

```
BAD:
"Select Option"

GOOD:
"Which markets interest you?" [Dropdown]
Options: Bangkok | Dubai | Singapore | All Markets
```

### Radio Buttons (Single Choice)

```
QUESTION: "How often would you like to invest?"

OPTIONS:
○ Monthly (recommended)
○ Quarterly
○ As opportunities arise

[CONTINUE]
```

---

## Accessibility & Clarity Checklist

- [ ] **Every interactive element has a label:** Buttons, forms, inputs should be self-explanatory.
- [ ] **Error messages are specific:** "Enter a 12-character password" not "Error: Invalid input."
- [ ] **CTAs use active verbs:** "Complete Investment" not "Submit."
- [ ] **Microcopy is short:** Help text is 1-2 lines max; full explanations go in Help Center.
- [ ] **Color is not the only indicator:** Error states use color + icon + text.
- [ ] **Tooltips explain jargon:** Users don't know what "NAV" or "yield" means until we tell them.
- [ ] **Success is celebrated:** Confirmations are clear, not hidden.
- [ ] **Risk is transparent:** Any mention of returns includes risk disclosure.

---

## Common UX Microcopy Mistakes

| Mistake | Example | Fix |
|---------|---------|-----|
| Passive voice | "Your identity has been verified" | "Identity verified ✓" |
| Unclear CTA | "Click here" | "Complete verification" |
| No instruction | "Error" | "Check your connection and try again" |
| Jargon | "Initiate portfolio rebalancing" | "Rebalance your portfolio" |
| Feature focus | "REST API integration enabled" | "Portfolio data syncs in real-time" |
| Vague timeline | "Processing..." | "Verifying identity... (usually takes 1 minute)" |
| No next step | "Account created" | "Account created. View available properties." |

