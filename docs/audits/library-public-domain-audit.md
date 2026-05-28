# Library Public-Domain Audit

_Generated 2026-05-08T15:54:00.730Z · scope: `texts` table (staging) · 106 rows_

## Summary

- Total texts: **106**
- License explicitly set: **0** (PD: 0, CC-BY: 0, ARR: 0)
- License field empty (computed below): **106**

### Computed verdicts (where license is null)

- ✅ Likely public-domain (modern author, life+70 expired or US pre-1930): **86**
- ⚠ Likely PD original, but **translation copyright unknown**: **13**  _(ancient/classical authors — original work is PD, translation may not be)_
- ⛔ Likely still in copyright (author died after 1956 or contemporary): **5**
- ❓ Needs human review (author not in lookup or insufficient data): **2**

## ⚠ Top-priority finding

**Every text in the library has `license = NULL`** (canonical column from the schema). This is a data-hygiene issue independent of whether the works are actually public domain — the audit can't confirm anything definitively until that column is populated on upload. Recommendation: backfill the `license` column for all 106 rows based on the verdicts below, and add a NOT NULL constraint going forward.

### How verdicts are computed

1. The `license` column is canonical when set (`public-domain` / `cc-by` / `all-rights-reserved`).
2. If null, audit uses a hardcoded author death-date table (life+70 → PD if author died ≤ 1956).
3. US 95-year rule: works first-published before 1930 are PD as of 2026.
4. **Translations have separate copyright.** An ancient author (Plato, Laozi, Aristotle…) makes the *original* PD, but the *translation* you have may still be in copyright if the translator died after 1956 or it was published after 1929. The schema has no `translator` column — the audit can only flag the risk.
5. The stored `year` is sometimes a reprint year, not the first-publication year. When year ≥ 1930, the audit treats it as suspect and falls back to author death-date.

## ⛔ Likely still in copyright

Author died after 1956 (life+70 not yet expired) or is contemporary. **Highest priority — these may need to be removed or licensed.**

| Title | Author | DB year | License | Reasoning | Flags |
|---|---|---|---|---|---|
| Jewish Magic and Superstition | Joshua Trachtenberg | 1939 | — | author died 1959 (life+70 NOT yet expired) · year=1939 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| Jewish Magic and Superstition: A Study in Folk Religion | Joshua Trachtenberg | 1939 | — | author died 1959 (life+70 NOT yet expired) · year=1939 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Emerald Tablets of Thoth the Atlantean | Doreal | — | — | author died 1963 (life+70 NOT yet expired) | license-missing · year-missing |
| The Practice of Magical Evocation: A Complete Course | Franz Bardon | — | — | author died 1958 (life+70 NOT yet expired) | license-missing · year-missing |
| Yoga Sūtras of Patañjali | Michael Beloved | 2007 | — | author is contemporary (no death year) · year=2007 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |

## ❓ Needs human review

Author not in the lookup table. Manual research required.

| Title | Author | DB year | License | Reasoning | Flags |
|---|---|---|---|---|---|
| The First Six Books of the Elements of Euclid | Euclid | 2007 | — | author not in lookup · year=2007 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Meaning of the Glorious Quran | Mohammed Marmaduke Pickthall
 Hyderabad | 1938 | — | author not in lookup · year=1938 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |

## ⚠ Likely PD original, translation copyright unknown

Original work is ancient and definitely public domain. The *translation* may or may not be — depends on the translator (not stored in DB). Spot-check a few of these to confirm translator/edition.

| Title | Author | DB year | License | Reasoning | Flags |
|---|---|---|---|---|---|
| Apology | Plato | — | — | author is ancient/classical | license-missing · translation-copyright-risk · year-missing |
| Phaedo | Plato | -360 | — | author is ancient/classical · year=-360 (< 1930 → US PD by publication) | license-missing · translation-copyright-risk |
| Symposium | Plato | -385 | — | author is ancient/classical · year=-385 (< 1930 → US PD by publication) | license-missing · translation-copyright-risk |
| Tahafut al-Tahafut (The Incoherence of the Incoherence) | Unknown | — | — | author is ancient/classical | license-missing · translation-copyright-risk · year-missing |
| The Analects of Confucius (from the Chinese Classics) | Confucius | 2002 | — | author is ancient/classical · year=2002 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · translation-copyright-risk · year-may-be-reprint |
| The Art of War | Sunzi | 1910 | — | author is ancient/classical · year=1910 (< 1930 → US PD by publication) | license-missing · translation-copyright-risk |
| The Bezels of Wisdom | Unknown | — | — | author is ancient/classical | license-missing · translation-copyright-risk · year-missing |
| The Emerald Tablet of Hermes: Multiple Translations | Hermes Trismegistus | — | — | author is ancient/classical | license-missing · translation-copyright-risk · year-missing |
| The Metaphysics | Aristotle | 2010 | — | author is ancient/classical · year=2010 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · translation-copyright-risk · year-may-be-reprint |
| The Nicomachean Ethics of Aristotle | Aristotle | — | — | author is ancient/classical | license-missing · translation-copyright-risk · year-missing |
| The Republic | Plato | 1998 | — | author is ancient/classical · year=1998 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · translation-copyright-risk · year-may-be-reprint |
| The Tao Teh King, or the Tao and its Characteristics | Laozi | 1995 | — | author is ancient/classical · year=1995 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · translation-copyright-risk · year-may-be-reprint |
| The Tibetan Book of the Dead: The Great Liberation by Hearing in the Intermediate States | Padmasambhava | — | — | author is ancient/classical | license-missing · translation-copyright-risk · year-missing |

## ✅ Likely public-domain

Author died ≥ 70 years ago, OR work was first published before 1930. These can safely be backfilled with `license = public-domain`.

| Title | Author | DB year | License | Reasoning | Flags |
|---|---|---|---|---|---|
| A Treatise on the Circle and the Sphere | Lowell Coolidge Julian | 1916 | — | author died 1954 (life+70 expired by 2026) · year=1916 (< 1930 → US PD by publication) | license-missing |
| An Enquiry Concerning Human Understanding | David Hume | 1777 | — | author died 1776 (life+70 expired by 2026) · year=1777 (< 1930 → US PD by publication) | license-missing |
| Beyond Good and Evil | Friedrich Nietzsche | 1886 | — | author died 1900 (life+70 expired by 2026) · year=1886 (< 1930 → US PD by publication) | license-missing |
| Beyond the Pleasure Principle | Sigmund Freud | 1922 | — | author died 1939 (life+70 expired by 2026) · year=1922 (< 1930 → US PD by publication) | license-missing |
| Bulfinch's Mythology | Thomas Bulfinch | 1855 | — | author died 1867 (life+70 expired by 2026) · year=1855 (< 1930 → US PD by publication) | license-missing |
| Bulfinch's Mythology: The Age of Fable | Thomas Bulfinch | 2002 | — | author died 1867 (life+70 expired by 2026) · year=2002 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| Christian Astrology - Volume II | William Lilly | 1647 | — | author not in lookup · year=1647 (< 1930 → US PD by publication) | license-missing |
| Christian Astrology Volume 1 | William Lilly | 1647 | — | author not in lookup · year=1647 (< 1930 → US PD by publication) | license-missing |
| Comte de Gabalis | Abbé N. de Montfaucon de Villars | 1913 | — | author died 1673 (life+70 expired by 2026) · year=1913 (< 1930 → US PD by publication) | license-missing |
| Cosmic Consciousness: A Study in the Evolution of the Human Mind | Richard Maurice Bucke | 1901 | — | author died 1902 (life+70 expired by 2026) · year=1901 (< 1930 → US PD by publication) | license-missing |
| Dhammapada, a Collection of Verses; Being One of the Canonical Books of the Buddhists | F. Max Müller | 1999 | — | author died 1900 (life+70 expired by 2026) · year=1999 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| Dialogues Concerning Natural Religion | David Hume | 1779 | — | author died 1776 (life+70 expired by 2026) · year=1779 (< 1930 → US PD by publication) | license-missing |
| Essays by Ralph Waldo Emerson | Ralph Waldo Emerson | 1907 | — | author died 1882 (life+70 expired by 2026) · year=1907 (< 1930 → US PD by publication) | license-missing |
| Ethics | Benedictus de Spinoza | 1677 | — | author not in lookup · year=1677 (< 1930 → US PD by publication) | license-missing |
| Evidence as to Man's Place in Nature | Thomas Henry Huxley | 1863 | — | author not in lookup · year=1863 (< 1930 → US PD by publication) | license-missing |
| Human Nature and Conduct: An Introduction to Social Psychology | John Dewey | 1922 | — | author died 1952 (life+70 expired by 2026) · year=1922 (< 1930 → US PD by publication) | license-missing |
| Initiation, Human and Solar | Alice A. Bailey | 1922 | — | author died 1949 (life+70 expired by 2026) · year=1922 (< 1930 → US PD by publication) | license-missing |
| Kabbala Denudata: The Kabbalah Unveiled | S. L. MacGregor Mathers | 1912 | — | author died 1918 (life+70 expired by 2026) · year=1912 (< 1930 → US PD by publication) | license-missing |
| Light On The Path and Through the Gates of Gold | Mabel Collins | 2010 | — | author died 1927 (life+70 expired by 2026) · year=2010 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| Magic and Religion | Andrew Lang | 1901 | — | author died 1912 (life+70 expired by 2026) · year=1901 (< 1930 → US PD by publication) | license-missing |
| Mechanism of the Heavens | Mary Fairfax Greig Somerville | — | — | author died 1872 (life+70 expired by 2026) | license-missing · year-missing |
| Meditations | Marcus Aurelius | 121 | — | author not in lookup · year=121 (< 1930 → US PD by publication) | license-missing |
| Mysticism: A Study in Nature and Development of Spiritual Consciousness | Evelyn Underhill | 1911 | — | author died 1941 (life+70 expired by 2026) · year=1911 (< 1930 → US PD by publication) | license-missing |
| Mystics of Islam | Reynold Nicholson | — | — | author died 1945 (life+70 expired by 2026) | license-missing · year-missing |
| Myths and Legends of Ancient Greece and Rome | E. M. Berens | 2007 | — | author died 1900 (life+70 expired by 2026) · year=2007 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| On the Origin of Species By Means of Natural Selection | Charles Darwin | 1859 | — | author died 1882 (life+70 expired by 2026) · year=1859 (< 1930 → US PD by publication) | license-missing |
| Pistis Sophia: A Gnostic Miscellany | G. R. S. Mead | 1921 | — | author died 1933 (life+70 expired by 2026) · year=1921 (< 1930 → US PD by publication) | license-missing |
| Primitive Culture, Vol. 1 of 2 | Edward B. Tylor | 1871 | — | author not in lookup · year=1871 (< 1930 → US PD by publication) | license-missing |
| Prolegomena to Any Future Metaphysics | Immanuel Kant | 1953 | — | author died 1804 (life+70 expired by 2026) · year=1953 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| Psychology of the Unconscious | C. G. Jung | 1916 | — | author died 1961 (life+70 NOT yet expired) · year=1916 (< 1930 → US PD by publication) · year overrides death-year (work pub'd before 1930 in US) | license-missing |
| Ptolemy's Tetrabiblos or Quadripartite: Four Books of the Influence of the Stars | J. M. Ashmand | 1822 | — | author not in lookup · year=1822 (< 1930 → US PD by publication) | license-missing |
| Relativity: The Special and General Theory | Albert Einstein | 1920 | — | author died 1955 (life+70 expired by 2026) · year=1920 (< 1930 → US PD by publication) | license-missing |
| Science and the Modern World: Lowell Lectures | Alfred North Whitehead | 1925 | — | author died 1947 (life+70 expired by 2026) · year=1925 (< 1930 → US PD by publication) | license-missing |
| Sefer Yetzirah & Saadia’s Commentary | Saadia ben Joseph | 1891 | — | author not in lookup · year=1891 (< 1930 → US PD by publication) | license-missing |
| Self-Reliance and Other Essays | Ralph Waldo Emerson | 1844 | — | author died 1882 (life+70 expired by 2026) · year=1844 (< 1930 → US PD by publication) | license-missing |
| The Alchemy of Happiness | al-Ghazali | — | — | author died 1111 (life+70 expired by 2026) | license-missing · year-missing |
| The Art of Worldly Wisdom: A Pocket Oracle | Baltasar Gracián | — | — | author died 1658 (life+70 expired by 2026) | license-missing · year-missing |
| The Book of Ceremonial Magic | Arthur Edward Waite | 1913 | — | author died 1942 (life+70 expired by 2026) · year=1913 (< 1930 → US PD by publication) | license-missing |
| The Book of the Dead: The Papyrus of Ani in the British Museum | E. A. Wallis Budge | 1895 | — | author not in lookup · year=1895 (< 1930 → US PD by publication) | license-missing |
| The Book of the Sacred Magic of Abramelin the Mage | S. L. MacGregor Mathers | 1900 | — | author died 1918 (life+70 expired by 2026) · year=1900 (< 1930 → US PD by publication) | license-missing |
| The Cloud of Unknowing | Evelyn Underhill | 1922 | — | author died 1941 (life+70 expired by 2026) · year=1922 (< 1930 → US PD by publication) | license-missing |
| The Conference of the Birds | Farid ud-Din Attar | 1889 | — | author not in lookup · year=1889 (< 1930 → US PD by publication) | license-missing |
| The Confessions of Saint Augustine | Saint Augustine | 401 | — | author not in lookup · year=401 (< 1930 → US PD by publication) | license-missing |
| The Descent of Man, and Selection in Relation to Sex | Charles Darwin | 1871 | — | author died 1882 (life+70 expired by 2026) · year=1871 (< 1930 → US PD by publication) | license-missing |
| THE DIVINE PROPORTION | Luca Pacioli | 1509 | — | author not in lookup · year=1509 (< 1930 → US PD by publication) | license-missing |
| The Divine Pymander | Hermes Mercurius Trismegistus, translated by John Everard | 1650 | — | author not in lookup · year=1650 (< 1930 → US PD by publication) | license-missing |
| The Ego and the Id | Sigmund Freud | 1923 | — | author died 1939 (life+70 expired by 2026) · year=1923 (< 1930 → US PD by publication) | license-missing |
| The Elementary Forms of the Religious Life | Emile Durkheim | 1912 | — | author died 1917 (life+70 expired by 2026) · year=1912 (< 1930 → US PD by publication) | license-missing |
| The Gateless Gate | Wu-men Hui-hai | 1228 | — | author not in lookup · year=1228 (< 1930 → US PD by publication) | license-missing |
| The Gay Science | Friedrich Nietzsche | 1882 | — | author died 1900 (life+70 expired by 2026) · year=1882 (< 1930 → US PD by publication) | license-missing |
| The Golden Bough: A Study of Magic and Religion | James George Frazer | 1890 | — | author not in lookup · year=1890 (< 1930 → US PD by publication) | license-missing |
| The Gospel of Buddha, Compiled from Ancient Records | Paul Carus | 1915 | — | author died 1919 (life+70 expired by 2026) · year=1915 (< 1930 → US PD by publication) | license-missing |
| The Harmony of the World (Harmonice Mundi) | Johannes Kepler | 1619 | — | author not in lookup · year=1619 (< 1930 → US PD by publication) | license-missing |
| The Hermetic Museum, Vol. I | Arthur Edward Waite | 1893 | — | author died 1942 (life+70 expired by 2026) · year=1893 (< 1930 → US PD by publication) | license-missing |
| The Imitation of Christ | Thomas à Kempis | 1999 | — | author died 1471 (life+70 expired by 2026) · year=1999 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Interior Castle or The Mansions | St. Teresa of Avila | 1921 | — | author died 1582 (life+70 expired by 2026) · year=1921 (< 1930 → US PD by publication) | license-missing |
| The Interpretation of Dreams | Sigmund Freud | 1913 | — | author died 1939 (life+70 expired by 2026) · year=1913 (< 1930 → US PD by publication) | license-missing |
| The Kybalion: A Study of The Hermetic Philosophy of Ancient Egypt and Greece | Three Initiates | 1912 | — | author died 1932 (life+70 expired by 2026) · year=1912 (< 1930 → US PD by publication) | license-missing |
| The Life of St. Teresa of Jesus, of the Order of Our Lady of Carmel | Saint Teresa of Avila | 1904 | — | author died 1582 (life+70 expired by 2026) · year=1904 (< 1930 → US PD by publication) | license-missing |
| The Masnavi | Rumi | 1898 | — | author not in lookup · year=1898 (< 1930 → US PD by publication) | license-missing |
| The Mathematicall Praeface to Elements of Geometrie of Euclid of Megara | John Dee | 2007 | — | author died 1609 (life+70 expired by 2026) · year=2007 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Moral Discourses of Epictetus | Elizabeth Carter | 1873 | — | author not in lookup · year=1873 (< 1930 → US PD by publication) | license-missing |
| The Nature of the Physical World | Sir Arthur Stanley Eddington | 1928 | — | author died 1944 (life+70 expired by 2026) · year=1928 (< 1930 → US PD by publication) | license-missing |
| The Pictorial Key to the Tarot | Arthur Edward Waite | 1911 | — | author died 1942 (life+70 expired by 2026) · year=1911 (< 1930 → US PD by publication) | license-missing |
| The Principles of Light and Color | Edwin Babbitt | 1878 | — | author not in lookup · year=1878 (< 1930 → US PD by publication) | license-missing |
| The Principles of Psychology, Volume 1 | William James | 1918 | — | author died 1910 (life+70 expired by 2026) · year=1918 (< 1930 → US PD by publication) | license-missing |
| The Problems of Philosophy | Bertrand Russell | 1912 | — | author died 1970 (life+70 NOT yet expired) · year=1912 (< 1930 → US PD by publication) · year overrides death-year (work pub'd before 1930 in US) | license-missing |
| The Real History of the Rosicrucians | Arthur Edward Waite | 1887 | — | author died 1942 (life+70 expired by 2026) · year=1887 (< 1930 → US PD by publication) | license-missing |
| The Real History of the Rosicrucians | Arthur Edward Waite | 1887 | — | author died 1942 (life+70 expired by 2026) · year=1887 (< 1930 → US PD by publication) | license-missing |
| The Science of Breath: The Essential Works of Yogi | Yogi Ramacharaka, Joel Fotinos | 2023 | — | author died 1932 (life+70 expired by 2026) · year=2023 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Secret Doctrine: The Synthesis of Science, Religion, and Philosophy | H. P. Blavatsky | 1888 | — | author not in lookup · year=1888 (< 1930 → US PD by publication) | license-missing |
| The Secret Teachings of All Ages | Manly P. Hall | 1928 | — | author died 1990 (life+70 NOT yet expired) · year=1928 (< 1930 → US PD by publication) · year overrides death-year (work pub'd before 1930 in US) | license-missing |
| The Sepher Ha-Zohar or The Book of Light | Nurho de Manhar | 1900 | — | author died 1923 (life+70 expired by 2026) · year=1900 (< 1930 → US PD by publication) | license-missing |
| The Six Enneads | Plotinus | 300 | — | author not in lookup · year=300 (< 1930 → US PD by publication) | license-missing |
| The Song Celestial; Or, Bhagavad-Gîtâ (from the Mahâbhârata) | Sir Edwin Arnold | 1900 | — | author died 1904 (life+70 expired by 2026) · year=1900 (< 1930 → US PD by publication) | license-missing |
| The Tarot of the Bohemians: The Most Ancient Book in the World. For the Exclusive Use of Initiates | Papus | 1892 | — | author not in lookup · year=1892 (< 1930 → US PD by publication) | license-missing |
| The Upanishads | Swami Paramananda | 2002 | — | author died 1940 (life+70 expired by 2026) · year=2002 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Varieties of Religious Experience: A Study in Human Nature | William James | 1917 | — | author died 1910 (life+70 expired by 2026) · year=1917 (< 1930 → US PD by publication) | license-missing |
| The Veil of Isis | H.P. Blavatsky | 1877 | — | author died 1891 (life+70 expired by 2026) · year=1877 (< 1930 → US PD by publication) | license-missing |
| The Voice of the Silence: Being Chosen Fragments from the Book of the Golden Precepts | Helena Petrovna Blavatsky | 2015 | — | author died 1891 (life+70 expired by 2026) · year=2015 (≥ 1930 → may be reprint year, NOT original pub) | license-missing · year-may-be-reprint |
| The Voyage of the Beagle | Charles Darwin | 1839 | — | author died 1882 (life+70 expired by 2026) · year=1839 (< 1930 → US PD by publication) | license-missing |
| The World as Will and Idea (Vol. 2 of 3) | Arthur Schopenhauer | 1909 | — | author died 1860 (life+70 expired by 2026) · year=1909 (< 1930 → US PD by publication) | license-missing |
| The Yî King | James Legge | 1882 | — | author died 1897 (life+70 expired by 2026) · year=1882 (< 1930 → US PD by publication) | license-missing |
| Thus Spake Zarathustra: A Book for All and None | Friedrich Nietzsche | 1883 | — | author died 1900 (life+70 expired by 2026) · year=1883 (< 1930 → US PD by publication) | license-missing |
| Totem and Taboo: Resemblances between the Psychic Lives of Savages and Neurotics | Sigmund Freud | 1919 | — | author died 1939 (life+70 expired by 2026) · year=1919 (< 1930 → US PD by publication) | license-missing |
| Transcendental Magic Its Doctrine and Ritual (Dogma et Rituel de la Haute Magie) | Eliphas Levi | 1896 | — | author not in lookup · year=1896 (< 1930 → US PD by publication) | license-missing |
