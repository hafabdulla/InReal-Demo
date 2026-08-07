# Parse the Terms and Policies PDFs into structured JSON for the web pages.
#
# Deliberately a parser rather than retyping: this is legal text governing an
# investment relationship, and a transcription slip would be invisible and wrong.
# Everything rendered on the site comes out of the source PDF verbatim.
#
# HOW HEADINGS ARE FOUND, and why the obvious way failed.
#
# The first attempt matched headings with a regex over the flat text, requiring a
# heading to be followed by a numbered clause ("2. Definitions" then "2.1"). Four
# Policies sections are followed by prose instead, so they were silently absorbed
# into the previous section — the character count still balanced, which is
# exactly why a character count alone is not enough of a check.
#
# This version reads the PDF's own font runs. A section heading is emitted as a
# single BOLD run containing the whole heading ("1. How These Policies Fit
# Together"), and a clause number as a bold run of the form "1.1". That makes the
# heading boundary explicit in the source rather than something to infer, so
# "Definitions These Policies use…" cannot be mis-split.
#
# Boldness is detected from the font name, not the subset prefix — subset tags
# like /AAAAAS+ vary per page and are not stable identifiers.

from pypdf import PdfReader
import re, json, sys

OUT = "src/data"

DOCS = [
    ("terms", "InReal_Terms_and_Conditions_v1_0_7Aug2026.pdf", "Terms & Conditions"),
    ("policies", "InReal_Policies_v1_0_7Aug2026.pdf", "Policies"),
]

SECTION_RE = re.compile(r"^(\d{1,2})\.\s+(\S.*)$")

# A clause run is either a bare number ("12.1") or a number with an inline
# title ("12.2  Personal use"). The first version of this parser only accepted
# the bare form, so every titled clause fell through into the previous clause's
# body — Policies section 12 collapsed from five clauses into one, and its five
# separate (a)–(f) lists were flattened into a single 22-item list. The text was
# all present, which is why the character-count check still passed; the
# STRUCTURE was wrong. Hence the duplicate-label check at the bottom.
CLAUSE_RE = re.compile(r"^(\d{1,2}\.\d{1,2})(?:\s+(\S.*))?$")


def collect_runs(pdf_path, doc_title):
    """Every text run on every page after the cover, with a bold flag."""
    reader = PdfReader(pdf_path)
    runs = []
    for page in reader.pages[1:]:            # page 1 is the cover
        page_runs = []

        def visit(text, cm, tm, font_dict, font_size, _acc=page_runs):
            t = text.strip()
            if not t:
                return
            name = str((font_dict or {}).get("/BaseFont", ""))
            _acc.append({"text": t, "bold": "bold" in name.lower()})

        page.extract_text(visitor_text=visit)

        # Drop the running header/footer this PDF puts on every page. Page
        # furniture, not clauses — a continuous web page has no pages to number,
        # and the "Confidential" footer is handled separately (see the report).
        cleaned, skip_next_number = [], False
        for r in page_runs:
            t = r["text"]
            if skip_next_number and re.fullmatch(r"\d+", t):
                skip_next_number = False
                continue
            skip_next_number = False
            if t == f"{doc_title} v1.0" or t == "Page":
                if t == "Page":
                    skip_next_number = True
                continue
            if t.startswith("InReal Holdings Ltd") and "Confidential" in t:
                continue
            cleaned.append(r)
        runs.extend(cleaned)
    return runs


def parse(doc_key, filename, doc_title):
    reader = PdfReader(f"documents/{filename}")
    cover = re.sub(r"\s+", " ", reader.pages[0].extract_text() or "")
    effective = re.search(r"Effective Date:\s*([0-9]{1,2}\s+\w+\s+\d{4})", cover)

    runs = collect_runs(f"documents/{filename}", doc_title)

    preamble_parts, sections = [], []
    cur_sec = cur_clause = None
    # True only while we are still inside a heading. A heading can arrive as
    # several bold runs — "13. Third", "-", "Party Services" — because the
    # hyphen is emitted separately, which truncated §13 to "Third" on the first
    # run of this parser. Cleared by the first clause number or non-bold run, so
    # a bold defined term in the body can never be mistaken for a heading.
    heading_open = False

    def flush_clause():
        nonlocal cur_clause
        if cur_clause is not None:
            cur_clause["text"] = re.sub(r"\s+", " ", cur_clause["text"]).strip()
            cur_sec["clauses"].append(cur_clause)
            cur_clause = None

    for r in runs:
        t, bold = r["text"], r["bold"]

        if bold and SECTION_RE.match(t):
            m = SECTION_RE.match(t)
            flush_clause()
            cur_sec = {"number": m.group(1), "heading": m.group(2).strip(), "clauses": []}
            sections.append(cur_sec)
            heading_open = True
            continue

        cm = CLAUSE_RE.match(t) if bold else None
        # The clause number must belong to the section we are inside, so a bold
        # cross-reference to another section cannot start a phantom clause.
        if cm and cur_sec is not None and cm.group(1).split(".")[0] == cur_sec["number"]:
            heading_open = False
            flush_clause()
            cur_clause = {"number": cm.group(1), "title": (cm.group(2) or "").strip() or None, "text": ""}
            continue

        if heading_open and bold:
            # Still inside the heading. Join without a space across a hyphen so
            # "Third" + "-" + "Party Services" reads as "Third-Party Services".
            prev = cur_sec["heading"]
            cur_sec["heading"] = (prev + t) if (prev.endswith("-") or t.startswith("-")) else (prev + " " + t)
            continue

        heading_open = False

        if cur_clause is not None:
            cur_clause.setdefault("title", None)
            cur_clause["text"] += " " + t
        elif cur_sec is not None:
            # Prose sitting directly under a heading, before any numbered
            # clause — e.g. Policies section 2 ("Definitions"). Held as an
            # unnumbered lead clause rather than discarded.
            cur_clause = {"number": None, "text": " " + t}
        else:
            preamble_parts.append(t)

    flush_clause()

    # Lettered sub-items are unambiguous, so promoting them to a list is safe and
    # makes a wall of legal prose readable. The wording itself is untouched.
    for s in sections:
        for c in s["clauses"]:
            ctext, items = c["text"], []
            im = list(re.finditer(r"\(([a-z])\)\s+", ctext))
            if len(im) >= 2:
                c["text"] = ctext[: im[0].start()].strip()
                for k, it in enumerate(im):
                    start = it.end()
                    end = im[k + 1].start() if k + 1 < len(im) else len(ctext)
                    items.append({"label": f"({it.group(1)})", "text": ctext[start:end].strip()})
            c["items"] = items

    doc = {
        "title": doc_title,
        "version": "v1.0",
        "effectiveDate": effective.group(1) if effective else None,
        "preamble": re.sub(r"\s+", " ", " ".join(preamble_parts)).strip(),
        "sections": sections,
    }

    # ---- integrity checks ------------------------------------------------
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

    source = " ".join(
        re.sub(r"\s+", " ", (p.extract_text() or "")) for p in reader.pages[1:]
    )
    source = re.sub(rf"{re.escape(doc_title)} v1\.0", " ", source)
    source = re.sub(r"InReal Holdings Ltd .{0,40}Confidential Page \d+", " ", source)

    rebuilt = doc["preamble"]
    for s in sections:
        rebuilt += s["number"] + s["heading"]
        for c in s["clauses"]:
            rebuilt += (c["number"] or "") + (c.get("title") or "") + c["text"]
            for it in c["items"]:
                rebuilt += it["label"] + it["text"]

    src_n, out_n = norm(source), norm(rebuilt)
    diff = len(src_n) - len(out_n)

    nums = [int(s["number"]) for s in sections]
    gaps = [n for n in range(1, max(nums) + 1) if n not in nums] if nums else []

    # A repeated (a)/(b) label inside ONE clause means two separate lists were
    # flattened together — i.e. a clause boundary was missed. The character
    # count cannot catch this because no text is lost, only its shape. This is
    # the check that caught Policies 12 collapsing five clauses into one.
    flattened = []
    for s in sections:
        for c in s["clauses"]:
            labels = [i["label"] for i in c["items"]]
            if len(labels) != len(set(labels)):
                flattened.append(f"{s['number']}.{c['number'] or '?'} ({len(labels)} items)")

    print(f"\n=== {doc_key} ===")
    print(f"  sections      : {len(sections)}   numbers 1..{max(nums) if nums else 0}")
    print(f"  missing nums  : {gaps if gaps else 'none'}   {'' if not gaps else '<-- HEADING NOT DETECTED'}")
    print(f"  clauses       : {sum(len(s['clauses']) for s in sections)}")
    print(f"  effective     : {doc['effectiveDate']}")
    print(f"  chars src/out : {len(src_n)} / {len(out_n)}   diff {diff}  {'OK' if diff == 0 else '<-- TEXT LOST'}")
    print(f"  flattened     : {flattened if flattened else 'none'}   {'' if not flattened else '<-- CLAUSE BOUNDARY MISSED'}")
    if diff != 0:
        for i in range(min(len(src_n), len(out_n))):
            if src_n[i] != out_n[i]:
                print(f"  first divergence @{i}:\n    src : …{src_n[max(0,i-70):i+100]}…\n    out : …{out_n[max(0,i-70):i+100]}…")
                break
    for s in sections:
        print(f"    {s['number']}. {s['heading']}  ({len(s['clauses'])} clauses)")
    return doc, (diff == 0 and not gaps and not flattened)


bundle, all_ok = {}, True
for key, fn, title in DOCS:
    doc, ok = parse(key, fn, title)
    bundle[key] = doc
    all_ok = all_ok and ok

with open(f"{OUT}/legal.json", "w", encoding="utf-8") as f:
    json.dump(bundle, f, indent=2, ensure_ascii=False)
print(f"\nwrote legal.json  —  {'ALL CHECKS PASSED' if all_ok else 'CHECKS FAILED — do not ship'}")
sys.exit(0 if all_ok else 1)
