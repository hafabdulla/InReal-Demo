import React from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, LogOut, Mail, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SQLServerAuthContext';

// Shown INSTEAD of the whole portal when an application has been declined.
// Product owner decision, 28 July 2026: a declined account is locked rather
// than left dormant — it authenticates only far enough to show this notice,
// with no further navigation.
//
// REFINED 05 August 2026, on the PO's request: there is now also a way back to
// the public site. That is not a relaxation of the rule above, because the rule
// is about navigation WITHIN the portal — not seeing properties, not reaching
// documents, and above all not reopening the identity form to self-edit
// nationality or address (D.23). A link to the marketing homepage grants
// nothing a logged-out visitor does not already have.
//
// It also removes a genuinely bad dead end: previously the only control on this
// screen was "Sign out", so "I would like to look at the website" and "end my
// session" were the same button — the exact complaint that produced the portal's
// own Back to Website link. Returning via Dashboard lands the user straight back
// on this notice, which is correct and was checked rather than assumed.
//
// This screen is presentation only. The actual lockout is enforced by the
// server, which refuses a declined user's token on every endpoint except the
// handful this page needs. If someone bypassed this component entirely, the
// API would still return 403 for anything real.

// What the investor is told depends on WHY they were declined, and the
// difference is a regulatory one rather than a matter of tone:
//
//   jurisdiction — a fact about where InReal currently operates, not a finding
//                  about the person. Stated plainly, because there is nothing
//                  to tip off and saying it stops people re-applying forever.
//   everything else — the PRD's neutral message (REQ-USR-13). Naming a
//                  sanctions, PEP or adverse-media outcome to its subject is
//                  tipping off, so these decline reasons are never disclosed.
function getDeclineCopy(reasonType) {
  if (reasonType === 'jurisdiction') {
    return {
      heading: 'We can’t open an account in your location',
      body:
        'InReal isn’t able to accept investors from your declared jurisdiction at the moment. ' +
        'This is about where we’re currently able to operate — not about you or anything you submitted.',
      followUp:
        'If your circumstances change in future, for example you move to another country, please get in touch and we’ll be glad to look again.',
    };
  }

  return {
    heading: 'We’re unable to proceed with your application',
    body:
      'After review, we’re not able to open an account for you at this time. ' +
      'We appreciate your interest in InReal and are sorry we can’t help on this occasion.',
    followUp: 'If you believe this is a mistake, please contact our support team.',
  };
}

export default function AccountDeclinedNotice() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const copy = getDeclineCopy(user?.KycDeclineReasonType);

  const handleSignOut = () => {
    signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="w-full min-h-screen bg-portal-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <div className="portal-card space-y-5 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-500/10 p-4">
              <ShieldOff className="w-7 h-7 text-red-400" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-portal-primary">{copy.heading}</h1>
            <p className="text-sm text-portal-secondary leading-relaxed">{copy.body}</p>
          </div>

          <div className="border-t border-white/10 pt-5 space-y-4">
            <p className="text-sm text-portal-secondary leading-relaxed">{copy.followUp}</p>

            <a
              href="mailto:support@inreal.com"
              className="inline-flex items-center gap-2 text-sm text-teal-300 hover:text-teal-200 transition-colors"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              support@inreal.com
            </a>
          </div>

          {/* Back to Website sits first and carries the primary treatment: it
              is the only thing left on this screen that a declined applicant
              can usefully do. Signing out is the terminal action, so it reads
              as the quieter of the two. */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/"
              className="portal-btn-primary text-sm py-2.5 px-5 inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Back to Website
            </Link>
            <button
              onClick={handleSignOut}
              className="portal-btn-secondary text-sm py-2.5 px-5 inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
