# Course Books Missing from Library

_Generated 2026-05-13T16:48:50.461Z_

## Summary

- Courses scanned: **19**
- Library texts: **106**
- Total course readings: **302**
- Matched to a library text: **207**
- Missing readings (occurrences): **95**
- Unique missing titles: **62**
- Courses with at least one missing book: **19**

Match logic mirrors `app/src/lib/courses/match-course-texts.ts` (fuzzy title + optional author check, threshold ≥ 60).

> A "possible variant in library" column flags soft matches (score 25–59) — usually a transliteration or title variant of an existing text (e.g. "Tao Te Ching" vs library's "The Tao Teh King"). These should be reconciled by either renaming the library entry, adding an alias, or confirming they're different works.

> Some entries also surface as data-quality issues in the source courses (author/title swap, IDs like `T117` in the author field, sections leaked into title/author). Those rows are worth fixing in the course content even when the underlying book exists in the library.

## Unique Missing Titles

| Title | Author | # courses | Possible variant in library |
|---|---|---|---|
| Zhuangzi | Chuang Tzu | 6 | — |
| Thus Spoke Zarathustra | Friedrich Nietzsche | 5 | Thus Spake Zarathustra: A Book for All and None (score 38) |
| Tertium Organum | — | 4 | — |
| The World as Will and Representation | §§30–36 | 4 | — |
| Creative Evolution | — | 3 | — |
| Harmonices Mundi Book V | Johannes Kepler | 3 | The Harmony of the World (Harmonice Mundi) (score 34) |
| Revelations of Divine Love | Julian of Norwich | 3 | — |
| Sepher Yetzirah | Rabbi Akiba ben Joseph | 3 | — |
| Tao Te Ching | Lao Tzu | 3 | — |
| I Ching | Anonymous | 2 | — |
| The Book of the City of Ladies | Christine de Pizan | 2 | — |
| The Chemical Wedding of Christian Rosenkreutz | — | 2 | — |
| The Egyptian Book of the Dead | — | 2 | — |
| The Guide for the Perplexed | T117 | 2 | — |
| The New Testament | Paul's Letters | 2 | — |
| The Tao Te Ching | — | 2 | — |
| The Works of Philo of Alexandria | On the Creation of the World (selections) and On the Confusion of Tongues (selections) | 2 | — |
| A Moslem Saint / The Tarjuman al | Ashwaq | 1 | — |
| A Vindication of the Rights of Woman | Mary Wollstonecraft | 1 | — |
| Alice Fletcher and Francis La Flesche | — | 1 | — |
| Autobiography of Madame Guyon | T137 | 1 | — |
| E. A. Wallis Budge | — | 1 | — |
| Edward Tylor | Primitive Culture, Volume I | 1 | — |
| Franz Boas | Tsimshian Mythology, Introduction | 1 | — |
| Isis Unveiled, Volume 1 | — | 1 | — |
| James Mooney | The Ghost | 1 | — |
| Julian of Norwich | Revelations of Divine Love, First Revelation | 1 | — |
| Lewis Spence | The Popol Vuh: The Mythic and Heroic Sagas of the Kichés of Central America | 1 | — |
| Magic White and Black | — | 1 | — |
| Novum Organum | Aphorisms, selected | 1 | — |
| P.D. Ouspensky | — | 1 | — |
| Primitive Culture Volume 1 | — | 1 | — |
| Psychology and Alchemy | — | 1 | — |
| Robert Sutherland Rattray | — | 1 | — |
| Scivias | Hildegard of Bingen | 1 | — |
| Teresa of Ávila | The Interior Castle, First | 1 | — |
| The Alchemists | — | 1 | — |
| The Apocryphal New Testament | Various | 1 | — |
| The Book of Healing | Avicenna | 1 | — |
| The Book of Margery Kempe | T136 | 1 | — |
| The Elements Book I | Euclid | 1 | The First Six Books of the Elements of Euclid (score 46) |
| The Flowing Light of the Godhead | Mechthild of Magdeburg | 1 | — |
| The Hebrew Bible | T150 | 1 | — |
| The Hermetic Museum Volume 1 | Arthur Edward Waite (ed.), selected treatises | 1 | The Hermetic Museum, Vol. I (score 32) |
| The I Ching | Anonymous | 1 | — |
| The Incoherence of the Philosophers | Al | 1 | The Alchemy of Happiness (score 32) |
| The Life of Teresa of Ávila | T038 | 1 | — |
| The Lotus Sutra | Trans. Max Müller / H. Kern | 1 | — |
| The Natural History of Religion | David Hume | 1 | Dialogues Concerning Natural Religion (score 38) |
| The Niche for Lights | Al | 1 | — |
| The Perfect Way | Anna Kingsford and Edward Maitland | 1 | — |
| The Popol Vuh | Creation Narrative | 1 | — |
| The Popol Vuh, Part I | Creation Narrative | 1 | — |
| The Rig Veda | T122 | 1 | — |
| The Structure of Scientific Revolutions | — | 1 | — |
| The Subjection of Women | John Stuart Mill | 1 | — |
| The Theory of Numbers | Thomas Heath | 1 | — |
| The Way of a Pilgrim | Anonymous | 1 | — |
| The Works of Mencius | Trans. James Legge | 1 | — |
| Washington Matthews | Navaho Legends, Preface and Opening Legends | 1 | — |
| William James | The Varieties of Religious Experience, Lectures I | 1 | — |
| Works of Mencius | Mencius | 1 | — |

## Missing by Course

### The Women Mystics

Slug: `c11-the-women-mystics` · Missing **9** of 15 readings

- **The Book of the City of Ladies** — _Christine de Pizan_ — (T138)
- **The New Testament** — _KJV_ — (T149)
- **Scivias** — _Hildegard of Bingen_ — (T134)
- **Revelations of Divine Love** — _Julian of Norwich_ — (T133)
- **The Flowing Light of the Godhead** — _Mechthild of Magdeburg_ — (T135)
- **The Book of Margery Kempe** — _T136_
- **The Life of Teresa of Ávila** — _T038_
- **Autobiography of Madame Guyon** — _T137_
- **The Perfect Way** — _Anna Kingsford and Edward Maitland_ — (T140)

### Reading the Colonizer's Record

Slug: `c15-reading-the-colonizers-record` · Missing **8** of 11 readings

- **Edward Tylor** — _Primitive Culture, Volume I_
- **Franz Boas** — _Tsimshian Mythology, Introduction_
- **James Mooney** — _The Ghost_
- **Robert Sutherland Rattray** — (Ashanti, Chapters 1)
- **Washington Matthews** — _Navaho Legends, Preface and Opening Legends_
- **Alice Fletcher and Francis La Flesche** — (The Omaha Tribe, Introduction and selected sections)
- **Lewis Spence** — _The Popol Vuh: The Mythic and Heroic Sagas of the Kichés of Central America_
- **E. A. Wallis Budge** — (Kebra Nagast (The Glory of Kings), Introduction and selected chapters)

### Symbol, Myth, and Psychotechnology

Slug: `c02-symbol-myth-and-psychotechnology` · Missing **8** of 25 readings

- **The Popol Vuh** — _Creation Narrative_ — (Part I)
- **I Ching** — _The Receptive_ — (Introduction and Hexagrams 1 (The Creative) and 2)
- **Sepher Yetzirah** — _Complete Text_
- **Harmonices Mundi Book V** — (Johannes Kepler, Chapters on Planetary Harmonics)
- **The Chemical Wedding of Christian Rosenkreutz** — (Johann Valentin Andreae, Days 1)
- **Magic White and Black** — (Franz Hartmann, Chapters on Sympathetic Magic and the Astral Plane)
- **Primitive Culture Volume 1** — (Edward Burnett Tylor, Chapters on Animism and Survivals)
- **Thus Spoke Zarathustra** — _Friedrich Nietzsche, Prologue and "On the Three Metamorphoses"_ — possibly → `Thus Spake Zarathustra: A Book for All and None`

### Ethics Without Absolutes

Slug: `c14-ethics-without-absolutes` · Missing **7** of 19 readings

- **Tao Te Ching** — _Lao Tzu_ — (T008)
- **Works of Mencius** — _Mencius_ — (T126)
- **Zhuangzi** — _Chuang Tzu_ — (T127)
- **A Vindication of the Rights of Woman** — _Mary Wollstonecraft_ — (T157)
- **The Subjection of Women** — _John Stuart Mill_ — (T158)
- **The Book of the City of Ladies** — _Christine de Pizan_ — (T138)
- **Thus Spoke Zarathustra** — _Friedrich Nietzsche_ — (T011) — possibly → `Thus Spake Zarathustra: A Book for All and None`

### How Humans Know What They Know

Slug: `c01-how-humans-know-what-they-know` · Missing **7** of 26 readings

- **Tao Te Ching** — _Lao Tzu_ — (Chapters 1)
- **The Popol Vuh, Part I** — _Creation Narrative_
- **William James** — _The Varieties of Religious Experience, Lectures I_
- **Teresa of Ávila** — _The Interior Castle, First_
- **Julian of Norwich** — _Revelations of Divine Love, First Revelation_
- **P.D. Ouspensky** — (Tertium Organum, Chapters I)
- **Zhuangzi** — _Selected Parables_ — (Chapters 2–3)

### The Hermetic Tradition

Slug: `c06-the-hermetic-tradition` · Missing **6** of 14 readings

- **The Egyptian Book of the Dead** — (E.A. Wallis Budge translation, selected chapters)
- **The Hermetic Museum Volume 1** — _Arthur Edward Waite (ed.), selected treatises_ — possibly → `The Hermetic Museum, Vol. I`
- **The Alchemists** — (Morley, selected biographical chapters)
- **The Chemical Wedding of Christian Rosenkreutz** — _Johann Valentin Andreae_
- **Tertium Organum** — (P.D. Ouspensky, Chapters 1)
- **Psychology and Alchemy** — (Carl Jung, Chapters 1)

### The Western Philosophical Inheritance

Slug: `c12-the-western-philosophical-inheritance` · Missing **6** of 15 readings

- **The Works of Philo of Alexandria** — _Selected Treatises_ — (On the Creation, On the Cherubim)
- **The New Testament** — _Paul's Letters_ — (1 Corinthians 1–2, Romans 8)
- **The Guide for the Perplexed** — _selections_ — (Maimonides (trans. Friedländer), Parts I and II)
- **The Natural History of Religion** — _David Hume_ — possibly → `Dialogues Concerning Natural Religion`
- **Thus Spoke Zarathustra** — (Friedrich Nietzsche, Part I)
- **Creative Evolution** — (Henri Bergson, Introduction and Chapter 1)

### The Wisdom of the East

Slug: `c09-the-wisdom-of-the-east` · Missing **6** of 16 readings

- **The Rig Veda** — _T122_ — (Nasadiya Sukta (Hymn of Creation, 10.129))
- **The Tao Te Ching** — _T008_ — (Selected chapters)
- **The Lotus Sutra** — _Trans. Max Müller / H. Kern_ — (T123)
- **Zhuangzi** — _Trans. Herbert A. Giles_ — (T127)
- **The Works of Mencius** — _Trans. James Legge_ — (T126)
- **The I Ching** — _Anonymous_ — (T042)

### The Map Is Not the Territory

Slug: `c05-the-map-is-not-the-territory` · Missing **5** of 21 readings

- **The Tao Te Ching** — (Lao Tzu, selected chapters)
- **The World as Will and Representation** — (Arthur Schopenhauer, Book I, §§ 1)
- **Zhuangzi** — (Chapters 2 and 3)
- **Creative Evolution** — _opening_ — (Henri Bergson, Introduction and Chapter 1)
- **Tertium Organum** — (P.D. Ouspensky, Chapters 1)

### Correspondence, Analogy, and Hidden Order

Slug: `c03-correspondence-analogy-and-hidden-order` · Missing **4** of 22 readings

- **I Ching** — _Anonymous_ — (with Jung's foreword to the Wilhelm/Baynes translation)
- **The World as Will and Representation** — _§§30–36_ — (Arthur Schopenhauer, Volume I, Book III)
- **Tertium Organum** — (P.D. Ouspensky, Chapters 1)
- **Harmonices Mundi Book V** — _Johannes Kepler_ — possibly → `The Harmony of the World (Harmonice Mundi)`

### Islamic Thought

Slug: `c10-islamic-thought` · Missing **4** of 12 readings

- **The Book of Healing** — _Avicenna_ — (T113)
- **The Incoherence of the Philosophers** — _Al_ — (T111) — possibly → `The Alchemy of Happiness`
- **The Niche for Lights** — _Al_ — (T115)
- **A Moslem Saint / The Tarjuman al** — _Ashwaq_ — (T116)

### Sacred Geometry and the Mathematical Cosmos

Slug: `c13-sacred-geometry-and-the-mathematical-cosmos` · Missing **4** of 10 readings

- **The Theory of Numbers** — _Thomas Heath_ — (T084)
- **The Elements Book I** — _Euclid_ — (T006) — possibly → `The First Six Books of the Elements of Euclid`
- **Sepher Yetzirah** — _Rabbi Akiba ben Joseph_ — (T027)
- **Harmonices Mundi Book V** — _Johannes Kepler_ — (T037) — possibly → `The Harmony of the World (Harmonice Mundi)`

### Synthesis as a Practice

Slug: `c15-synthesis-as-a-practice` · Missing **4** of 14 readings

- **Isis Unveiled, Volume 1**
- **Creative Evolution**
- **The World as Will and Representation**
- **Tertium Organum**

### The Qabalah and the Tree of Life

Slug: `c07-the-qabalah-and-the-tree-of-life` · Missing **4** of 12 readings

- **Sepher Yetzirah** — _Complete Text_ — (T027)
- **The Works of Philo of Alexandria** — _On the Creation of the World (selections) and On the Confusion of Tongues (selections)_ — (T118)
- **The Guide for the Perplexed** — _T117_ — (Maimonides, Part I, Chapters 50)
- **The Hebrew Bible** — _T150_ — (Genesis 1:1)

### The Hero's Journey: Why This Pattern Won't Leave Us Alone

Slug: `taster-the-heros-journey-why-this-pattern-wont-leave-us-alone` · Missing **3** of 9 readings

- **The Egyptian Book of the Dead** — _E.A. Wallis Budge, The Hall of Two Truths_ — possibly → `The Book of the Dead: The Papyrus of Ani in the British Museum`
- **Zhuangzi** — _Trans. Herbert A. Giles, The Butterfly Dream and Stories of Transformation_
- **Thus Spoke Zarathustra** — _Friedrich Nietzsche, Prologue_ — possibly → `Thus Spake Zarathustra: A Book for All and None`

### The Mystics Across Traditions

Slug: `c08-the-mystics-across-traditions` · Missing **3** of 19 readings

- **Revelations of Divine Love** — _Julian of Norwich_ — (T133)
- **The Apocryphal New Testament** — _Various_ — (T104)
- **The Way of a Pilgrim** — _Anonymous_ — (T079)

### What Science Can and Can't Say

Slug: `c04-what-science-can-and-cant-say` · Missing **3** of 18 readings

- **The World as Will and Representation** — (Arthur Schopenhauer, Book I, §§1)
- **Novum Organum** — _Aphorisms, selected_ — (Francis Bacon, Books I)
- **The Structure of Scientific Revolutions** — (Thomas Kuhn, Chapters I)

### How to Hold Two Things at Once

Slug: `pre-how-to-hold-two-things-at-once` · Missing **2** of 6 readings

- **Tao Te Ching** — (Lao Tzu, Chapters 1)
- **Zhuangzi** — _Trans. Herbert A. Giles, the Cook Ding story and the Butterfly Dream_

### Reality Cracks and Liminal States

Slug: `c17-reality-cracks-and-liminal-states` · Missing **2** of 18 readings

- **Revelations of Divine Love** — _Julian of Norwich_ — (T133)
- **Thus Spoke Zarathustra** — _Friedrich Nietzsche_ — (T011) — possibly → `Thus Spake Zarathustra: A Book for All and None`
