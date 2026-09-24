import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/lib/utils';
import { COUNTRIES, countryName } from '@/lib/countries';

// REQ-USR-14: once verification is approved, legal name, nationality,
// residence and date of birth are locked. This card is the route a change
// takes instead — the investor proposes it with evidence, and our team decides.
// Nothing here edits the account directly; the server enforces that, and this
// card only ever calls the request endpoint.
//
// The evidence rules mirror requiredIdentityEvidence() in server.js so the
// investor is asked for the right document before submitting. The server
// applies the same rules and is the control.

const MAX_FILE_BYTES = 8 * 1024 * 1024; // courtesy only; the server's limit is the control
const ACCEPTED = 'application/pdf,image/jpeg,image/png';

const STATUS_TEXT = {
  pending: 'Waiting for review',
  approved: 'Applied',
  rejected: 'Not accepted',
};

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function formatDay(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function sameList(a, b) {
  const x = [...(a || [])].sort();
  const y = [...(b || [])].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export default function IdentityChangeRequestCard({ user, session, toast }) {
  const [requests, setRequests] = useState(null); // null = loading
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(null);
  const [identityFile, setIdentityFile] = useState(null);
  const [addressFile, setAddressFile] = useState(null);
  const [addressIssuedOn, setAddressIssuedOn] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch(`${getApiBase()}/api/user/identity-change-requests`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      setRequests(data.success ? data.data : []);
    } catch {
      setRequests([]);
    }
  }, [session?.token]);

  useEffect(() => { load(); }, [load]);

  const current = useMemo(() => ({
    firstName: user?.FirstName || '',
    lastName: user?.LastName || '',
    nationalities: user?.Nationalities || [],
    countryOfResidence: user?.CountryOfResidence || '',
    dateOfBirth: user?.DateOfBirth || '',
  }), [user?.FirstName, user?.LastName, user?.Nationalities, user?.CountryOfResidence, user?.DateOfBirth]);

  const openForm = () => {
    setForm({ ...current, nationalities: [...current.nationalities], reason: '' });
    setIdentityFile(null);
    setAddressFile(null);
    setAddressIssuedOn('');
    setError('');
    setShowForm(true);
  };

  // Only what actually differs from the account is sent.
  const changes = useMemo(() => {
    if (!form) return {};
    const out = {};
    if (form.firstName.trim() !== current.firstName) out.firstName = form.firstName.trim();
    if (form.lastName.trim() !== current.lastName) out.lastName = form.lastName.trim();
    if (!sameList(form.nationalities, current.nationalities)) out.nationalities = form.nationalities;
    if (form.countryOfResidence !== current.countryOfResidence) out.countryOfResidence = form.countryOfResidence;
    if (form.dateOfBirth !== current.dateOfBirth) out.dateOfBirth = form.dateOfBirth;
    return out;
  }, [form, current]);

  const needsIdentity = 'firstName' in changes || 'lastName' in changes || 'dateOfBirth' in changes;
  const needsAddress = 'countryOfResidence' in changes;
  const onlyNationality = Object.keys(changes).length > 0 && !needsIdentity && !needsAddress;

  const pending = (requests || []).find((r) => r.Status === 'pending');
  const lastDecided = (requests || []).find((r) => r.Status !== 'pending');

  const submit = async () => {
    setError('');
    if (Object.keys(changes).length === 0) {
      setError('Change at least one detail before sending the request.');
      return;
    }
    if (!form.reason.trim()) {
      setError('Tell us why these details are changing.');
      return;
    }
    if (needsIdentity && !identityFile) {
      setError('Attach a current passport or national ID showing the new details.');
      return;
    }
    if (needsAddress && (!addressFile || !addressIssuedOn)) {
      setError('Attach a proof of address in the new country and the date it was issued.');
      return;
    }
    for (const f of [needsIdentity ? identityFile : null, needsAddress ? addressFile : null]) {
      if (f && f.size > MAX_FILE_BYTES) {
        setError('Files must be 8 MB or smaller.');
        return;
      }
    }

    setSaving(true);
    try {
      const body = { ...changes, reason: form.reason.trim() };
      if (needsIdentity) {
        body.identityFileBase64 = await readFileAsBase64(identityFile);
        body.identityFileName = identityFile.name;
      }
      if (needsAddress) {
        body.addressFileBase64 = await readFileAsBase64(addressFile);
        body.addressFileName = addressFile.name;
        body.addressIssuedOn = addressIssuedOn;
      }
      const res = await fetch(`${getApiBase()}/api/user/identity-change-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token || ''}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Could not send your request.');
        return;
      }
      setShowForm(false);
      toast({ title: 'Request sent', description: 'Our team will review it before your details change.' });
      await load();
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-card space-y-4">
      <h3 className="font-semibold text-portal-primary text-lg">Change your details</h3>

      {requests === null && <p className="text-sm text-portal-tertiary">Loading…</p>}

      {pending && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium text-amber-200">Change waiting for review</p>
          <p className="text-portal-secondary mt-1">
            {pending.Fields.join(', ')} — sent {formatDay(pending.CreatedAt)}. Your details stay as they are until our team has checked it.
          </p>
        </div>
      )}

      {!pending && lastDecided && (
        <div className="rounded-xl border border-[hsl(var(--portal-border-subtle))] p-4 text-sm">
          <p className="text-portal-primary">
            Your last request ({lastDecided.Fields.join(', ')}): <span className="font-medium">{STATUS_TEXT[lastDecided.Status] || lastDecided.Status}</span>
            {lastDecided.ReviewedAt ? ` on ${formatDay(lastDecided.ReviewedAt)}` : ''}.
          </p>
          {lastDecided.RejectionReason && (
            <p className="text-portal-secondary mt-1">{lastDecided.RejectionReason}</p>
          )}
        </div>
      )}

      {requests !== null && !pending && !showForm && (
        <>
          <p className="text-sm text-portal-secondary">
            Your name, nationality, country of residence and date of birth are locked because your verification is complete. If any of them has changed, send us a request and our team will check it before updating your account.
          </p>
          <button
            type="button"
            onClick={openForm}
            className="w-full py-2.5 border-2 border-dashed border-portal-subtle text-portal-secondary hover:border-[#01CED1] hover:text-[#01CED1] rounded-xl text-sm font-medium transition-colors"
          >
            Request a change to these details
          </button>
        </>
      )}

      {showForm && form && (
        <div className="space-y-3 pt-2 border-t border-[hsl(var(--portal-border-subtle))]">
          <p className="text-sm text-portal-secondary">
            Change only what is different. Nothing updates until our team has reviewed it.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-portal-secondary mb-1.5" htmlFor="icr-first">First Name</label>
              <input id="icr-first" type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="portal-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-portal-secondary mb-1.5" htmlFor="icr-last">Last Name</label>
              <input id="icr-last" type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="portal-input" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-secondary mb-1.5">
              Nationality <span className="text-portal-tertiary font-normal">(every nationality you hold)</span>
            </label>
            {form.nationalities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.nationalities.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setForm({ ...form, nationalities: form.nationalities.filter((c) => c !== code) })}
                    className="flex items-center gap-1.5 rounded-full bg-teal-500/15 text-teal-300 px-3 py-1 text-xs hover:bg-teal-500/25 transition-colors"
                    aria-label={`Remove ${countryName(code)}`}
                  >
                    {countryName(code)}
                    <span aria-hidden="true">&times;</span>
                  </button>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={(e) => { if (e.target.value) setForm({ ...form, nationalities: [...form.nationalities, e.target.value] }); }}
              className="portal-input"
              disabled={form.nationalities.length >= 5}
            >
              <option value="">{form.nationalities.length >= 5 ? 'Maximum of 5 reached' : 'Add a nationality…'}</option>
              {COUNTRIES.filter((c) => !form.nationalities.includes(c.code)).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-portal-secondary mb-1.5" htmlFor="icr-residence">Country of Residence</label>
              <select id="icr-residence" value={form.countryOfResidence} onChange={(e) => setForm({ ...form, countryOfResidence: e.target.value })} className="portal-input">
                <option value="">Select…</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-portal-secondary mb-1.5" htmlFor="icr-dob">Date of Birth</label>
              <input id="icr-dob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="portal-input" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-secondary mb-1.5" htmlFor="icr-reason">Why are these changing?</label>
            <textarea
              id="icr-reason"
              rows={2}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="For example: name change after marriage, or moved to a new country"
              className="portal-input"
            />
          </div>

          {needsIdentity && (
            <div>
              <label className="block text-sm font-medium text-portal-secondary mb-1.5" htmlFor="icr-idfile">Passport or national ID</label>
              <input id="icr-idfile" type="file" accept={ACCEPTED} onChange={(e) => setIdentityFile(e.target.files?.[0] || null)}
                className="portal-input text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#01CED1]/10 file:px-3 file:py-1 file:text-[#01CED1]" />
              <p className="text-xs text-portal-tertiary mt-1.5">A current document showing your new name or date of birth. PDF, JPG or PNG, up to 8 MB.</p>
            </div>
          )}

          {needsAddress && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-portal-secondary" htmlFor="icr-addrfile">Proof of address in the new country</label>
              <input id="icr-addrfile" type="file" accept={ACCEPTED} onChange={(e) => setAddressFile(e.target.files?.[0] || null)}
                className="portal-input text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#01CED1]/10 file:px-3 file:py-1 file:text-[#01CED1]" />
              <label className="block text-xs text-portal-tertiary" htmlFor="icr-addrdate">Date on the document (must be less than three months old)</label>
              <input id="icr-addrdate" type="date" value={addressIssuedOn} onChange={(e) => setAddressIssuedOn(e.target.value)} className="portal-input" />
            </div>
          )}

          {onlyNationality && (
            <p className="text-xs text-portal-tertiary">
              No document is needed for a change of nationality. Please make sure you have listed every nationality you hold.
            </p>
          )}

          <p className="text-xs text-portal-tertiary">
            We'll email the address on your account when you send this and again if it's applied, so you'll know if anyone else tries to change your details.
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="portal-btn-secondary text-sm py-2 px-4">Cancel</button>
            <button type="button" onClick={submit} disabled={saving} className="portal-btn-primary text-sm py-2 px-4 disabled:opacity-60">
              {saving ? 'Sending...' : 'Send for review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
