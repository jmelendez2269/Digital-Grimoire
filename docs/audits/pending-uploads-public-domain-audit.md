# Public-Domain Audit — Books Pending Upload

_Generated 2026-05-08T19:22:31.860Z · scope: course readings not yet matched in the library_

## Summary

- Unique missing titles: **64**
- ✅ Likely public-domain (author died ≥ 70y ago): **45**
- ⚠ Likely PD original, **translation copyright unknown**: **16**
- ⛔ Likely still in copyright: **3**
- ❓ Needs human review (author not in lookup): **0**

### Method

1. Pulled every reading referenced in `courses.content.weeks[].readings[]`.
2. Used the same fuzzy matcher as the app (`matchCourseTextsFromContent`) to drop ones that are already in the library.
3. Classified the rest with a hardcoded author death-date table (life+70 → PD if author died ≤ 1956).
4. Ancient/classical authors: original is always PD, but the **specific translation** you upload determines copyright. Check the translator/edition before sourcing.

## ⛔ Likely still in copyright — DO NOT UPLOAD without rights

Author died after 1956 or is contemporary. These would need licensing or replacement with a PD alternative.

| Title | Author | Section/Edition | # courses | Reasoning |
|---|---|---|---|---|
| Psychology and Alchemy | — | Carl Jung, Chapters 1 | 1 | resolved author from text: "carl jung" · author died 1961 (life+70 NOT expired) |
| Lives of Alchemystical Philosophers | Arthur Edward Waite | selected biographical chapters | 1 | Waite died 1942 — public domain in US and most jurisdictions (life+70 expired). Source: https://www.gutenberg.org/ebooks/68687 |
| The Structure of Scientific Revolutions | — | Thomas Kuhn, Chapters I | 1 | resolved author from text: "thomas kuhn" · author died 1996 (life+70 NOT expired) |

## ❓ Needs human review

Author not in the lookup table. Manual research before upload.

_None._

## ⚠ Likely PD original, translation copyright unknown

Pick a PD translation (e.g., James Legge for Confucian/Daoist texts; Müller's *Sacred Books of the East*; Wallis Budge for Egyptian; pre-1929 editions on Gutenberg/sacred-texts). Modern translations from publishers like Penguin, Oxford World Classics, etc. are typically still in copyright.

| Title | Author | Section/Edition | # courses | Reasoning |
|---|---|---|---|---|
| Zhuangzi | Chuang Tzu | T127 | 6 | ancient/classical author — original is PD |
| Sepher Yetzirah | Rabbi Akiba ben Joseph | T027 | 3 | ancient/classical author — original is PD |
| Tao Te Ching | Lao Tzu | T008 | 3 | ancient/classical author — original is PD |
| I Ching | Anonymous | with Jung's foreword to the Wilhelm/Baynes translation | 2 | ancient/classical author — original is PD |
| The New Testament | Paul's Letters | 1 Corinthians 1–2, Romans 8 | 2 | matched ancient/classical title pattern · ancient/classical author — original is PD |
| The Tao Te Ching | — | Lao Tzu, selected chapters | 2 | resolved author from text: "lao tzu" · ancient/classical author — original is PD |
| Isis Unveiled, Volume 1 | — | — | 1 | matched ancient/classical title pattern · ancient/classical author — original is PD |
| The Apocryphal New Testament | Various | T104 | 1 | ancient/classical author — original is PD |
| The Elements Book I | Euclid | T006 | 1 | ancient/classical author — original is PD |
| The Hebrew Bible | T150 | Genesis 1:1 | 1 | matched ancient/classical title pattern · ancient/classical author — original is PD |
| The I Ching | Anonymous | T042 | 1 | ancient/classical author — original is PD |
| The Popol Vuh | Creation Narrative | Part I | 1 | matched ancient/classical title pattern · ancient/classical author — original is PD |
| The Popol Vuh, Part I | Creation Narrative | — | 1 | matched ancient/classical title pattern · ancient/classical author — original is PD |
| The Rig Veda | T122 | Nasadiya Sukta (Hymn of Creation, 10.129) | 1 | matched ancient/classical title pattern · ancient/classical author — original is PD |
| The Way of a Pilgrim | Anonymous | T079 | 1 | ancient/classical author — original is PD |
| Works of Mencius | Mencius | T126 | 1 | ancient/classical author — original is PD |

## ✅ Likely public-domain — safe to upload

Author died ≥ 70 years ago. Original-language work is PD; if it's a translation, double-check the translator is also pre-1956 (death-year shown above).

| Title | Author | Section/Edition | # courses | Reasoning |
|---|---|---|---|---|
| Thus Spoke Zarathustra | Friedrich Nietzsche | T011 | 5 | author died 1900 (life+70 expired) |
| Tertium Organum | — | P.D. Ouspensky, Chapters 1 | 4 | resolved author from text: "p.d. ouspensky" · author died 1947 (life+70 expired) |
| The World as Will and Representation | §§30–36 | Arthur Schopenhauer, Volume I, Book III | 4 | resolved author from text: "arthur schopenhauer" · author died 1860 (life+70 expired) |
| Creative Evolution | — | — | 3 | title hints author: "henri bergson" · author died 1941 (life+70 expired) |
| Harmonices Mundi Book V | Johannes Kepler | — | 3 | author died 1630 (life+70 expired) |
| Revelations of Divine Love | Julian of Norwich | T133 | 3 | author died 1416 (life+70 expired) |
| The Book of the City of Ladies | Christine de Pizan | T138 | 2 | author died 1430 (life+70 expired) |
| The Chemical Wedding of Christian Rosenkreutz | — | Johann Valentin Andreae, Days 1 | 2 | resolved author from text: "johann valentin andreae" · author died 1654 (life+70 expired) |
| The Egyptian Book of the Dead | — | E.A. Wallis Budge translation, selected chapters | 2 | resolved author from text: "e.a. wallis budge" · author died 1934 (life+70 expired) |
| The Elementary Forms of Religious Life | — | Émile Durkheim, Introduction and Book I | 2 | resolved author from text: "émile durkheim" · author died 1917 (life+70 expired) |
| The Guide for the Perplexed | T117 | Maimonides, Part I, Chapters 50 | 2 | resolved author from text: "maimonides" · author died 1204 (life+70 expired) |
| The Works of Philo of Alexandria | On the Creation of the World (selections) and On the Confusion of Tongues (selections) | T118 | 2 | resolved author from text: "philo of alexandria" · author died 50 (life+70 expired) |
| A Moslem Saint / The Tarjuman al | Ashwaq | T116 | 1 | title hints author: "ibn arabi" · author died 1240 (life+70 expired) |
| A Vindication of the Rights of Woman | Mary Wollstonecraft | T157 | 1 | author died 1797 (life+70 expired) |
| Alice Fletcher and Francis La Flesche | — | The Omaha Tribe, Introduction and selected sections | 1 | resolved author from text: "francis la flesche" · author died 1932 (life+70 expired) |
| Autobiography of Madame Guyon | T137 | — | 1 | resolved author from text: "madame guyon" · author died 1717 (life+70 expired) |
| E. A. Wallis Budge | — | Kebra Nagast (The Glory of Kings), Introduction and selected chapters | 1 | resolved author from text: "e. a. wallis budge" · author died 1934 (life+70 expired) |
| Edward Tylor | Primitive Culture, Volume I | — | 1 | resolved author from text: "edward tylor" · author died 1917 (life+70 expired) |
| Émile Durkheim | — | The Elementary Forms of Religious Life, Introduction and Book I, Chapter 1 | 1 | resolved author from text: "émile durkheim" · author died 1917 (life+70 expired) |
| Franz Boas | Tsimshian Mythology, Introduction | — | 1 | resolved author from text: "franz boas" · author died 1942 (life+70 expired) |
| James Mooney | The Ghost | — | 1 | resolved author from text: "james mooney" · author died 1921 (life+70 expired) |
| Julian of Norwich | Revelations of Divine Love, First Revelation | — | 1 | resolved author from text: "julian of norwich" · author died 1416 (life+70 expired) |
| Lewis Spence | The Popol Vuh: The Mythic and Heroic Sagas of the Kichés of Central America | — | 1 | resolved author from text: "lewis spence" · author died 1955 (life+70 expired) |
| Magic White and Black | — | Franz Hartmann, Chapters on Sympathetic Magic and the Astral Plane | 1 | resolved author from text: "franz hartmann" · author died 1912 (life+70 expired) |
| Novum Organum | Aphorisms, selected | Francis Bacon, Books I | 1 | resolved author from text: "francis bacon" · author died 1626 (life+70 expired) |
| P.D. Ouspensky | — | Tertium Organum, Chapters I | 1 | resolved author from text: "p.d. ouspensky" · author died 1947 (life+70 expired) |
| Primitive Culture Volume 1 | — | Edward Burnett Tylor, Chapters on Animism and Survivals | 1 | resolved author from text: "edward burnett tylor" · author died 1917 (life+70 expired) |
| Robert Sutherland Rattray | — | Ashanti, Chapters 1 | 1 | resolved author from text: "robert sutherland rattray" · author died 1938 (life+70 expired) |
| Scivias | Hildegard of Bingen | T134 | 1 | author died 1179 (life+70 expired) |
| Teresa of Ávila | The Interior Castle, First | — | 1 | resolved author from text: "teresa of ávila" · author died 1582 (life+70 expired) |
| The Book of Healing | Avicenna | T113 | 1 | author died 1037 (life+70 expired) |
| The Book of Margery Kempe | T136 | — | 1 | resolved author from text: "margery kempe" · author died 1438 (life+70 expired) |
| The Flowing Light of the Godhead | Mechthild of Magdeburg | T135 | 1 | author died 1282 (life+70 expired) |
| The Hermetic Museum Volume 1 | Arthur Edward Waite (ed.), selected treatises | — | 1 | resolved author from text: "arthur edward waite" · author died 1942 (life+70 expired) |
| The Incoherence of the Philosophers | Al | T111 | 1 | resolved author from text: "philo" · author died 50 (life+70 expired) |
| The Life of Teresa of Ávila | T038 | — | 1 | resolved author from text: "teresa of ávila" · author died 1582 (life+70 expired) |
| The Lotus Sutra | Trans. Max Müller / H. Kern | T123 | 1 | resolved author from text: "max müller" · author died 1900 (life+70 expired) |
| The Natural History of Religion | David Hume | — | 1 | author died 1776 (life+70 expired) |
| The Niche for Lights | Al | T115 | 1 | title hints author: "al-ghazali" · author died 1111 (life+70 expired) |
| The Perfect Way | Anna Kingsford and Edward Maitland | T140 | 1 | resolved author from text: "edward maitland" · author died 1897 (life+70 expired) |
| The Subjection of Women | John Stuart Mill | T158 | 1 | author died 1873 (life+70 expired) |
| The Theory of Numbers | Thomas Heath | T084 | 1 | author died 1940 (life+70 expired) |
| The Works of Mencius | Trans. James Legge | T126 | 1 | resolved author from text: "james legge" · author died 1897 (life+70 expired) |
| Washington Matthews | Navaho Legends, Preface and Opening Legends | — | 1 | resolved author from text: "washington matthews" · author died 1905 (life+70 expired) |
| William James | The Varieties of Religious Experience, Lectures I | — | 1 | resolved author from text: "william james" · author died 1910 (life+70 expired) |
