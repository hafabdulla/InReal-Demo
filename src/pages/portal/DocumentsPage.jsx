import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Inbox, Building2, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/SQLServerAuthContext';
import { getApiBase } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const categoryStyles = {
  KYC: 'bg-blue-50 text-blue-700 border-blue-100',
  Finance: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Property: 'bg-amber-50 text-amber-700 border-amber-100',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Splits the flat list the API returns into the boxes the product owner asked
// for: general documents in one box, then one box per property.
//
// A document with no PropertyID is general — that is a real category (a KYC
// file, an account statement), not missing data, so it gets its own box rather
// than being hidden or lumped under some placeholder property.
//
// Grouping happens here rather than server-side because the ordering the
// investor sees is a presentation concern, and the API's flat, newest-first
// list is also what the admin queue wants. Splitting it once here keeps one
// endpoint serving both.
function groupDocuments(documents) {
  const general = [];
  const byProperty = new Map();

  for (const doc of documents) {
    if (!doc.PropertyID) {
      general.push(doc);
      continue;
    }
    const key = String(doc.PropertyID);
    if (!byProperty.has(key)) {
      byProperty.set(key, {
        propertyId: doc.PropertyID,
        // Fall back to the id if the join produced no name — better than
        // rendering an empty heading if a property is ever removed.
        propertyName: doc.PropertyName || `Property #${doc.PropertyID}`,
        propertyCity: doc.PropertyCity || '',
        documents: [],
      });
    }
    byProperty.get(key).documents.push(doc);
  }

  // Properties sorted by name so the boxes don't reshuffle between visits just
  // because someone uploaded a new document.
  const properties = [...byProperty.values()].sort((a, b) =>
    a.propertyName.localeCompare(b.propertyName)
  );

  return { general, properties };
}

function DocumentRow({ doc, index, onDownload, downloadingId }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex items-center justify-between gap-4 px-6 py-4"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{doc.Label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                categoryStyles[doc.Category] || 'bg-gray-50 text-gray-600 border-gray-100'
              }`}
            >
              {doc.Category}
            </span>
            <span className="text-xs text-gray-400">{formatDate(doc.CreatedAt)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onDownload(doc)}
        disabled={downloadingId === doc.DocumentID}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-accent hover:bg-steel-blue text-white text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
      >
        <Download className="w-4 h-4" />
        {downloadingId === doc.DocumentID ? 'Downloading...' : 'Download'}
      </button>
    </motion.div>
  );
}

function DocumentBox({ title, subtitle, icon: Icon, documents, onDownload, downloadingId }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-gray-500" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>
        <span className="ml-auto text-xs text-gray-400 shrink-0">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {documents.map((doc, i) => (
          <DocumentRow
            key={doc.DocumentID}
            doc={doc}
            index={i}
            onDownload={onDownload}
            downloadingId={downloadingId}
          />
        ))}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!session?.token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${getApiBase()}/api/user/documents`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const data = await res.json();
        if (data.success) {
          setDocuments(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [session]);

  // Fetches the file as an authenticated blob and triggers a save, the same
  // way the admin portal does it — a plain link/window.open wouldn't carry
  // the Authorization header, and this document may belong to no one but
  // this investor, so the request has to be authenticated either way.
  const handleDownload = async (doc) => {
    setDownloadingId(doc.DocumentID);
    try {
      const res = await fetch(`${getApiBase()}/api/user/documents/${doc.DocumentID}/file`, {
        headers: { Authorization: `Bearer ${session?.token || ''}` },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.OriginalFileName || `document-${doc.DocumentID}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Document download failed:', error);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: "We couldn't download that document. Please try again.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-grey">Loading documents...</p>
      </div>
    );
  }

  const { general, properties } = groupDocuments(documents);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Documents</h1>
        <p className="text-gray-500 mt-1">
          Statements, KYC records, and property documents shared with you
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900">No documents yet</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-sm">
              Documents shared with you by our team — KYC records, statements, and
              property paperwork — will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* General documents first — these are the ones that apply to the
              investor overall rather than to any single property. Only rendered
              when there are some, so an investor whose documents are all
              property-specific doesn't see an empty box. */}
          {general.length > 0 && (
            <DocumentBox
              title="General documents"
              subtitle="Not specific to a single property"
              icon={FolderOpen}
              documents={general}
              onDownload={handleDownload}
              downloadingId={downloadingId}
            />
          )}

          {properties.map((group) => (
            <DocumentBox
              key={group.propertyId}
              title={group.propertyName}
              subtitle={group.propertyCity}
              icon={Building2}
              documents={group.documents}
              onDownload={handleDownload}
              downloadingId={downloadingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
