/**
 * One definition of how a KYC status is presented to the investor.
 *
 * WHY THIS IS A SHARED HELPER RATHER THAN INLINE JSX
 *
 * The Settings page previously rendered KYC state twice inside a single card,
 * from two DIFFERENT columns: the description read `KYCStatus === 'Approved'`
 * while the badge next to it read `IdentityVerified`. Those are separate
 * database columns written by separate code paths, and nothing constrains them
 * to agree — the investment gate in server.js treats them as independent
 * (`!identity_verified || kyc_status !== 'Approved'`). So the card could render
 * "Identity verified" beside an amber "Pending" pill.
 *
 * An audit of the live data at the time this was written found 0 rows where
 * they disagreed, so this was latent rather than an active bug. It is fixed by
 * removing the second source entirely: `kyc_status` is authoritative, which is
 * also what the 23 June meeting item specified ("must read live from
 * `kyc_status`, never be a hardcoded/static badge").
 *
 * Everything KYC-facing on the investor side should route through here, so a
 * second copy of this mapping cannot appear later and drift.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * `info_requested`. PRD decision D-15 resolved it "in" and REQ-USR-13 describes
 * the investor seeing exactly which document categories are outstanding — but
 * the value does not exist anywhere in server.js yet, where a KYC decision is
 * still binary Approved/Declined. Adding a branch for a status the backend
 * cannot produce would be dead code that reads like a working feature. It gets
 * added when F10's three-action review does.
 */

/**
 * Maps a raw `kyc_status` to everything the UI needs to render it.
 *
 * Unknown or missing statuses fall through to the unverified branch on purpose.
 * That is the same fail-closed rule the ops portal's jurisdiction display
 * follows: an absent verdict is not evidence of a good one, and the costlier
 * mistake here is telling someone they are verified when the system does not
 * actually say so.
 */
export function getKycDisplay(kycStatus) {
  switch (kycStatus) {
    case 'Approved':
      return {
        badge: 'Verified',
        headline: 'Identity verified',
        description: 'Your identity check is complete.',
        tone: 'success',
        isVerified: true,
      };

    case 'Declined':
      return {
        badge: 'Not verified',
        headline: 'Account closed',
        // Neutral by requirement, not by vagueness. PRD REQ-USR-13: a rejected
        // investor "shows a neutral message and never the internal reason".
        // For a compliance or suspicion decline, naming the reason would be the
        // tipping-off the KYC/AML Manual §8 prohibits.
        //
        // In practice this branch is defensive: PortalLayout intercepts a
        // declined account before Settings renders at all. It exists so that
        // if that interception is ever changed or bypassed, the fallback is
        // still the compliant wording rather than whatever the default branch
        // happened to say.
        description: 'Please contact support for assistance with your account.',
        tone: 'danger',
        isVerified: false,
      };

    case 'Pending':
    default:
      return {
        badge: 'Pending',
        headline: 'Verification pending',
        description: 'Your identity check has not been completed yet.',
        tone: 'warning',
        isVerified: false,
      };
  }
}

/**
 * Tailwind classes per tone, kept beside the mapping so a new status cannot be
 * added without also deciding how it looks.
 *
 * These are real Tailwind utilities, not the hand-written `portal-*` classes in
 * src/index.css — worth noting because this project has previously shipped
 * invented utility names that silently no-op.
 */
export const KYC_TONE_CLASSES = {
  success: 'bg-emerald-500/10 text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-400',
  danger: 'bg-red-500/10 text-red-400',
};
