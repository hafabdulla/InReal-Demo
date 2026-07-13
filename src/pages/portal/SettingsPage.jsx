import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MessageCircle,
  Shield,
  Bell,
  CreditCard,
  Building2,
  Globe,
  Lock,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import { getApiBase } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const countryNames = {
  US: 'United States', GB: 'United Kingdom', AE: 'United Arab Emirates',
  DE: 'Germany', IT: 'Italy', SG: 'Singapore', TH: 'Thailand',
};

export default function SettingsPage() {
  const { user, session, refreshUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Contact-info editing — the full "contact fields" group from the PRD:
  // phone, WhatsApp, and preferred contact channel. Legal name, email, and
  // country/nationality remain display-only elsewhere on this page: name and
  // nationality shouldn't change post-KYC without a fresh review, and email
  // changes are a separate, higher-friction flow out of scope for the pilot.
  const [phoneNumber, setPhoneNumber] = useState(user?.PhoneNumber || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.WhatsappNumber || '');
  const [preferredContactChannel, setPreferredContactChannel] = useState(user?.PreferredContactChannel || 'phone');
  const [contactError, setContactError] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const isValidPhoneish = (value) => /^\+?[0-9 ]{7,20}$/.test(value);

  const handleSaveContact = async () => {
    setContactError('');
    const trimmedPhone = phoneNumber.trim();
    const trimmedWhatsapp = whatsappNumber.trim();

    if (!isValidPhoneish(trimmedPhone)) {
      setContactError('Please enter a valid phone number');
      return;
    }
    if (trimmedWhatsapp !== '' && !isValidPhoneish(trimmedWhatsapp)) {
      setContactError('Please enter a valid WhatsApp number, or leave it blank');
      return;
    }

    setSavingContact(true);
    try {
      const response = await fetch(`${getApiBase()}/api/user/profile/contact`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({
          phoneNumber: trimmedPhone,
          whatsappNumber: trimmedWhatsapp,
          preferredContactChannel,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setContactError(data.error || 'Could not update your contact information.');
        setSavingContact(false);
        return;
      }

      await refreshUser();
      toast({ title: 'Contact info updated', description: 'Your contact information has been saved.' });
    } catch (error) {
      console.error('Failed to update contact info:', error);
      setContactError("We couldn't reach the server. Please try again.");
    } finally {
      setSavingContact(false);
    }
  };

  // Two-factor authentication (TOTP) — prerequisite for bank-detail
  // step-up, not built yet. 'idle' -> 'enrolling' (QR shown, awaiting a
  // code to confirm) -> 'recoveryCodes' (shown exactly once) -> back to
  // 'idle' with 2FA now active.
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpStep, setTotpStep] = useState('idle');
  const [totpLoading, setTotpLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showDisablePrompt, setShowDisablePrompt] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    const fetchTotpStatus = async () => {
      if (!session?.token) return;
      try {
        const res = await fetch(`${getApiBase()}/api/auth/totp/status`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const data = await res.json();
        if (data.success) setTotpEnabled(data.data.enabled);
      } catch (error) {
        console.error('Failed to fetch 2FA status:', error);
      }
    };
    fetchTotpStatus();
  }, [session]);

  const handleStartEnroll = async () => {
    setTotpError('');
    setTotpLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/totp/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.token || ''}` },
      });
      const data = await res.json();
      if (!data.success) {
        setTotpError(data.error || 'Could not start enrollment.');
        setTotpLoading(false);
        return;
      }
      setQrCodeDataUrl(data.data.qrCodeDataUrl);
      setTotpSecret(data.data.secret);
      setTotpStep('enrolling');
    } catch (error) {
      console.error('Failed to start 2FA enrollment:', error);
      setTotpError("We couldn't reach the server. Please try again.");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyEnroll = async () => {
    setTotpError('');
    if (!/^\d{6}$/.test(verifyCode.trim())) {
      setTotpError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setTotpLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/totp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setTotpError(data.error || 'Invalid code. Please try again.');
        setTotpLoading(false);
        return;
      }
      setRecoveryCodes(data.data.recoveryCodes);
      setTotpStep('recoveryCodes');
      setTotpEnabled(true);
      setVerifyCode('');
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      setTotpError("We couldn't reach the server. Please try again.");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleCancelEnroll = () => {
    setTotpStep('idle');
    setQrCodeDataUrl('');
    setTotpSecret('');
    setVerifyCode('');
    setTotpError('');
  };

  const handleFinishEnroll = () => {
    setTotpStep('idle');
    setRecoveryCodes([]);
    setQrCodeDataUrl('');
    setTotpSecret('');
  };

  const handleDisable = async () => {
    setTotpError('');
    if (!/^\d{6}$/.test(disableCode.trim())) {
      setTotpError('Enter your current 6-digit authenticator code.');
      return;
    }
    setTotpLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/totp/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setTotpError(data.error || 'Could not disable two-factor authentication.');
        setTotpLoading(false);
        return;
      }
      setTotpEnabled(false);
      setShowDisablePrompt(false);
      setDisableCode('');
      toast({
        title: 'Two-factor authentication disabled',
        description: 'You can also delete the "InReal" entry from your authenticator app now — it no longer works.',
      });
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      setTotpError("We couldn't reach the server. Please try again.");
    } finally {
      setTotpLoading(false);
    }
  };

  // Bank details — C.1 item 6, the highest-risk field on this whole page.
  // A request here NEVER updates bank details directly; it only creates a
  // pending row an admin has to separately approve (see the backend). The
  // one thing enforced client-side too, not just trusted from the server,
  // is that the change form only opens at all once 2FA is confirmed enabled
  // — matches the backend's own hard requirement, just surfaced earlier so
  // the investor isn't led through a form only to be rejected at the end.
  const [bankDetails, setBankDetails] = useState(null); // null = loading
  const [pendingBankRequest, setPendingBankRequest] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolderName: '', bankName: '', accountNumber: '', swiftBic: '', countryCode: '', code: '',
  });
  const [bankFormError, setBankFormError] = useState('');
  const [savingBankRequest, setSavingBankRequest] = useState(false);

  useEffect(() => {
    const fetchBankInfo = async () => {
      if (!session?.token) return;
      const authHeader = { Authorization: `Bearer ${session.token}` };
      try {
        const [detailsRes, requestsRes] = await Promise.all([
          fetch(`${getApiBase()}/api/user/profile/bank-details`, { headers: authHeader }),
          fetch(`${getApiBase()}/api/user/bank-detail-requests`, { headers: authHeader }),
        ]);
        const detailsData = await detailsRes.json();
        const requestsData = await requestsRes.json();
        if (detailsData.success) setBankDetails(detailsData.data);
        if (requestsData.success) {
          const stillPending = (requestsData.data || []).find((r) => r.Status === 'pending');
          setPendingBankRequest(stillPending || null);
        }
      } catch (error) {
        console.error('Failed to fetch bank details:', error);
      }
    };
    fetchBankInfo();
  }, [session]);

  const handleSubmitBankRequest = async () => {
    setBankFormError('');
    const { accountHolderName, bankName, accountNumber, countryCode, code } = bankForm;
    if (!accountHolderName.trim() || !bankName.trim() || !accountNumber.trim() || !countryCode.trim()) {
      setBankFormError('All fields except SWIFT/BIC are required.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setBankFormError('Enter the 6-digit code from your authenticator app to confirm this change.');
      return;
    }

    setSavingBankRequest(true);
    try {
      const res = await fetch(`${getApiBase()}/api/user/profile/bank-detail-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          swiftBic: bankForm.swiftBic.trim() || undefined,
          countryCode: countryCode.trim().toUpperCase(),
          code: code.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setBankFormError(data.error || 'Could not submit your request.');
        setSavingBankRequest(false);
        return;
      }

      setPendingBankRequest({ RequestID: data.data.requestId, Status: 'pending', CreatedAt: data.data.createdAt });
      setShowBankForm(false);
      setBankForm({ accountHolderName: '', bankName: '', accountNumber: '', swiftBic: '', countryCode: '', code: '' });
      toast({ title: 'Request submitted', description: 'Your bank detail change is now pending review.' });
    } catch (error) {
      console.error('Failed to submit bank detail request:', error);
      setBankFormError("We couldn't reach the server. Please try again.");
    } finally {
      setSavingBankRequest(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  ];

  const tabButtonClass = (isActive) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-[#01CED1]/10 text-[#01CED1]'
        : 'text-portal-secondary hover:text-portal-primary hover:bg-portal-tertiary'
    }`;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-portal-primary">Settings</h1>
        <p className="text-portal-secondary mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex-shrink-0">
          <div className="portal-card p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={tabButtonClass(activeTab === tab.id)}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="portal-card space-y-6">
                <h3 className="font-semibold text-portal-primary text-lg">Profile Information</h3>

                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-[#01CED1]/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-[#01CED1]" />
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#01CED1] text-[#0F0F0F] rounded-lg flex items-center justify-center hover:bg-[#00B8BB] transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-portal-primary">Profile Photo</p>
                    <p className="text-sm text-portal-secondary">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>

                {/* Read-only: legal name, email, and nationality shouldn't
                    change post-KYC without a fresh compliance review, and
                    email changes are a separate flow out of scope for the
                    pilot. Not a bug that these can't be edited — that's the
                    point. */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-portal-secondary mb-1.5">First Name</label>
                    <input type="text" value={user?.FirstName || ''} readOnly className="portal-input opacity-80" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-portal-secondary mb-1.5">Last Name</label>
                    <input type="text" value={user?.LastName || ''} readOnly className="portal-input opacity-80" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                    <input
                      type="email"
                      value={user?.Email || ''}
                      readOnly
                      className="portal-input pl-10 opacity-80"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                    <input
                      type="text"
                      value={countryNames[user?.CountryCode] || user?.CountryCode || ''}
                      readOnly
                      className="portal-input pl-10 opacity-80"
                    />
                  </div>
                </div>

                <p className="text-xs text-portal-tertiary">
                  Need to update your legal name, nationality, or address? Contact support — these require a fresh identity check and can't be changed here.
                </p>
              </div>

              {/* The one genuinely editable field on this page, deliberately
                  separated into its own card with its own save action —
                  everything above is read-only, so a single shared "Save
                  Changes" button covering both would be misleading. */}
              <div className="portal-card space-y-4">
                <h3 className="font-semibold text-portal-primary text-lg">Contact Information</h3>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setContactError(''); }}
                      placeholder="+65 91234567"
                      className="portal-input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">
                    WhatsApp Number <span className="text-portal-tertiary font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-tertiary" />
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => { setWhatsappNumber(e.target.value); setContactError(''); }}
                      placeholder="Leave blank if same as phone, or not on WhatsApp"
                      className="portal-input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Preferred Contact Method</label>
                  <select
                    value={preferredContactChannel}
                    onChange={(e) => { setPreferredContactChannel(e.target.value); setContactError(''); }}
                    className="portal-input appearance-none"
                  >
                    <option value="phone">Phone call / SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {contactError && <p className="text-sm text-red-400">{contactError}</p>}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveContact}
                    disabled={savingContact}
                    className="portal-btn-primary text-sm py-2.5 disabled:opacity-60"
                  >
                    {savingContact ? 'Saving...' : 'Save Contact Info'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="portal-card space-y-4">
                <h3 className="font-semibold text-portal-primary text-lg">Change Password</h3>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Current Password</label>
                  <input type="password" className="portal-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">New Password</label>
                  <input type="password" className="portal-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-portal-secondary mb-1.5">Confirm New Password</label>
                  <input type="password" className="portal-input" />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="portal-btn-primary text-sm py-2.5">Update Password</button>
                </div>
              </div>

              <div className="portal-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-portal-tertiary flex items-center justify-center">
                      <Lock className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-portal-primary">Two-Factor Authentication</p>
                      <p className="text-sm text-portal-secondary">
                        {totpEnabled ? 'Enabled — using an authenticator app' : 'Add an extra layer of security'}
                      </p>
                    </div>
                  </div>
                  {totpStep === 'idle' && !totpEnabled && (
                    <button onClick={handleStartEnroll} disabled={totpLoading} className="portal-btn-secondary text-sm py-2 px-4 disabled:opacity-60">
                      {totpLoading ? 'Loading...' : 'Enable'}
                    </button>
                  )}
                  {totpStep === 'idle' && totpEnabled && !showDisablePrompt && (
                    <button onClick={() => { setShowDisablePrompt(true); setTotpError(''); }} className="portal-btn-secondary text-sm py-2 px-4">
                      Disable
                    </button>
                  )}
                </div>

                {/* Step 1: scan the QR code, enter a code to confirm */}
                {totpStep === 'enrolling' && (
                  <div className="pt-2 border-t border-[hsl(var(--portal-border-subtle))] space-y-4">
                    <p className="text-sm text-portal-secondary">
                      Scan this with an authenticator app (Google Authenticator, Authy, etc.), or enter the code manually.
                    </p>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-400">
                        <strong>Re-enrolling?</strong> This creates a brand new code — your app won't automatically remove
                        an old "InReal" entry from before. Delete any existing InReal entry in your authenticator app now,
                        so you don't end up with two and aren't sure which one still works.
                      </p>
                    </div>
                    {qrCodeDataUrl && (
                      <img src={qrCodeDataUrl} alt="2FA QR code" className="rounded-lg border border-[hsl(var(--portal-border-subtle))] w-40 h-40" />
                    )}
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">Manual entry code</label>
                      <input type="text" readOnly value={totpSecret} className="portal-input font-mono text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">Enter the 6-digit code from your app</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '')); setTotpError(''); }}
                        placeholder="123456"
                        className="portal-input font-mono tracking-widest text-center"
                      />
                    </div>
                    {totpError && <p className="text-sm text-red-400">{totpError}</p>}
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEnroll} className="portal-btn-secondary text-sm py-2 px-4">Cancel</button>
                      <button onClick={handleVerifyEnroll} disabled={totpLoading} className="portal-btn-primary text-sm py-2 px-4 disabled:opacity-60">
                        {totpLoading ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: recovery codes, shown exactly once */}
                {totpStep === 'recoveryCodes' && (
                  <div className="pt-2 border-t border-[hsl(var(--portal-border-subtle))] space-y-4">
                    <p className="text-sm font-medium text-emerald-400">✓ Two-factor authentication is now enabled.</p>
                    <p className="text-sm text-portal-secondary">
                      Save these recovery codes somewhere safe. Each one can be used once, if you ever lose access to your authenticator app.
                      <strong> They're shown here only this one time.</strong>
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-portal-tertiary rounded-lg p-4 font-mono text-sm">
                      {recoveryCodes.map((code) => (
                        <div key={code}>{code}</div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleFinishEnroll} className="portal-btn-primary text-sm py-2 px-4">
                        I've saved these codes
                      </button>
                    </div>
                  </div>
                )}

                {/* Disable — always requires a fresh code, never a plain toggle */}
                {showDisablePrompt && (
                  <div className="pt-2 border-t border-[hsl(var(--portal-border-subtle))] space-y-3">
                    <p className="text-sm text-portal-secondary">Enter your current authenticator code to disable two-factor authentication.</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, '')); setTotpError(''); }}
                      placeholder="123456"
                      className="portal-input font-mono tracking-widest text-center"
                    />
                    {totpError && <p className="text-sm text-red-400">{totpError}</p>}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowDisablePrompt(false); setDisableCode(''); setTotpError(''); }} className="portal-btn-secondary text-sm py-2 px-4">
                        Cancel
                      </button>
                      <button onClick={handleDisable} disabled={totpLoading} className="portal-btn-primary text-sm py-2 px-4 disabled:opacity-60">
                        {totpLoading ? 'Disabling...' : 'Confirm Disable'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="portal-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-portal-tertiary flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-portal-primary">KYC Verification</p>
                      <p className="text-sm text-portal-secondary">
                        {/* CORRECTION 09 July 2026: 'Approved' was correct originally — reverted after a mis-read of the KYC-decision code's column order. */}
                        {user?.KYCStatus === 'Approved' ? 'Identity verified' : 'Verification pending'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-lg ${
                    user?.IdentityVerified
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {user?.IdentityVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="portal-card"
            >
              <h3 className="font-semibold text-portal-primary text-lg mb-6">Notification Preferences</h3>
              <div className="space-y-5">
                {[
                  { title: 'Distribution Payments', desc: 'Get notified when you receive distributions', defaultOn: true },
                  { title: 'New Properties', desc: 'Be the first to know about new listings', defaultOn: true },
                  { title: 'Investment Updates', desc: 'Updates about your property investments', defaultOn: true },
                  { title: 'Price Alerts', desc: 'Notifications when property values change', defaultOn: false },
                  { title: 'Marketing Emails', desc: 'Promotions, tips and InReal news', defaultOn: false },
                ].map((item) => (
                  <NotificationToggle key={item.title} {...item} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'payment' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="portal-card space-y-4">
                <h3 className="font-semibold text-portal-primary text-lg">Bank Details</h3>

                {/* Current linked account, masked — never the full number */}
                {bankDetails?.linked && (
                  <div className="flex items-center justify-between p-4 border border-portal-subtle rounded-xl bg-portal-tertiary">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-portal-secondary flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#01CED1]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-portal-primary">{bankDetails.bankName} {bankDetails.maskedAccountNumber}</p>
                        <p className="text-xs text-portal-tertiary">{bankDetails.accountHolderName}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg">On file</span>
                  </div>
                )}
                {bankDetails && !bankDetails.linked && (
                  <p className="text-sm text-portal-secondary">No bank account on file yet.</p>
                )}

                {/* A request is already pending review */}
                {pendingBankRequest && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm font-medium text-amber-400">Change pending review</p>
                    <p className="text-xs text-portal-secondary mt-1">
                      Submitted {new Date(pendingBankRequest.CreatedAt).toLocaleDateString()}. This can take up to 2 business days.
                    </p>
                  </div>
                )}

                {/* Everything below requires 2FA to be enabled first — same
                    rule the backend enforces, surfaced here before the
                    investor fills out a form only to be rejected at the end. */}
                {!totpEnabled && !pendingBankRequest && (
                  <p className="text-sm text-portal-secondary">
                    Enable two-factor authentication in the <button onClick={() => setActiveTab('security')} className="text-[#01CED1] hover:underline">Security tab</button> before changing bank details — this protects against your account being used to redirect your payouts.
                  </p>
                )}

                {totpEnabled && !pendingBankRequest && !showBankForm && (
                  <button
                    onClick={() => setShowBankForm(true)}
                    className="w-full py-2.5 border-2 border-dashed border-portal-subtle text-portal-secondary hover:border-[#01CED1] hover:text-[#01CED1] rounded-xl text-sm font-medium transition-colors"
                  >
                    {bankDetails?.linked ? '+ Request a Change' : '+ Add Bank Account'}
                  </button>
                )}

                {showBankForm && (
                  <div className="pt-2 border-t border-[hsl(var(--portal-border-subtle))] space-y-3">
                    <p className="text-sm text-portal-secondary">
                      This change goes to our team for review before it takes effect — it won't update immediately.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">Account Holder Name</label>
                      <input
                        type="text"
                        value={bankForm.accountHolderName}
                        onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                        className="portal-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        className="portal-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">Account Number</label>
                      <input
                        type="text"
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                        className="portal-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">
                        SWIFT/BIC <span className="text-portal-tertiary font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={bankForm.swiftBic}
                        onChange={(e) => setBankForm({ ...bankForm, swiftBic: e.target.value })}
                        className="portal-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">Bank Country (2-letter code)</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={bankForm.countryCode}
                        onChange={(e) => setBankForm({ ...bankForm, countryCode: e.target.value.toUpperCase() })}
                        placeholder="SG"
                        className="portal-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-portal-secondary mb-1.5">
                        Authenticator Code <span className="text-portal-tertiary font-normal">(confirms it's really you)</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={bankForm.code}
                        onChange={(e) => setBankForm({ ...bankForm, code: e.target.value.replace(/\D/g, '') })}
                        placeholder="123456"
                        className="portal-input font-mono tracking-widest text-center"
                      />
                    </div>
                    {bankFormError && <p className="text-sm text-red-400">{bankFormError}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => { setShowBankForm(false); setBankFormError(''); }} className="portal-btn-secondary text-sm py-2 px-4">
                        Cancel
                      </button>
                      <button onClick={handleSubmitBankRequest} disabled={savingBankRequest} className="portal-btn-primary text-sm py-2 px-4 disabled:opacity-60">
                        {savingBankRequest ? 'Submitting...' : 'Submit for Review'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ title, desc, defaultOn }) {
  const [enabled, setEnabled] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-portal-primary">{title}</p>
        <p className="text-sm text-portal-secondary">{desc}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-[#01CED1]' : 'bg-portal-tertiary'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}