/**
 * Outbound transactional email (PO requirement #4, 28 July 2026).
 *
 * WHAT THIS DOES AND DELIBERATELY DOES NOT DO
 *
 * It emails a one-time SETUP CODE. It never emails a password, and it never
 * emails anything a password could be derived from. The product owner's
 * original wording was "new users receive login credentials by email", but
 * building that literally would reverse the property D.5 was built to
 * guarantee — that nobody at InReal ever sets or sees an investor's password.
 * A shared/generic password would additionally let anyone who learns the
 * pattern into any new account before its owner first logs in. So the delivery
 * channel changed and nothing else did: the same hashed, single-use,
 * expiring token machinery already in server.js, now delivered automatically
 * instead of read off an admin's screen and relayed by hand. The PO confirmed
 * they do not want admins knowing passwords, which this satisfies.
 *
 * SWAPPABILITY
 *
 * SendGrid is reached through its plain v3 HTTP API rather than @sendgrid/mail.
 * There is no vendor SDK in the dependency tree, and `deliver()` is the single
 * function that knows which provider is in use. When ADR-01 lands and Supabase
 * Auth takes over account setup and password reset, this whole file is deleted
 * rather than untangled.
 *
 * FAILURE POSTURE — read this before changing anything here
 *
 * Nothing in this file ever throws at its caller, and no caller's outcome
 * depends on delivery succeeding. An email provider outage must not become an
 * onboarding outage: the account is already created and the token is already
 * issued by the time we get here, so a failed send degrades to exactly the
 * manual concierge flow that was the only flow before this existed. Callers
 * get `{ delivered: false, reason }` and are expected to surface the code
 * on-screen as the fallback rather than claim an email was sent.
 */

// Both must be present for any mail to go out. Absent, this module stays
// inert and the pilot keeps running the manual relay — which is the state it
// ships in until the business owns a real sending domain (see below).
const SENDGRID_API_KEY = () => process.env.SENDGRID_API_KEY;
const MAIL_FROM = () => process.env.MAIL_FROM;
const MAIL_FROM_NAME = () => process.env.MAIL_FROM_NAME || 'InReal';

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

// A send that hangs would hold an admin's "create account" request open for as
// long as the socket stayed alive. 10s is generous for a single API call and
// bounded enough that the admin gets their fallback code promptly instead.
const SEND_TIMEOUT_MS = 10_000;

export function isMailConfigured() {
  return Boolean(SENDGRID_API_KEY() && MAIL_FROM());
}

/**
 * Why escape a name that is going into an email rather than a page: the same
 * reason it gets escaped everywhere else in this project. `firstName` is
 * attacker-supplied through public signup — that is precisely how the D.11
 * stored XSS reached an admin's browser. Mail clients render HTML, several
 * render it permissively, and an unescaped name is an HTML-injection foothold
 * in a message that carries InReal's from-address. The text/plain alternative
 * below needs no escaping and deliberately does not get any.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The one provider-aware function. Returns, never throws.
 *
 * Note what is absent: the code itself is never logged from this module, on
 * success or failure. server.js already logs it once, at the point of issue,
 * as the deliberate concierge fallback; logging it a second time here would
 * put a live credential into the request path of every send.
 */
async function deliver({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    return { delivered: false, reason: 'mail_not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(SENDGRID_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: MAIL_FROM(), name: MAIL_FROM_NAME() },
        subject,
        // Order matters to SendGrid: text/plain must precede text/html.
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
        // Click-tracking rewrites links through a SendGrid domain. On a
        // message whose entire purpose is proving InReal sent it, a
        // stranger's domain in the URL trains investors to trust redirects
        // and makes the mail look like the phishing it could be mistaken for.
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }),
      signal: controller.signal,
    });

    if (response.status === 202) {
      return { delivered: true };
    }

    // SendGrid puts the actual cause (unverified sender, bad key, malformed
    // payload) in the body. Log it server-side — an admin seeing "couldn't
    // email" needs someone to be able to find out why.
    const detail = await response.text().catch(() => '');
    console.error(`[mail] SendGrid rejected the send (HTTP ${response.status}): ${detail.slice(0, 500)}`);
    return { delivered: false, reason: `provider_error_${response.status}` };
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'timeout' : 'network_error';
    console.error(`[mail] send failed (${reason}):`, error?.message || error);
    return { delivered: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Shared shell for both messages.
 *
 * Copy rules that apply here as much as to any other investor-facing string
 * (PRD Appendix A, HC-1/HC-6): nothing about wallets, balances, funds, units,
 * NAV, returns or redemption. These are account-access messages and say
 * nothing about money, which is also what keeps them out of the territory
 * where a transactional email starts reading as a financial promotion.
 */
function buildEmail({ heading, greetingName, bodyLines, code, actionUrl, actionLabel, footerNote }) {
  const safeName = greetingName ? `Hi ${greetingName},` : 'Hi,';

  const text = [
    safeName,
    '',
    ...bodyLines,
    '',
    `Your code: ${code}`,
    ...(actionUrl ? ['', `${actionLabel}: ${actionUrl}`] : []),
    '',
    footerNote,
    '',
    'If you were not expecting this email, you can ignore it.',
    '',
    'InReal',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(safeName)}</p>
      ${bodyLines
        .map((line) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`)
        .join('\n      ')}
      <div style="margin:24px 0;padding:16px;background:#f4f4f5;border-radius:8px;text-align:center;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;margin-bottom:8px;">Your code</div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;word-break:break-all;color:#18181b;">${escapeHtml(code)}</div>
      </div>
      ${
        actionUrl
          ? `<p style="margin:0 0 24px;text-align:center;">
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">${escapeHtml(actionLabel)}</a>
      </p>`
          : ''
      }
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#71717a;">${escapeHtml(footerNote)}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">If you were not expecting this email, you can ignore it.</p>
    </div>
  </body>
</html>`;

  return { text, html };
}

/**
 * Sent when an admin creates an account on an investor's behalf.
 * Pairs with POST /api/ops/users.
 */
export async function sendAccountSetupEmail({ to, firstName, code, portalUrl, expiryHours }) {
  const actionUrl = portalUrl ? `${portalUrl}/auth?code=${encodeURIComponent(code)}` : null;

  const { text, html } = buildEmail({
    heading: 'Set your InReal password',
    greetingName: firstName,
    bodyLines: [
      'An InReal account has been created for you.',
      'Use the one-time code below to choose your own password. Nobody at InReal can see or set it for you.',
    ],
    code,
    actionUrl,
    actionLabel: 'Set my password',
    footerNote: `This code can be used once and expires in ${expiryHours} hours.`,
  });

  return deliver({ to, subject: 'Set your InReal password', text, html });
}

/**
 * Sent when someone asks to reset their own password.
 * Pairs with POST /api/auth/password-reset/request.
 *
 * Until this existed the raw token went only to the server console, which
 * meant the self-service reset flow was operable only by someone with
 * production log access — see D.5's "separately flagged, not yet built" note.
 * This closes that.
 */
export async function sendPasswordResetEmail({ to, firstName, code, portalUrl, expiryMinutes }) {
  const actionUrl = portalUrl ? `${portalUrl}/auth?code=${encodeURIComponent(code)}` : null;

  const { text, html } = buildEmail({
    heading: 'Reset your InReal password',
    greetingName: firstName,
    bodyLines: [
      'We received a request to reset the password on your InReal account.',
      'Use the one-time code below to choose a new password.',
    ],
    code,
    actionUrl,
    actionLabel: 'Reset my password',
    footerNote: `This code can be used once and expires in ${expiryMinutes} minutes. Your current password stays active until you set a new one.`,
  });

  return deliver({ to, subject: 'Reset your InReal password', text, html });
}
