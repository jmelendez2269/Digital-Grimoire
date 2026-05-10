# CSV vs Database Comparison

_Generated 2026-05-09T01:38:15.975Z · CSV: `scripts/library-grid.csv` · DB: staging `texts` table_

## Summary

- CSV rows: **146**
- DB texts: **106**
- High-confidence matches (CSV ↔ DB, score ≥ 60): **87**
- Probable variant pairs (score 30–59 — needs human confirmation): **14**
- CSV rows still unmatched: **45**
- DB rows with no CSV counterpart: **5**
- Matched rows with proposed metadata backfill: **87**

## ⚠ CSV/DB inconsistencies

**4** CSV rows marked `Uploaded` are NOT in the DB.

| CSV ID | Title | Author | CSV Source URL |
|---|---|---|---|
| T024 | The Chemical Wedding of Christian Rosenkreutz | Johann Valentin Andreae | https://www.sacred-texts.com/sro/rhr/index.htm |
| T102 | The Life of St. Teresa of Jesus, of the Order of Our Lady of Carmel | St. Teresa of Avila | https://www.gutenberg.org/ebooks/8120 |
| T052 | The Zohar Volume 1 | Moses de Leon | https://www.sacred-texts.com/jud/zdm/index.htm |
| T079 | The Way of a Pilgrim | Anonymous | https://www.gutenberg.org/ebooks/53425 |

**0** CSV rows marked `queued`/`Needs Digitizing` ARE already in the DB. CSV status should flip to `Uploaded`.

## ⚠ Probable variant pairs (review and confirm)

CSV rows whose title appears to be a different edition/translation of a DB row already present. Likely the CSV `Source URL` should be backfilled into the DB row, but the DB title may need renaming or these may be intentional separate editions.

| CSV ID | CSV Title | CSV Author | DB Title | DB Author | DB Year | Score |
|---|---|---|---|---|---|---|
| T071 | The Elementary Forms of Religious Life | Emile Durkheim | The Elementary Forms of the Religious Life | Emile Durkheim | 1912 | 42 |
| T043 | The Hermetic Museum Volume 1 | Arthur Edward Waite | The Hermetic Museum, Vol. I | Arthur Edward Waite | 1893 | 40 |
| T018 | The Principles of Psychology Vol 1 | William James | The Principles of Psychology, Volume 1 | William James | 1918 | 38 |
| T034 | The World as Will and Representation | Arthur Schopenhauer | The World as Will and Idea (Vol. 2 of 3) | Arthur Schopenhauer | 1909 | 38 |
| T075 | The Egyptian Book of the Dead | E.A. Wallis Budge | The Book of the Dead: The Papyrus of Ani in the British Museum | E. A. Wallis Budge | 1895 | 38 |
| T011 | Thus Spoke Zarathustra | Friedrich Nietzsche | Thus Spake Zarathustra: A Book for All and None | Friedrich Nietzsche | 1883 | 30 |
| T064 | Primitive Culture Volume 1 | Edward Burnett Tylor | Primitive Culture, Vol. 1 of 2 | Edward B. Tylor | 1871 | 30 |
| T087 | The Natural History of Religion | David Hume | Dialogues Concerning Natural Religion | David Hume | 1779 | 30 |
| T006 | The Elements Book I | Euclid | The First Six Books of the Elements of Euclid | Euclid | 2007 | 28 |
| T051 | The Secret Doctrine Volume 1 | Helena Blavatsky | The Secret Doctrine: The Synthesis of Science, Religion, and Philosophy | H. P. Blavatsky | 1888 | 28 |
| T037 | Harmonices Mundi Book V | Johannes Kepler | The Harmony of the World (Harmonice Mundi) | Johannes Kepler | 1619 | 26 |
| T008 | The Tao Te Ching | Lao Tzu | The Tao Teh King, or the Tao and its Characteristics | Laozi | 1995 | 24 |
| T091 | The Nichomachean Ethics | Aristotle | The Nicomachean Ethics of Aristotle | Aristotle | — | 24 |
| T017 | Isis Unveiled Volume 1 | Helena Blavatsky | The Veil of Isis | H.P. Blavatsky | 1877 | 20 |

## CSV rows missing from the DB

Books that the curated plan lists but staging doesn't have AND no probable variant was found. Grouped by CSV `Original Status`.

### Original Status: `(blank)` (36)

| CSV ID | Title | Author | Year | PD | Source URL | Decision |
|---|---|---|---|---|---|---|
| T109 | The Mathnawi, Books II-VI | Rumi Nicholson | 1925 | Verify | https://archive.org/ | Keep |
| T113 | The Book of Healing (selections) | Avicenna | 1027 | Clear | https://archive.org/ | Keep |
| T115 | The Niche for Lights (Mishkat al-Anwar) | Al-Ghazali / W.H.T. Gairdner | 1924 | Clear | https://sacred-texts.com/isl/mishkat/ | Keep |
| T116 | A Moslem Saint of the Twentieth Century / The Tarjuman al-Ashwaq | Ibn Arabi/Nicholson | 1911 | Clear | — | Reframe |
| T117 | The Guide for the Perplexed | Maimonides/Friedlander | 1881 | Clear | https://sacred-texts.com/jud/gfp/ | Keep |
| T118 | The Works of Philo of Alexandria | Philo/C.D. Yonge | 1854 | Clear | https://earlychristianwritings.com | Keep |
| T119 | Selections from the Talmud | Rodkinson | 1903 | Clear | https://sacred-texts.com/jud/t01/ | Reframe |
| T121 | Hasidic Tales (Buber early) | Martin Buber | 1928 | Verify | — | Reframe |
| T122 | The Rig Veda | Trans. Ralph T.H. Griffith | 1896 | Clear | https://sacred-texts.com/hin/rigveda/ | Keep |
| T123 | The Lotus Sutra (Saddharma-Pundarika) | Trans. Max Muller / H. Kern | 1884 | Clear | https://sacred-texts.com/bud/lotus/ | Keep |
| T124 | The Laws of Manu | Trans. G. Buhler | 1886 | Clear | https://sacred-texts.com/hin/manu.htm | Reframe |
| T125 | The Mahabharata (selections Ganguli translation) | Trans. K.M. Ganguli | 1883 | Clear | https://sacred-texts.com/hin/maha/ | Keep |
| T126 | The Works of Mencius | Trans. James Legge | 1895 | Clear | https://sacred-texts.com/cfu/menc/ | Keep |
| T127 | Zhuangzi (Chuang Tzu) | Trans. Herbert A. Giles | 1889 | Clear | https://sacred-texts.com/tao/ctz/ | Keep |
| T128 | The Great Learning & Doctrine of the Mean | Trans. James Legge | 1885 | Clear | https://sacred-texts.com/cfu/conf3.htm | Reframe |
| T129 | The Book of Songs (Shi Jing) | Trans. James Legge | 1876 | Clear | https://sacred-texts.com/cfu/sbe03/ | Reframe |
| T131 | The Zend-Avesta | Trans. James Darmesteter | 1880 | Clear | https://sacred-texts.com/zor/sbe04/ | Reframe |
| T132 | Selections from the Sacred Writings of the Sikhs | Trans. M.A. Macauliffe | 1909 | Clear | https://sacred-texts.com/skh/ | Reframe |
| T133 | Revelations of Divine Love | Julian of Norwich | 1395 | Clear | https://ccel.org/ccel/julian/revelations | Keep |
| T134 | Scivias (selections) | Hildegard of Bingen | 1151 | Clear | https://sacred-texts.com | Keep |
| T135 | The Flowing Light of the Godhead (selections) | Mechthild of Magdeburg | 1265 | Clear | https://archive.org | Keep |
| T136 | The Book of Margery Kempe | Margery Kempe | 1436 | Clear | https://ccel.org | Reframe |
| T137 | Autobiography of Madame Guyon | Jeanne Guyon | 1690 | Clear | https://ccel.org/ccel/guyon | Keep |
| T138 | The Book of the City of Ladies | Christine de Pizan | 1405 | Clear | https://archive.org | Reframe |
| T139 | Thought Forms | Annie Besant & C.W. Leadbeater | 1901 | Clear | https://sacred-texts.com | Reframe |
| T140 | The Perfect Way | Anna Kingsford & Edward Maitland | 1882 | Clear | https://sacred-texts.com | Reframe |
| T141 | The Popol Vuh | Trans. Lewis Spence | 1908 | Clear | https://sacred-texts.com/nam/maya/pvuheng.htm | Reframe |
| T147 | The Kebra Nagast | Trans. E.A. Wallis Budge | 1922 | Clear | https://sacred-texts.com/afr/kn/ | Keep |
| T149 | The New Testament (KJV) | — | 1611 | Clear | https://gutenberg.org | Keep |
| T150 | The Hebrew Bible (JPS 1917) | Jewish Publication Society | 1917 | Clear | https://sacred-texts.com/bib/jps/ | Reframe |
| T151 | The Didache | Trans. Charles Hoole | 1894 | Clear | https://earlychristianwritings.com | Reframe |
| T152 | The Shepherd of Hermas | Various older translations | 180 | Clear | https://earlychristianwritings.com | Reframe |
| T153 | Augustine - City of God | Trans. Marcus Dods | 1871 | Clear | https://ccel.org/ccel/schaff/npnf102 | Keep |
| T154 | Tertium Organum | P.D. Ouspensky | 1912 | Clear | https://archive.org | Reframe |
| T155 | An Outline of Occult Science | Rudolf Steiner | 1909 | Clear | https://rsarchive.org | Reframe |
| T156 | Creative Evolution | Henri Bergson | 1907 | Clear | https://gutenberg.org | Keep |

### Original Status: `Needs Digitizing` (1)

| CSV ID | Title | Author | Year | PD | Source URL | Decision |
|---|---|---|---|---|---|---|
| T045 | Magic White and Black | Franz Hartmann | 1888 | Clear | https://www.sacred-texts.com/eso/mwb/index.htm | Keep |

### Original Status: `Uploaded` (4)

| CSV ID | Title | Author | Year | PD | Source URL | Decision |
|---|---|---|---|---|---|---|
| T024 | The Chemical Wedding of Christian Rosenkreutz | Johann Valentin Andreae | 1616 | Clear | https://www.sacred-texts.com/sro/rhr/index.htm | Keep |
| T052 | The Zohar Volume 1 | Moses de Leon | 1290 | Clear | https://www.sacred-texts.com/jud/zdm/index.htm | Keep |
| T079 | The Way of a Pilgrim | Anonymous | 1884 | Clear | https://www.gutenberg.org/ebooks/53425 | Reframe |
| T102 | The Life of St. Teresa of Jesus, of the Order of Our Lady of Carmel | St. Teresa of Avila | 1565 | Clear | https://www.gutenberg.org/ebooks/8120 | Reframe |

### Original Status: `queued` (4)

| CSV ID | Title | Author | Year | PD | Source URL | Decision |
|---|---|---|---|---|---|---|
| T084 | The Theory of Numbers | Thomas Heath | 1910 | Clear | https://archive.org/details/diophantusalex00heatiala | Reframe |
| T092 | The Alchemists | Morley | 1854 | Clear | https://archive.org/details/livesalchemistic00morl | Reframe |
| T104 | The Apocryphal New Testament | Montague Rhodes James | 1924 | Clear | — | Keep |
| T111 | The Incoherence of the Philosophers | Al-Ghazali Van Den Bergh | 1954 | Verify | https://archive.org/ | Reframe |

## DB rows not in the CSV

Texts present in staging that the curated CSV doesn't reference. Could be older uploads, near-duplicates the matcher missed, or rows that should be added to the CSV.

| DB ID | Title | Author | Year |
|---|---|---|---|
| `45bc8ef5…` | Christian Astrology Volume 1 | William Lilly | 1647 |
| `a9d680d4…` | Essays by Ralph Waldo Emerson | Ralph Waldo Emerson | 1907 |
| `0ecc5d6f…` | Jewish Magic and Superstition: A Study in Folk Religion | Joshua Trachtenberg | 1939 |
| `7a5dd23a…` | The Emerald Tablets of Thoth the Atlantean | Doreal | — |
| `eac1e2e3…` | The Sepher Ha-Zohar or The Book of Light | Nurho de Manhar | 1900 |

## Proposed metadata backfill (matched rows)

The CSV has authoritative `Public Domain Status`, `Source URL`, and `Year` data. Where the DB row is missing those fields and the CSV row marks PD status as `Clear`, we can backfill. SQL is written to `scripts/csv-backfill.sql` — review before running.

- Rows getting `license = 'public-domain'` set: **82**
- Rows getting `source_url` set: **86**
- Rows getting `year` set: **10**

### Held back: CSV PD Status = `Verify` (5)

License will NOT be auto-set for these — needs human confirmation first.

| CSV ID | Title | Author | Notes |
|---|---|---|---|
| T010 | The Secret Teachings of All Ages | Manly P. Hall | — |
| T085 | Jewish Magic and Superstition | Joshua Trachtenberg | — |
| T096 | The Practice of Magical Evocation | Franz Bardon | — |
| T107 | The Quran (Pickthall translation) | Marmaduke Pickthall | — |
| T112 | The Incoherence of the Incoherence | Averroes Van Den Bergh | — |
