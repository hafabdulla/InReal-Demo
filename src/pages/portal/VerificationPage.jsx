import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Info,
} from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import { getApiBase } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Guidance per requirement. Deliberately specific about what will be rejected —
// the operator's rejection reasons are a fixed list (unreadable, expired, too
// old, wrong type, name mismatch, incomplete), so telling the investor up front
// what those checks are is the cheapest way to avoid a round trip.
const REQUIREMENT_GUIDANCE = {
  identity: {
    title: 'Passport or national ID',
    blurb:
      'A clear scan or photo of your passport photo page, or both sides of your national ID card. Make sure all four corners are visible and nothing is cut off.',
  },
  proof_of_address: {
    title: 'Proof of address',
    blurb:
      'A utility bill or bank statement showing your name and home address. It must be recent — we cannot accept a document more than three months old.',
  },
};

const STATUS_PRESENTATION = {
  missing: {
    label: 'Not yet uploaded',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    Icon: Upload,
  },
  awaiting_review: {
    label: 'Awaiting review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: Clock,
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  rejected: {
    label: 'Needs replacing',
    className: 'bg-red-50 text-red-700 border-red-200',
    Icon: AlertCircle,
  },
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = 'application/pdf,image/jpeg,image/png';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isoDaysFromToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status }) {
  const presentation = STATUS_PRESENTATION[status] || STATUS_PRESENTATION.missing;
  const { Icon } = presentation;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${presentation.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {presentation.label}
    </span>
  );
}

function RequirementCard({ requirement, maxAgeMonths, onUpload, busy }) {
  const fileInputRef = useRef(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [localError, setLocalError] = useState('');

  const needsDate = requirement.type === 'proof_of_address';
  const guidance = REQUIREMENT_GUIDANCE[requirement.type] || { title: requirement.label, blurb: '' };
  const isAccepted = requirement.status === 'accepted';

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setLocalError('');
    if (!file) {
      setPendingFile(null);
      return;
    }
    // Checked here for a fast, friendly message only. The server re-checks both
    // the size and the actual file signature, and that check is the control —
    // this one is skippable by anyone who wants to skip it.
    if (file.size > MAX_FILE_BYTES) {
      setLocalError('That file is larger than 8 MB. Please upload a smaller scan or photo.');
      setPendingFile(null);
      return;
    }
    setPendingFile(file);
  };

  const handleSubmit = async () => {
    setLocalError('');
    if (!pendingFile) {
      setLocalError('Choose a file first.');
      return;
    }
    if (needsDate && !issuedOn) {
      setLocalError('Enter the date shown on the document before uploading.');
      return;
    }
    const succeeded = await onUpload(requirement.type, pendingFile, needsDate ? issuedOn : undefined);
    if (succeeded) {
      setPendingFile(null);
      setIssuedOn('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{guidance.title}</h3>
          <p className="text-sm text-slate-grey mt-1">{guidance.blurb}</p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={requirement.status} />
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {requirement.document && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{requirement.document.originalFileName}</span>
            <span className="text-gray-300">•</span>
            <span className="whitespace-nowrap">
              sent {formatDate(requirement.document.uploadedAt)}
            </span>
          </div>
        )}

        {/* The operator's internal note is never sent to this page. What renders
            here is the fixed, disclosable sentence the server maps from the
            rejection reason code. */}
        {requirement.status === 'rejected' && requirement.rejectionReason && (
          <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">We could not accept this document</p>
              <p className="mt-1">{requirement.rejectionReason}</p>
              <p className="mt-1 text-red-600">Please upload a replacement below.</p>
            </div>
          </div>
        )}

        {requirement.status === 'awaiting_review' && (
          <p className="text-sm text-slate-grey">
            Our team is checking this document. You do not need to do anything else for now — you can
            still replace it below if you sent the wrong file.
          </p>
        )}

        {isAccepted ? (
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Checked and accepted by our team.
          </p>
        ) : (
          <div className="space-y-3">
            {needsDate && (
              <div>
                <label
                  htmlFor={`issued-${requirement.type}`}
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Date shown on the document
                </label>
                <input
                  id={`issued-${requirement.type}`}
                  type="date"
                  value={issuedOn}
                  onChange={(e) => setIssuedOn(e.target.value)}
                  // Bounded to the window the compliance rule allows, so an
                  // out-of-range date is hard to enter rather than only being
                  // rejected after upload.
                  min={isoDaysFromToday(-31 * maxAgeMonths)}
                  max={isoDaysFromToday(0)}
                  className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-accent/40 focus:border-primary-accent text-gray-900"
                />
                <p className="text-xs text-slate-grey mt-1.5">
                  Must be within the last {maxAgeMonths} months.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor={`file-${requirement.type}`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                {requirement.status === 'missing' ? 'Choose a file' : 'Choose a replacement file'}
              </label>
              <input
                id={`file-${requirement.type}`}
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIME}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer"
              />
              <p className="text-xs text-slate-grey mt-1.5">PDF, JPEG or PNG, up to 8 MB.</p>
            </div>

            {localError && <p className="text-sm text-red-600">{localError}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !pendingFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-accent hover:bg-steel-blue text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {busy ? 'Uploading…' : 'Upload document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState([]);
  const [complete, setComplete] = useState(false);
  const [maxAgeMonths, setMaxAgeMonths] = useState(3);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);

  const load = useCallback(async () => {
    if (!session?.token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${getApiBase()}/api/user/kyc-documents`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequirements(data.data?.requirements || []);
        setComplete(Boolean(data.data?.complete));
        if (data.data?.proofOfAddressMaxAgeMonths) {
          setMaxAgeMonths(data.data.proofOfAddressMaxAgeMonths);
        }
      }
    } catch (error) {
      console.error('Failed to load verification status:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (kycDocumentType, file, documentIssuedOn) => {
    setUploadingType(kycDocumentType);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const res = await fetch(`${getApiBase()}/api/user/kyc-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
        },
        body: JSON.stringify({
          kycDocumentType,
          fileBase64,
          fileName: file.name,
          ...(documentIssuedOn ? { documentIssuedOn } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // The server's message is shown as-is. Every rejection it produces here
        // is written for the investor and says what to do differently — a
        // generic "upload failed" would throw that away.
        toast({
          variant: 'destructive',
          title: 'We could not accept that file',
          description: data.error || 'Please try again.',
        });
        return false;
      }
      toast({
        title: 'Document received',
        description: 'Our team will check it and let you know if anything else is needed.',
      });
      await load();
      return true;
    } catch (error) {
      console.error('Document upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Something went wrong sending that file. Please try again.',
      });
      return false;
    } finally {
      setUploadingType(null);
    }
  };

  const outstanding = useMemo(
    () => requirements.filter((r) => r.status !== 'accepted').length,
    [requirements]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-grey">Loading verification status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-accent/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verification</h1>
            <p className="text-slate-grey">The documents we need before your account can be approved</p>
          </div>
        </div>
      </motion.div>

      {complete ? (
        <div className="flex gap-3 p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-900">
            <p className="font-medium">All your documents have been accepted</p>
            <p className="mt-1">
              There is nothing further for you to upload. Our team will complete your review and your
              account status will update once a decision has been made.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 p-5 rounded-2xl bg-blue-50 border border-blue-100">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">
              {outstanding === requirements.length
                ? 'We need two documents from you'
                : `${outstanding} document${outstanding === 1 ? '' : 's'} still outstanding`}
            </p>
            <p className="mt-1">
              These are required for every investor, whatever amount you plan to invest. Your account
              cannot be approved until both have been provided and checked by our team.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {requirements.map((requirement) => (
          <RequirementCard
            key={requirement.type}
            requirement={requirement}
            maxAgeMonths={maxAgeMonths}
            onUpload={handleUpload}
            busy={uploadingType === requirement.type}
          />
        ))}
      </div>

      <p className="text-xs text-slate-grey">
        Your documents are stored privately and are only ever visible to you and to the InReal team
        members responsible for verification.
      </p>
    </div>
  );
}
