import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import { getApiBase } from '@/lib/utils';
import { getKycDisplay } from '@/lib/kycStatus';

/**
 * Registering interest in a property (F6 / REQ-USR-16).
 *
 * WHAT THIS DELIBERATELY IS NOT
 *
 * It is not a purchase, a reservation, or a step towards sending money. PRD
 * decision D-10 keeps Phase 1 clear of solicitation, and that only holds while
 * the amount is indicative: no allocation, no guaranteed price, no liquidity
 * promise, and no wire reference or transfer instructions anywhere on screen.
 * The server does not return any of those (see D.46 for the version that did),
 * so there is nothing here to render even by accident — keep it that way.
 *
 * THE MINIMUM IS NOT A LITERAL IN THIS FILE
 *
 * It arrives as `minimumAmount`, read from the property endpoint, which reads
 * the one constant on the server that actually decides. The server refuses a
 * low amount and names the minimum in its refusal; this component shows that
 * refusal rather than pre-empting it with its own copy of the number. A
 * hardcoded figure here would be a second source of truth, which is exactly
 * how the site came to advertise $500 while the platform enforced $3,000.
 */

function money(value) {
  const n = Number(value) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

// The three statuses migration 20 allows, in investor-facing words. An
// unknown value falls through to its raw self rather than to a blank, so a
// status added server-side shows up as visibly odd instead of invisible.
const STATUS_LABELS = {
  submitted: 'Received',
  in_progress: 'Being reviewed',
  closed: 'Closed',
};

export default function ExpressInterest({ propertyId, propertyName, minimumAmount }) {
  const { user, session } = useAuth();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState([]);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const kyc = getKycDisplay(user?.KYCStatus);
  const canRegister = kyc.isVerified;

  const loadExisting = useCallback(async () => {
    if (!user?.UserID || !session?.token) return;
    try {
      const res = await fetch(`${getApiBase()}/api/user/${user.UserID}/intents`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const payload = await res.json();
      if (!payload.success || !Array.isArray(payload.data)) return;
      // Both sides compared as strings: a property id is a BIGINT and arrives
      // as "2", while the id from the route is a string anyway.
      setExisting(
        payload.data.filter((r) => String(r.property?.propertyId) === String(propertyId)),
      );
    } catch {
      // A failure to list what they registered earlier must not stop them
      // registering now, so this stays silent and the form still renders.
    }
  }, [user?.UserID, session?.token, propertyId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter the amount you would consider investing.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/investment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ propertyId, amount: parsed }),
      });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        // The server's named refusals, turned into something an investor can
        // act on. The bounds come from the response, never from this file.
        if (payload.error === 'BELOW_MINIMUM') {
          setError(`The minimum is ${money(payload.minimum)}. Enter ${money(payload.minimum)} or more.`);
        } else if (payload.error === 'ABOVE_AVAILABLE') {
          setError(`Only ${money(payload.maximum)} of this property is still available.`);
        } else if (payload.error === 'CURRENCY_NOT_SUPPORTED') {
          setError('Amounts are in US dollars for now.');
        } else if (res.status === 401) {
          setError('Your session has expired. Please sign in again.');
        } else {
          setError('We could not record that just now. Please try again, or contact support if it keeps happening.');
        }
        return;
      }

      setAmount('');
      setJustSubmitted(true);
      await loadExisting();
    } catch {
      setError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Not verified yet: no form at all, and a route to the step that unblocks
  // it. The server refuses these too (HC-7) — this is the courtesy layer.
  if (!canRegister) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-gray-400" />
          Register your interest
        </h2>
        <p className="text-sm text-gray-500">
          {user?.KYCStatus === 'Declined'
            ? 'Please contact support for assistance with your account.'
            : 'Once your identity check is complete you can register interest in this property.'}
        </p>
        {user?.KYCStatus !== 'Declined' && (
          <Link
            to="/portal/verification"
            className="inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            Finish verification
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Register your interest</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell us roughly how much you would consider investing in {propertyName}. Someone from the
          team will follow up.
        </p>
      </div>

      {justSubmitted && (
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 flex gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-900">
            Thanks — we have recorded your interest and someone will be in touch. Nothing has been
            reserved or allocated, and you have not committed to anything.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="indicative-amount" className="block text-sm font-medium text-gray-700">
          Amount you would consider
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
          <input
            id="indicative-amount"
            name="indicative-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            placeholder={minimumAmount ? String(minimumAmount) : ''}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-7 pr-3 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
          />
        </div>

        {minimumAmount ? (
          <p className="text-xs text-gray-400">Minimum {money(minimumAmount)}.</p>
        ) : null}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Sending' : 'Register interest'}
        </button>
      </form>

      {/* Required framing, not a disclaimer bolted on. REQ-USR-16: the copy
          states it is non-binding and promises no allocation, no price and no
          liquidity. If this paragraph is ever edited, it is a compliance
          change rather than a copy tweak. */}
      <p className="text-xs leading-5 text-gray-400 flex gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          This is an expression of interest, not an investment or a commitment. It does not reserve
          or allocate any share of the property, does not fix a price, and does not guarantee that
          an investment will be available. Capital is at risk and past performance is not a guide to
          future returns.
        </span>
      </p>

      {existing.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Your interest in this property</h3>
          <ul className="space-y-1.5">
            {existing.map((item) => (
              <li key={item.requestId} className="flex items-center justify-between text-sm">
                <span className="text-gray-900 font-medium">{money(item.amount)}</span>
                <span className="text-gray-400">
                  {formatWhen(item.submittedAt)}
                  {' · '}
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
