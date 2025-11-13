# CSV Seeding Guide for AI Assistants (Gemini CLI / Perplexity)

**Purpose:** This document provides complete instructions for AI assistants (Google Gemini CLI, Perplexity, etc.) to help with book seeding, CSV generation, and answering questions about books for the Digital Grimoire library.

**When to Use:** 
- Generating CSV entries for new books
- Answering questions about books to add to the library
- Creating balanced seeding lists
- Providing complete metadata for ad-hoc book uploads

---

## 📋 CRITICAL INSTRUCTION: Always Provide ALL CSV Fields

**When asked about a book or to generate CSV data, you MUST provide ALL 10 columns in this exact order:**

1. **Title** - Full book title
2. **Author** - Author name(s)
3. **Year** - Publication year (use BCE format if ancient, e.g., "500BCE")
4. **Type** - One of 20 allowed document types (see below)
5. **Domain** - Subject domain (e.g., "hermeticism", "psychoanalysis", "evolution")
6. **Lenses** - Comma-separated lens IDs (2-4 lenses, see 7 Lenses below)
7. **Source_URL** - Where to download the PDF/text (Project Gutenberg, Sacred-Texts.com, Internet Archive, etc.)
8. **Priority** - Implementation priority (1-4, see Priority System below)
9. **Status** - Tracking status (usually "queued" for new entries)
10. **Why_Chosen** - Value proposition explaining why this text matters (2-3 sentences)

**Format:** Provide as pipe-delimited (|) format to avoid conflicts with comma-separated values in the Lenses field.

**Example:**
```
The Kybalion|Three Initiates|1908|book_esoteric|hermeticism|symbolic_occult,philosophical,historical_anthropological|https://www.sacred-texts.com/eso/kyb/index.htm|1|queued|Foundational hermetic principles - Seven Universal Laws. Short (70 pages) and accessible for new users. Bridges occult and philosophical perspectives perfectly.
```

**Note:** The delimiter is a pipe character `|`, not a comma. This allows the Lenses field to use commas naturally without quoting.

---

## 📊 CSV Column Definitions

### 1. Title
- **Required:** Yes
- **Format:** Full book title as published
- **Example:** "The Kybalion", "On the Origin of Species", "The Interpretation of Dreams"

### 2. Author
- **Required:** Yes
- **Format:** Author name(s) as commonly known
- **Example:** "Three Initiates", "Charles Darwin", "Sigmund Freud"
- **Note:** For ancient texts, use traditional attribution (e.g., "Lao Tzu", "Vyasa")

### 3. Year
- **Required:** Yes
- **Format:** Four-digit year, or "YYYYBCE" for ancient texts
- **Example:** 1908, 1859, "500BCE", "600BCE"
- **Note:** Use best available date; approximate dates are acceptable

### 4. Type
- **Required:** Yes
- **Format:** Must be one of the 20 allowed document types (see list below)
- **Example:** "book_esoteric", "book_science", "book_philosophical"

### 5. Domain
- **Required:** Yes
- **Format:** Subject domain (lowercase, underscores allowed)
- **Example:** "hermeticism", "psychoanalysis", "evolution", "stoicism", "hinduism", "taoism", "political_philosophy", "comparative_religion"
- **Note:** Be specific but not overly granular

### 6. Lenses
- **Required:** Yes
- **Format:** Comma-separated lens IDs (2-4 lenses recommended)
- **Example:** "symbolic_occult,philosophical,historical_anthropological"
- **Note:** Must use exact lens IDs from the 7 Lenses list below
- **Best Practice:** Most books should have 2-4 lenses; avoid single-lens unless truly specialized

### 7. Source_URL
- **Required:** Yes
- **Format:** Full URL where PDF/text can be downloaded
- **Preferred Sources:**
  - Project Gutenberg: `https://www.gutenberg.org/ebooks/[ID]`
  - Sacred-Texts.com: `https://www.sacred-texts.com/...`
  - Internet Archive: `https://archive.org/details/...`
- **Note:** If multiple sources available, prefer Project Gutenberg for quality

### 8. Priority
- **Required:** Yes
- **Format:** Integer 1-4
- **Values:**
  - **1** - Foundation texts (most recognizable, essential for MVP)
  - **2** - Important texts (add depth, maintain balance)
  - **3** - Coverage texts (fill gaps, strengthen weak lenses)
  - **4** - Polish texts (specialized, advanced, final balancing)
- **See Priority System section below for balanced approach**

### 9. Status
- **Required:** Yes
- **Format:** String
- **Values:** "queued", "downloaded", "uploaded", "processing", "complete", "error"
- **Default:** "queued" for new entries

### 10. Why_Chosen
- **Required:** Yes
- **Format:** 2-3 sentence explanation
- **Content:** Explain why this text matters, its significance, and what it contributes to the library
- **Example:** "Foundational hermetic principles - Seven Universal Laws. Short (70 pages) and accessible for new users. Bridges occult and philosophical perspectives perfectly."

---

## 🎯 The 7 Convergence Lenses

Each book must be tagged with 2-4 lenses from this list. Use exact IDs:

### 1. scientific
- **ID:** `scientific`
- **Focus:** Physics, biology, cosmology, empirical evidence, natural sciences
- **Examples:** Darwin's Origin of Species, Einstein's Relativity, quantum physics texts

### 2. psychological
- **ID:** `psychological`
- **Focus:** Jungian archetypes, cognitive science, shadow work, depth psychology
- **Examples:** Freud's Interpretation of Dreams, Jung's works, William James

### 3. philosophical
- **ID:** `philosophical`
- **Focus:** Metaphysics, ethics, epistemology, ontology, philosophical inquiry
- **Examples:** Plato's Republic, Marcus Aurelius' Meditations, Nietzsche

### 4. religious_spiritual
- **ID:** `religious_spiritual`
- **Focus:** Comparative theology, mysticism, sacred texts, spiritual practices
- **Examples:** Bhagavad Gita, Tao Te Ching, Upanishads, Confessions

### 5. historical_anthropological
- **ID:** `historical_anthropological`
- **Focus:** Cultural evolution, mythology, ritual context, human history
- **Examples:** The Golden Bough, historical analyses, cultural studies

### 6. symbolic_occult
- **ID:** `symbolic_occult`
- **Focus:** Correspondences, alchemy, astrology, esoteric symbolism
- **Examples:** The Kybalion, alchemical texts, astrological works, tarot systems

### 7. mathematical
- **ID:** `mathematical`
- **Focus:** Sacred geometry, numerology, patterns, universal ratios
- **Examples:** Euclid's Elements, Kepler's works, sacred geometry texts

**Important:** Most texts should have 2-4 lenses. Very few texts are single-lens only.

---

## 📚 The 20 Allowed Document Types

The `Type` field must be exactly one of these (use underscores, lowercase):

1. `book_esoteric` - Esoteric/occult books
2. `book_spiritual` - Spiritual/religious books
3. `book_psychology` - Psychology books
4. `book_science` - Science books
5. `book_philosophical` - Philosophical books
6. `article_scholarly` - Scholarly articles
7. `anthropology` - Anthropological works
8. `reference_table` - Reference tables, correspondence tables
9. `historical` - Historical documents
10. `mythology` - Mythological texts
11. `medical_overview` - Medical texts
12. `commentary` - Commentaries on texts
13. `webpage` - Web content (rare for library)
14. `dictionary` - Dictionaries, glossaries
15. `astrology` - Astrological texts
16. `ritual_guide` - Ritual instructions
17. `diagram` - Diagrams, charts
18. `transcript` - Transcripts
19. `summary` - Summaries
20. `speculative` - Speculative works
21. `misc` - Miscellaneous (use sparingly)

**Most Common Types:**
- `book_esoteric`, `book_spiritual`, `book_psychology`, `book_science`, `book_philosophical`

---

## ⚖️ Balanced Seeding Logic

### Priority System (Balanced Approach)

The balanced approach ensures all 7 lenses are represented at each priority level, allowing feature testing from day one.

#### Priority 1 (20 texts) - Foundation
**Goal:** MVP with balanced lens coverage - test all features immediately

**Distribution Target:**
- 3 Scientific
- 4 Psychological
- 5 Philosophical
- 6 Religious/Spiritual
- 3 Historical/Anthropological
- 5 Symbolic/Occult
- 2 Mathematical

**Selection Criteria:**
- Most recognizable classics
- Essential texts for each lens
- Accessible and readable
- Cultural significance
- Short to medium length preferred

#### Priority 2 (30 texts) - Depth
**Goal:** 50 texts with continued balanced coverage

**Distribution Target:**
- Maintain proportional distribution across all 7 lenses
- Add major texts in each domain
- Ensure no lens is neglected
- Include both Eastern and Western perspectives

#### Priority 3 (30 texts) - Coverage
**Goal:** 80 texts with all 7 lenses equally strong

**Distribution Target:**
- Strengthen weaker lenses
- Additional scientific texts
- Mathematical/geometry works
- Anthropology and mythology
- Continue other lenses proportionally

#### Priority 4 (20 texts) - Polish
**Goal:** 100-text library with perfect lens equilibrium

**Distribution Target:**
- Fill any remaining lens gaps
- Add specialized or advanced texts
- Ensure each lens has 12-15+ texts minimum
- Add variety (different time periods, cultures, approaches)

### Balanced Seeding Rules

1. **Lens Balance:** At each priority level, ensure all 7 lenses are represented
2. **Multi-Lens Texts:** Prefer texts that span multiple lenses (2-4 lenses per text)
3. **Proportional Growth:** Each lens should grow proportionally across priorities
4. **No Neglect:** Never defer an entire lens to later priorities
5. **Early Scientific/Math:** Include scientific and mathematical texts early (Priority 1-2), not just Priority 3-4

### When Assigning Priority

**Priority 1:**
- Foundational texts (Plato, Darwin, Freud, Jung)
- Most recognizable classics
- Essential for each lens
- Texts that define entire fields

**Priority 2:**
- Important but not foundational
- Adds depth to existing lens coverage
- Maintains balance across lenses
- Major works in each domain

**Priority 3:**
- Fills gaps in coverage
- Strengthens weaker lenses
- Specialized but important texts
- Ensures comprehensive coverage

**Priority 4:**
- Advanced or specialized texts
- Final balancing
- Niche but valuable content
- Completes the 100-text library

---

## 🔍 How to Answer Questions About Books

When the user asks about a book (to add, find information, etc.):

1. **Provide Complete CSV Row:** Always include all 10 columns
2. **Research the Book:** Find publication year, author, domain
3. **Assign Lenses:** Determine 2-4 appropriate lenses based on content
4. **Choose Type:** Select from 20 allowed document types
5. **Find Source:** Locate public domain source URL (Project Gutenberg, etc.)
6. **Suggest Priority:** Based on importance and current library balance
7. **Write Why_Chosen:** 2-3 sentences explaining significance

### Example Workflow

**User asks:** "I want to add The Secret Teachings of All Ages by Manly P. Hall"

**Your response should include:**
```
Title: The Secret Teachings of All Ages
Author: Manly P. Hall
Year: 1928
Type: book_esoteric
Domain: comparative_esotericism
Lenses: symbolic_occult,philosophical,historical_anthropological,religious_spiritual
Source_URL: [find actual URL - check Internet Archive, Project Gutenberg, etc.]
Priority: 2
Status: queued
Why_Chosen: Comprehensive encyclopedia of esoteric knowledge covering Hermeticism, Qabalah, Alchemy, and more. Bridges multiple traditions and perspectives. Essential reference for symbolic/occult lens with strong philosophical and historical components.
```

**Then provide the pipe-delimited row:**
```
The Secret Teachings of All Ages|Manly P. Hall|1928|book_esoteric|comparative_esotericism|symbolic_occult,philosophical,historical_anthropological,religious_spiritual|https://archive.org/details/secretteachingso00hall|2|queued|Comprehensive encyclopedia of esoteric knowledge covering Hermeticism, Qabalah, Alchemy, and more. Bridges multiple traditions and perspectives. Essential reference for symbolic/occult lens with strong philosophical and historical components.
```

---

## 📖 Finding Public Domain Sources

### Primary Sources

1. **Project Gutenberg** (https://www.gutenberg.org/)
   - Best quality PDFs
   - Direct links: `https://www.gutenberg.org/ebooks/[ID].pdf`
   - Search by title or author
   - Most reliable source

2. **Sacred-Texts.com** (https://www.sacred-texts.com/)
   - Esoteric, religious, occult texts
   - HTML format (may need Print to PDF)
   - Good for specialized texts

3. **Internet Archive** (https://archive.org/)
   - Large collection, including rare texts
   - Multiple formats available
   - Sometimes large file sizes

4. **HathiTrust** (https://www.hathitrust.org/)
   - Academic library collection
   - Public domain works

### Copyright Verification

- **US Public Domain:** Works published before 1928 are public domain
- **International:** Varies by country (user should verify)
- **When in doubt:** Prefer pre-1928 works or explicitly marked public domain

---

## 🎯 Ad-Hoc Book Uploads

When the user wants to upload a specific book (not from the seed list):

1. **Gather Information:**
   - Title, Author, Year
   - Determine domain and type
   - Assign 2-4 lenses
   - Find or verify public domain source

2. **Generate Complete CSV Row:**
   - All 10 columns filled
   - Proper CSV formatting
   - Quoted fields with commas

3. **Suggest Priority:**
   - Based on importance
   - Current library balance
   - Lens coverage needs

4. **Provide Metadata:**
   - Why this book matters
   - What lenses it supports
   - How it fits the library

---

## 📝 CSV Formatting Rules (Pipe-Delimited Format)

**Delimiter:** Use pipe character `|` (not comma) to separate fields

**Why Pipe-Delimited?**
- The Lenses field contains comma-separated values (e.g., `symbolic_occult,philosophical,historical_anthropological`)
- Using comma as delimiter would break parsing
- Pipe `|` rarely appears in book data, making it a safe delimiter

**Formatting Rules:**
1. **Delimiter:** Use `|` between all fields
2. **Lenses Field:** Use commas naturally (e.g., `symbolic_occult,philosophical,historical_anthropological`)
3. **No Quoting Needed:** Fields don't need quotes with pipe delimiter
4. **Special Characters:** If a field contains a pipe `|`, replace it with a space or hyphen

**Correct Format:**
```
Title|Author|Year|Type|Domain|Lenses|Source_URL|Priority|Status|Why_Chosen
```

**Example:**
```
The Kybalion|Three Initiates|1908|book_esoteric|hermeticism|symbolic_occult,philosophical,historical_anthropological|https://www.sacred-texts.com/eso/kyb/index.htm|1|queued|Foundational hermetic principles - Seven Universal Laws. Short (70 pages) and accessible for new users. Bridges occult and philosophical perspectives perfectly.
```

---

## ✅ Quality Checklist

Before providing a CSV row, verify:

- [ ] All 10 columns present
- [ ] Title is complete and accurate
- [ ] Author name is correct
- [ ] Year is valid (or BCE format)
- [ ] Type is one of 20 allowed types
- [ ] Domain is specific and appropriate
- [ ] Lenses are 2-4 valid lens IDs
- [ ] Source_URL is accessible and public domain
- [ ] Priority is 1-4 based on importance
- [ ] Status is appropriate (usually "queued")
- [ ] Why_Chosen is 2-3 sentences explaining value
- [ ] CSV formatting is correct (pipe-delimited, no quotes needed)

---

## 🚀 Quick Reference

### CSV Column Order
1. Title
2. Author
3. Year
4. Type
5. Domain
6. Lenses
7. Source_URL
8. Priority
9. Status
10. Why_Chosen

### 7 Lenses (exact IDs)
1. `scientific`
2. `psychological`
3. `philosophical`
4. `religious_spiritual`
5. `historical_anthropological`
6. `symbolic_occult`
7. `mathematical`

### Most Common Types
- `book_esoteric`
- `book_spiritual`
- `book_psychology`
- `book_science`
- `book_philosophical`

### Priority Guidelines
- **1:** Foundation, most recognizable, essential
- **2:** Important, adds depth, maintains balance
- **3:** Coverage, fills gaps, strengthens weak areas
- **4:** Polish, specialized, final balancing

---

## 💡 Tips for AI Assistants

1. **Always provide complete data** - Never skip columns
2. **Research thoroughly** - Find accurate publication dates, authors
3. **Think multi-lens** - Most books span 2-4 lenses
4. **Balance matters** - Consider current library balance when suggesting priority
5. **Public domain only** - Verify copyright status
6. **Quality sources** - Prefer Project Gutenberg over random websites
7. **Be specific** - Domain should be specific (e.g., "hermeticism" not "occult")
8. **Explain value** - Why_Chosen should be meaningful, not generic

---

**Remember:** The user relies on you to provide complete, accurate CSV data. Always include all 10 columns, use exact lens IDs and type values, and provide properly formatted CSV rows ready for import.

