import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import legal from '@/data/legal.json';

// Renders the Terms & Conditions and the Policies as real pages.
//
// The content in `src/data/legal.json` is EXTRACTED from the signed PDFs by
// `tools/parse-legal-documents.py`, not retyped. That matters: this is the text
// that governs the investor relationship, and a transcription slip would be
// both invisible and binding. The parser fails loudly if the reassembled text
// does not match the source character for character, so regenerating it is the
// safe way to update these pages when a new version is issued.
//
// DO NOT hand-edit legal.json. Re-run the parser against the new PDF.
//
// What is deliberately NOT reproduced here: the per-page "Confidential" footer
// and the cover page's confidentiality legend. Those are document-control
// markings on a paginated file, not operative clauses — and a public page that
// tells the reader they may not read it is incoherent. See the tracker entry
// for the open question that goes with this.

function Clause({ clause }) {
  return (
    <div className="mb-5">
      {clause.title && (
        <h3 className="font-semibold text-ir-white mb-1.5">
          <span className="tabular-nums mr-2">{clause.number}</span>
          {clause.title}
        </h3>
      )}
      {clause.text && (
        <p className="text-ir-white/80 leading-relaxed">
          {clause.number && !clause.title && (
            <span className="font-semibold text-ir-white mr-2 tabular-nums">{clause.number}</span>
          )}
          {clause.text}
        </p>
      )}
      {clause.items?.length > 0 && (
        <ul className={`space-y-2 pl-4 sm:pl-6 border-l border-ir-border-dark ${clause.text ? 'mt-3' : 'mt-2'}`}>
          {/* Keyed by index, not by label. A clause can legitimately contain
              more than one lettered list, so "(a)" is not unique within a
              clause — keying on it made React warn about duplicate keys and
              risked omitting or duplicating a sub-clause of a legal document. */}
          {clause.items.map((item, i) => (
            <li key={i} className="text-ir-white/70 leading-relaxed">
              <span className="font-medium text-ir-teal mr-1.5">{item.label}</span>
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LegalPage({ docKey }) {
  const doc = legal[docKey];
  const location = useLocation();

  // Section ids are derived from the number rather than the heading, so an
  // anchor someone bookmarked does not break when a heading is reworded.
  const sections = useMemo(() => doc?.sections || [], [doc]);

  if (!doc) {
    return (
      <div className="min-h-screen bg-ir-dark text-ir-white flex items-center justify-center px-6">
        <p className="text-ir-text-secondary">That document could not be found.</p>
      </div>
    );
  }

  const otherKey = docKey === 'terms' ? 'policies' : 'terms';
  const otherPath = otherKey === 'terms' ? '/terms' : '/policies';

  return (
    <div className="min-h-screen bg-ir-dark text-ir-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-ir-text-secondary hover:text-ir-teal transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to InReal
        </Link>

        <header className="pb-8 mb-8 border-b border-ir-border-dark">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-6 h-6 text-ir-teal" />
            <h1 className="text-3xl sm:text-4xl font-bold">{doc.title}</h1>
          </div>
          <p className="text-ir-text-secondary">
            InReal Holdings Ltd &middot; BVI BC No. 2205311
          </p>
          <p className="text-ir-text-secondary mt-1">
            Version {doc.version}
            {doc.effectiveDate && (
              <>
                {' '}&middot; <span className="text-ir-white/80">Effective {doc.effectiveDate}</span>
              </>
            )}
          </p>
        </header>

        {doc.preamble && (
          <p className="text-ir-white/80 leading-relaxed mb-10">{doc.preamble}</p>
        )}

        {/* 21 sections is too many to scroll blind. */}
        <nav aria-label="Contents" className="mb-12 p-5 sm:p-6 rounded-2xl bg-ir-white/[0.03] border border-ir-border-dark">
          <h2 className="text-xs uppercase tracking-[0.1em] text-ir-text-secondary/70 mb-4">Contents</h2>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {sections.map((section) => (
              <li key={section.number}>
                <a
                  href={`#section-${section.number}`}
                  className="text-sm text-ir-white/70 hover:text-ir-teal transition-colors"
                >
                  <span className="tabular-nums text-ir-text-secondary/60 mr-2">{section.number}.</span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          {sections.map((section) => (
            <section
              key={section.number}
              id={`section-${section.number}`}
              className="mb-10 scroll-mt-6"
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                <span className="text-ir-teal tabular-nums mr-2">{section.number}.</span>
                {section.heading}
              </h2>
              {section.clauses.map((clause, i) => (
                <Clause key={clause.number || `lead-${i}`} clause={clause} />
              ))}
            </section>
          ))}
        </main>

        <footer className="mt-12 pt-8 border-t border-ir-border-dark space-y-4">
          <p className="text-sm text-ir-text-secondary">
            These {doc.title === 'Policies' ? 'Policies' : 'Terms'} form part of the InReal legal
            framework. Read them alongside the{' '}
            <Link to={otherPath} className="text-ir-teal hover:underline">
              {otherKey === 'terms' ? 'Terms & Conditions' : 'Policies'}
            </Link>
            .
          </p>
          <p className="text-sm text-ir-text-secondary">
            Questions about this document:{' '}
            <a href="mailto:legal@inreal.io" className="text-ir-teal hover:underline">
              legal@inreal.io
            </a>
          </p>
          <p className="text-xs text-ir-text-secondary/50">
            &copy; {new Date().getFullYear()} InReal Holdings Ltd. Last updated {doc.effectiveDate}.
          </p>
        </footer>
      </div>
    </div>
  );
}
