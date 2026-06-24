// Import C18: Technology as Modern Myth into staging
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join('C:\\Projects\\Digital-Grimoire\\app', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const content = {
  weeks: [
    // ── WEEK 1 ──────────────────────────────────────────────────────────────
    {
      week_number: 1,
      title: "What 'Myth' Actually Means",
      core_question: "When you call something a 'myth,' do you mean it's false — or something more precise, and more dangerous, than false?",
      key_tension: "Myth as error vs. Myth as structural necessity — A myth that is simply false can be corrected. A myth that is structurally necessary — that organizes experience, enforces social cohesion, defines who counts as real — requires something different from correction. Which kind is a technology myth?",
      lens_focus: ["historical_anthropological", "psychological", "philosophical"],
      readings: [
        {
          title: "The Golden Bough",
          author: "James George Frazer",
          text_id: "T007",
          section: "Introduction and Chapter 1",
          selection_rationale: "Frazer establishes the foundational analytical move: myth is not a false belief to be corrected but a structure to be decoded. His method — reconstruction of the system that makes a practice coherent — is exactly what this course applies to technology.",
          tiers: {
            keystone: { reference: "Introduction, §1: the priest at Nemi — standing guard with a drawn sword, waiting to be killed by his successor", description: "Frazer's opening image: a ritual role whose rules make no sense until you know the mythological system it inhabits. The first lesson in mythological analysis: behavior that appears absurd from outside a myth is coherent from inside it." },
            passage: { reference: "Introduction + Chapter 1, 'The King of the Wood' complete", description: "Frazer's method: take a practice that appears incomprehensible, reconstruct the mythological system it assumes, and show that within that system the practice is not only logical but necessary." },
            full: { reference: "Introduction + Chapters 1–3", description: "Extends through Frazer's early comparative analysis: the same mythological system appearing across cultures in structurally identical forms." }
          }
        },
        {
          title: "The Elementary Forms of Religious Life",
          author: "Émile Durkheim",
          text_id: "T071",
          section: "Introduction and Book I, Chapter 1",
          selection_rationale: "Durkheim's sacred/profane binary makes the week's central question operational — allowing 'is this technology functioning mythologically?' to be given a specific, structural answer rather than an impressionistic one.",
          tiers: {
            keystone: { reference: "Book I, Chapter 1: Durkheim's definition of the sacred/profane binary — 'Sacred things are simply collective ideals that have fixed themselves on material objects'", description: "Durkheim's most powerful claim: what makes something sacred is not its intrinsic quality but its relationship to the collective. Which objects, experiences, and spaces are currently treated as sacred in technology culture?" },
            passage: { reference: "Introduction + Book I, Chapter 1 complete", description: "Durkheim's argument for why defining religion by its social structure is more analytically useful than defining it by experiential content." },
            full: { reference: "Introduction + Book I, Chapters 1–2", description: "Extends through Durkheim's methodological argument for studying 'elementary forms.' Applied to technology: what would the elementary form of a technology myth look like?" }
          }
        },
        {
          title: "Psychology of the Unconscious",
          author: "Carl Jung",
          section: "Chapters on Symbol Formation and the Collective Unconscious",
          selection_rationale: "Jung sits in productive tension with Durkheim throughout this course. Durkheim locates myth in the social body; Jung locates it in the individual psychology that social structures activate.",
          tiers: {
            keystone: { reference: "The opening argument: the unconscious does not think in concepts but in images — and those images have a structure that is not individual but collective", description: "Jung's claim that mythological structures are expressions of psychological structures that human minds share. If a technology activates an archetypal structure, it does so not because its designers intended it but because the architecture of human psychology bends in that direction." },
            passage: { reference: "Part I, Chapters 1–2: the distinction between personal and collective unconscious; the archetype as psychological structure", description: "The full argument: beneath personal psychology lies a layer of collectively shared symbolic structures — archetypes — which express themselves through mythology, religion, and art." },
            full: { reference: "Part I, Chapters 1–3", description: "Extends through Jung's account of how archetypes become visible — through myths, dreams, and spontaneous symbolic productions." }
          }
        },
        {
          title: "Thus Spoke Zarathustra",
          author: "Friedrich Nietzsche",
          section: "Prologue and 'On the Three Metamorphoses'",
          selection_rationale: "Nietzsche is the course's diagnostic framework. 'God is dead' is a claim about mythological systems — when the structure that organized collective meaning collapses, what fills the void?",
          tiers: {
            keystone: { reference: "Prologue §2–3: Zarathustra descends from the mountain and encounters the old saint who has not yet heard that God is dead", description: "Nietzsche's diagnostic: a mythological system has died — not refuted, but ceased to function as a live mythological force. Which technology myths are analogously operating on empty — and which are new ones in the process of being born?" },
            passage: { reference: "Prologue complete + 'On the Three Metamorphoses' (camel, lion, child)", description: "Technology is currently performing all three operations simultaneously — bearing old values, destroying them, and attempting to create new ones — without necessarily knowing which it is doing at any moment." },
            full: { reference: "Prologue + Parts I–II opening sections", description: "Extends through Zarathustra's early teachings. The student who reads Part II knows what it looks like to attempt to create a myth deliberately, and what it costs." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Identify one specific technology and perform a preliminary mythological anatomy.",
        instructions: [
          "Name the technology precisely — not a category ('social media') but a specific instance ('Instagram,' 'ChatGPT,' 'the iPhone'). This is the technology you will analyze throughout the course.",
          "Apply Frazer's move: what behavior does this technology require that would appear strange to someone who did not know the system? Describe it from the outside — without assuming the logic you are trying to reconstruct.",
          "Apply Durkheim's move: what does this technology treat as sacred? What is set apart from ordinary use, invested with special weight, surrounded with anxiety or reverence?",
          "Apply Jung's move: which archetype is being activated in the typical experience of this technology?",
          "Apply Nietzsche's move: is this technology operating on a live mythological system, or drawing on one that is already functionally dead — animated with borrowed energy?",
          "Write 2–3 paragraphs on what the four moves reveal together that none reveals alone."
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"sacred\" in the library.",
          instructions: [
            "Look at results from at least 6 different books. Note which traditions define the sacred by its content (what the sacred is) and which by its social or structural function (what the sacred does).",
            "Identify whether any result defines the sacred in a way that could apply to a non-religious phenomenon — a secular object, practice, or space that meets the definition without invoking the divine.",
            "Find one result that defines the sacred negatively — by what it is not rather than what it is. What does the negative definition reveal that the positive definition does not?"
          ],
          documentation: "One paragraph on what the cross-tradition search reveals about the range of meanings 'sacred' carries — and which definition, precisely stated, is most useful for analyzing contemporary technology culture."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"why do myths persist?\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Historical/Anthropological and Psychological lens outputs. Note what each says about the mechanism of persistence — social inertia, psychological necessity, adaptive function, or something else.",
            "Read the Philosophical lens output. Does it distinguish between myths that persist because they are true, myths that persist because they are useful, and myths that persist because they are structurally embedded and difficult to exit?",
            "Ask which of these three mechanisms best explains why the technology myths you identified in the Lens Exercise persist."
          ],
          documentation: "Two to three sentences on which lens was most illuminating for the question of technology myth persistence — and one honest sentence on whether the Lens Engine output itself seemed to be inside any of the myths it was analyzing."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"myth\" (or \"mythology\" if more productive).",
          instructions: [
            "Look at the full cluster around 'myth.' Which traditions cluster most tightly — and which stand apart?",
            "Hover over the connections between the myth node and any scientific or philosophical texts. What does the connection suggest about how those traditions position themselves relative to mythological thinking?",
            "Adjust the similarity slider to its most permissive setting. Which texts not typically classified as 'mythological' appear nearest to the myth cluster? What does their adjacency suggest about where mythological structure persists in traditions that disavow the label?"
          ],
          documentation: "An annotated description of the myth cluster structure — which traditions own the node, which are adjacent, and which appear only at maximum similarity, suggesting they carry mythological structure while disavowing it."
        }
      ],
      synthesis_prompt: {
        prompt: "What is the difference between a myth and a mistake — and does contemporary technology culture primarily make mistakes, or primarily live inside myths?",
        expansion: [
          "Your Lens Exercise identified a specific technology's mythological anatomy using four moves. Do those moves converge on the same diagnosis, or pull in different directions? Which divergence is most productive?",
          "Your Deep Search found a range of definitions of 'sacred.' Apply the most useful one to your chosen technology. Does the fit illuminate something — or does the misfit reveal something more interesting?",
          "Your Graph exploration showed which traditions own the 'myth' node and which appear only at the permissive setting. If your chosen technology draws on a mythological grammar that its tradition disavows, what does it cost to use that grammar without acknowledging it?",
          "Nietzsche claims the death of a mythological system creates a vacuum that is always filled — never acknowledged, never empty. What filled the vacuum in technology culture — and is what filled it better, worse, or simply different from what it replaced?"
        ]
      },
      micro_artifact: {
        name: "Myth Anatomy Chart",
        description: "A structured one-page analysis of your chosen technology — organized into four rows (Frazer's structural logic, Durkheim's sacred/profane mapping, Jung's archetype identification, Nietzsche's diagnostic on live vs. borrowed mythological energy) with a brief paragraph per row.",
        purpose: "Establishes the specific technology you will analyze throughout the course. Produces the course's baseline analytical vocabulary before any new frameworks are introduced.",
        capstone_connection: "Becomes the 'Mythological Baseline' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 2 ──────────────────────────────────────────────────────────────
    {
      week_number: 2,
      title: "The Progress Narrative",
      core_question: "Is 'progress' a description of what keeps happening — or a story that makes the future feel manageable?",
      key_tension: "Progress as empirical fact vs. Progress as mythological commitment — The claim that technology improves the human condition is both a hypothesis that can be tested and a belief held prior to testing.",
      lens_focus: ["historical_anthropological", "philosophical", "scientific"],
      readings: [
        {
          title: "Novum Organum",
          author: "Francis Bacon",
          section: "Book I (Aphorisms I–LII)",
          selection_rationale: "Bacon is the founding mythologist of the progress narrative. He writes in the language of method while employing the grammar of salvation. Reading him closely reveals that 'technology makes progress' does not begin as an empirical result — it begins as a mythological commitment.",
          tiers: {
            keystone: { reference: "Aphorisms I–XI: 'Man, being the servant and interpreter of Nature, can do and understand so much and so much only as he has observed in fact or in thought of the course of nature'", description: "Bacon's founding mythological claim: knowledge is power, power is liberation, liberation is the proper destiny of the human mind. Science does not simply describe the world; it redeems it." },
            passage: { reference: "Aphorisms I–LII: the four Idols (of the Tribe, the Cave, the Marketplace, the Theatre)", description: "Bacon's account of the false gods that prevent true knowledge. The Idols are a critique of all previous mythology — but they are themselves offered as part of a new mythology." },
            full: { reference: "Aphorisms I–LXV", description: "Extends through Bacon's full critique and positive account of inductive method. The argument's mythological form becomes visible: the journey from darkness (Idols) to light (Induction) — the structure of every initiation narrative in the library." }
          }
        },
        {
          title: "The Structure of Scientific Revolutions",
          author: "Thomas S. Kuhn",
          section: "Chapters 1–4 and 10–12",
          selection_rationale: "Kuhn sits in direct tension with Bacon. Progress within a paradigm is real; revolutions involve incommensurable world views. Is current technology accelerating within a paradigm, or inside a paradigm revolution?",
          tiers: {
            keystone: { reference: "Chapter 10: 'Revolutions as Changes of World View' — scientists working in different paradigms do not merely disagree about facts; they inhabit different worlds", description: "Kuhn's most unsettling claim: progress within a paradigm is real and cumulative; progress across paradigms is not cumulative but revolutionary, involving incommensurable world views." },
            passage: { reference: "Chapters 1–4 (normal science, paradigms, anomaly, discovery) + Chapter 10", description: "The full arc from normal science through anomaly to revolution — itself a mythological structure: the stable world, the crack in it, the crisis, the new world." },
            full: { reference: "Chapters 1–4 + Chapters 10–12", description: "Extends through Kuhn's account of how revolutions are made — and resisted. The concept of 'progress' has two meanings the word does not distinguish." }
          }
        },
        {
          title: "The World as Will and Representation",
          author: "Arthur Schopenhauer",
          section: "Book II (§§17–24) and Book IV (§§54–57)",
          selection_rationale: "Schopenhauer is the philosophical dismantler of the progress myth. He does not argue that technology fails — he argues that the will driving technology cannot be satisfied by anything technology produces.",
          tiers: {
            keystone: { reference: "§§18–19: the will is not directed toward any goal — willing is inherently goalless, and satisfaction is always immediately replaced by new dissatisfaction", description: "Schopenhauer's claim directly against the progress narrative: every apparent goal achieved immediately reveals another goal behind it. The satisfaction promised by the progress narrative is structurally impossible." },
            passage: { reference: "Book II, §§17–24 + Book IV, §§54–57", description: "The full argument: technology succeeds — and immediately creates the next desire. The progress narrative names this 'advance.' Schopenhauer names it the nature of the will." },
            full: { reference: "Book II, §§17–29", description: "Extends through Schopenhauer's account of how the will manifests across all levels of nature." }
          }
        },
        {
          title: "Thus Spoke Zarathustra",
          author: "Friedrich Nietzsche",
          section: "'On the Vision and the Riddle' and 'The Convalescent'",
          selection_rationale: "The eternal recurrence is Nietzsche's counter-myth to progress: if everything recurs eternally, the future does not redeem the present. Holding Bacon, Kuhn, Schopenhauer, and Nietzsche together produces a view of the progress narrative that none of them achieves alone.",
          tiers: {
            keystone: { reference: "'On the Vision and the Riddle,' §2: Zarathustra's vision of the shepherd with the serpent in his throat — the eternal recurrence as the teaching that cannot be said directly", description: "The eternal recurrence is Nietzsche's counter-myth to progress: if everything recurs eternally, the future does not redeem the present. Progress — the belief that each moment builds toward something better — is the precise belief the eternal recurrence is designed to destroy." },
            passage: { reference: "'On the Vision and the Riddle' complete + 'The Convalescent'", description: "The eternal recurrence presented not as a doctrine to be understood but as a teaching to be lived — and the account of what it costs to live it." },
            full: { reference: "'On the Vision and the Riddle' + 'The Convalescent' + 'The Seven Seals'", description: "The three sections containing Nietzsche's most direct account of the eternal recurrence and its implications — and the counter-myth with its costs." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Perform a 'progress audit' of your chosen technology.",
        instructions: [
          "List three things your chosen technology demonstrably improved relative to what came before it. Be specific and honest.",
          "Apply Kuhn's distinction: are these improvements within a paradigm (more efficient) or paradigm-level change (requiring a different world view to understand)? Justify your classification.",
          "Apply Schopenhauer's test: for each improvement, identify the new desire it immediately generated. What does the improvement → new desire → improvement → new desire sequence suggest about whether the progress narrative describes an arc or a wheel?",
          "Apply Nietzsche's test: does the progress narrative your technology tells feel like a live myth (something people actually organize their lives around) or a borrowed myth (something repeated because it is required)? What is the evidence?",
          "Write a one-paragraph 'progress statement' for your technology — the most honest version you can produce — that holds all four analytical moves simultaneously without resolving them into a verdict."
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"progress\" in the library.",
          instructions: [
            "Look at results from at least 5 different books. Classify each result: does it treat progress as (a) a real directional force, (b) an illusion to be dismantled, (c) a structural feature of certain kinds of knowing, or (d) a mythological commitment that functions regardless of its truth?",
            "Find the text most skeptical of the progress narrative while remaining inside a tradition that values knowledge or transformation. What does it offer as an alternative to linear improvement?",
            "Note whether any tradition has no concept of progress. What does the existence of such a tradition suggest about whether progress is a universal human intuition or a culturally specific one?"
          ],
          documentation: "One paragraph on the distribution of positions across traditions — which most confidently affirm the progress narrative, which most directly challenge it, and what that distribution suggests about the mythological status of progress."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the claim \"technology makes the world better\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Scientific and Historical/Anthropological lens outputs. Note whether either identifies the claim as also mythological, not merely empirical.",
            "Read the Philosophical and Psychological lens outputs. Does the Philosophical lens identify the hidden assumptions in 'better'? Does the Psychological lens identify the needs the claim serves regardless of its truth?",
            "Ask: is there a lens output that neither affirms nor challenges the claim but simply describes the function it serves?"
          ],
          documentation: "Two to three sentences on the most productive divergence between lenses — where two lenses evaluate the claim in ways that are genuinely incompatible — and what holding that incompatibility reveals about the claim itself."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"progress\" (or \"improvement\" if more productive). Then search separately for \"cycle\" or \"recurrence.\"",
          instructions: [
            "Look at which texts cluster most tightly around the progress node. Are they predominantly scientific, philosophical, or religious?",
            "Find texts at the periphery of the progress cluster — nearest the boundary where it meets other clusters. What are those peripheral texts?",
            "Look at the cycle/recurrence node. What is the spatial relationship between the progress cluster and the cycle cluster — do they stand apart, or do they overlap?"
          ],
          documentation: "A short structural observation (3–5 sentences) on the spatial relationship between the progress and cycle/recurrence clusters — what traditions are represented in each, whether any texts appear in both, and what the structure suggests."
        }
      ],
      synthesis_prompt: {
        prompt: "What holds the progress narrative together — and what would have to happen for it to break?",
        expansion: [
          "Your progress audit produced a one-paragraph statement holding Bacon, Kuhn, Schopenhauer, and Nietzsche simultaneously. Does it read like a description of your technology's actual situation, or like an academic exercise you don't quite believe?",
          "Kuhn's paradigm revolutions suggest the progress narrative breaks not through refutation but through accumulation of anomalies the paradigm can no longer absorb. What anomalies is your technology currently accumulating?",
          "Your Graph exploration found the spatial relationship between progress and cycle/recurrence clusters. If that relationship is closer than the standard technology narrative assumes, what would it mean to take the cyclical account of time seriously inside a technology company?",
          "Schopenhauer says the will cannot be satisfied — only temporarily quieted. If the progress narrative is the will's deepest commitment to its own continuation: what would the people inside it lose if it stopped working?"
        ]
      },
      micro_artifact: {
        name: "Progress Narrative Map",
        description: "A structured analysis of the progress narrative as it operates in your chosen technology — organized into three sections: (1) where progress is real (specific Kuhnian evidence), (2) where progress is myth (Bacon's salvific grammar, Schopenhauer's will-as-wheel), and (3) the unresolved remainder.",
        purpose: "Introduces the first major fault line in the technology mythology: the gap between what the progress narrative describes and what it performs.",
        capstone_connection: "Becomes the 'Progress Narrative' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 3 ──────────────────────────────────────────────────────────────
    {
      week_number: 3,
      title: "The Great Work I: What Is the Lead?",
      core_question: "Every technology presents itself as a Great Work. What does it claim is the lead it is turning into gold — and what does that reveal about what it thinks is impure?",
      key_tension: "The judgment of impurity as technical claim vs. The judgment of impurity as political claim — Calling something 'base material' is not a neutral observation. It is a verdict about what is deficient, who is doing the judging, and what the finished product is for.",
      lens_focus: ["symbolic_occult", "psychological", "historical_anthropological"],
      readings: [
        {
          title: "The Secret Teachings of All Ages",
          author: "Manly P. Hall",
          section: "Chapters on Alchemy and the Philosopher's Stone",
          selection_rationale: "Hall establishes the human-as-prima-materia reading in its most explicit and accessible form. He names what is impure — the unawakened, uninitiated human — and names what the Great Work produces. This is the direct ancestor of both New Age crystalline human mythology and contemporary AI discourse.",
          tiers: {
            keystone: { reference: "Chapter on Alchemical Symbolism: the central claim that the Philosopher's Stone is not a physical substance but a symbol for the perfected human being", description: "Hall's most explicit statement of the human-as-prima-materia reading. The base material — the lead — is the unawakened, uninitiated human. The gold is the human whose faculties have been fully developed and harmonized." },
            passage: { reference: "Chapters on Symbolism + Alchemy: Hall's survey of how alchemical imagery encodes the stages of psychological and spiritual transformation", description: "Hall's full argument: the ancient schools deliberately obscured their teachings in symbol to protect them from the uninitiated, and the alchemical imagery specifically encodes a staged developmental process." },
            full: { reference: "Symbolism, Alchemy, and Freemasonry chapters", description: "Extends to the social and institutional dimension: how symbolic systems are preserved through fraternal organizations, and how initiation rituals use symbols as tools for staged revelation." }
          }
        },
        {
          title: "Initiation, Human and Solar",
          author: "Alice Bailey",
          section: "Chapters 1–3 and the account of the five initiations",
          selection_rationale: "Bailey is the clearest articulation in the library of the New Age crystalline human mythology — the specific version of the Great Work that contemporary technology discourse is drawing on, consciously or not, when it promises to refine the human.",
          tiers: {
            keystone: { reference: "Chapter 1: Bailey's account of the uninitiated human — dense, ego-bound, operating from lower vehicles of consciousness, subject to the pull of desire and the limitations of matter", description: "Bailey's most precise statement of what is impure in the New Age crystalline human mythology. The pre-initiate human is not merely ignorant — they are operating from a lower register of being." },
            passage: { reference: "Chapters 1–3: the five initiations as named thresholds; the progressive crystallization toward light, order, and expanded capacity", description: "The full stage map: each initiation marks a qualitative transition in the nature of the person undergoing it. This is the 'crystalline' quality in its original New Age form: perfect order, refined structure." },
            full: { reference: "Chapters 1–5: the initiatory process, the role of the Masters of Wisdom, the relationship between individual initiation and the planetary scheme", description: "Extends to Bailey's account of who performs the initiation — the Masters of Wisdom, a hierarchy of beings who are themselves further along the developmental arc." }
          }
        },
        {
          title: "Psychology and Alchemy",
          author: "Carl Jung",
          section: "Part II: The Work and the Prima Materia",
          selection_rationale: "Jung's reading creates an irreconcilable tension with both Hall and Bailey. Where Bailey's New Age crystalline human moves upward toward light, Jung's alchemical human moves downward toward confrontation with what has been disavowed.",
          tiers: {
            keystone: { reference: "Jung's identification of the prima materia with the shadow — the repressed, unacknowledged unconscious content that the psyche refuses to look at", description: "Jung's reading: the impurity is not ignorance or low vibration — it is specifically the content that has been judged impure and therefore hidden. The Great Work begins not with refining what is already acknowledged but with recovering what has been repressed." },
            passage: { reference: "Part II, opening chapters: the nature of the prima materia, why the alchemists said it was everywhere yet hard to find", description: "The full argument: the prima materia is not a rare substance requiring special procurement. It is the ordinary psychological material that has been classified as worthless — the shadow, the inferior function." },
            full: { reference: "Part II, chapters on the prima materia and the nigredo", description: "Extends through Jung's account of the nigredo — the first stage of the alchemical work, the blackening, the confrontation with the shadow. Applied to technology: what is the nigredo of AI development?" }
          }
        },
        {
          title: "The Hermetic Museum",
          author: "Various (17th century compilation)",
          section: "Selected treatises on the Prima Materia and its identification",
          selection_rationale: "The Hermetic Museum's account of the prima materia directly contradicts both Hall and Bailey. The original tradition says the prima materia is the thing everyone has overlooked — not the deficient human but the unnoticed substance.",
          tiers: {
            keystone: { reference: "The treatise's insistence that the prima materia is hidden in plain sight, despised and overlooked, found where no one thinks to look — cheap, common, available everywhere, but unrecognized because it appears worthless", description: "The original tradition's most counterintuitive claim: the Great Work does not begin with something elevated that must be perfected. It begins with something despised that must be recognized." },
            passage: { reference: "The Sophic Hydrolith and related treatises: the preparation of the prima materia and the opening stages of the work", description: "The full account of what must be done with the prima materia once identified: the solve et coagula, the dissolution and reconstitution." },
            full: { reference: "Multiple treatises on the prima materia identification and preparation", description: "Extends through the tradition's remarkable consensus: the prima materia is the thing people dismiss, throw away, or fail to see. Honest candidates for contemporary technology include: attention, loneliness, boredom, mortality, the need for meaning." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Name what your chosen technology thinks is impure — and run it through all four accounts of the prima materia.",
        instructions: [
          "Identify precisely what your chosen technology treats as its prima materia — the thing it is claiming to transform. Not 'human limitation' but which limitation. Not 'inefficiency' but whose inefficiency, in whose life, defined by whom.",
          "Apply Hall's reading: is the prima materia your technology identifies consistent with Hall's 'unawakened human'? What faculties does your technology claim are underdeveloped?",
          "Apply Bailey's reading: does your technology's account of the base human match Bailey's pre-initiated human — dense, ego-bound, operating from lower vehicles? Does the 'gold' your technology promises resemble Bailey's crystalline initiate?",
          "Apply Jung's reading: what has your technology's account of the prima materia excluded — what is it not acknowledging as base material, possibly because acknowledging it would be too uncomfortable?",
          "Apply the Hermetic Museum's reading: what is despised and overlooked that your technology is treating as raw material? Is it acknowledged as raw material — or presented as something else?",
          "Write 2–3 paragraphs on whether your technology has the right prima materia — and what it would have to change its account of to be working with a different one."
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"purification\" in the library.",
          instructions: [
            "Look at results from at least 6 different books. For each, identify what is being purified, what the purification removes, and what the purified thing is capable of that the base thing was not.",
            "Find the tradition that is most specific about what the purification costs — what is lost in the process of refinement, not just what is gained.",
            "Find the tradition that most explicitly names who performs the purification — and whether the subject of purification has any agency in the process or is passive to it."
          ],
          documentation: "One paragraph on the range of purification accounts — what is removed, what is lost, who performs it — and a precise statement of which account your technology's transformation promise most closely resembles."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"removing human bias\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Historical/Anthropological and Symbolic/Occult lens outputs. What prior traditions' frameworks do they identify operating in this phrase — and do they name 'bias' as a contemporary form of the prima materia?",
            "Read the Psychological lens output. Does it distinguish between bias as error (something that can be corrected) and bias as perspective (something constitutive of the human point of view that cannot be removed without removing the human)?",
            "Ask: does any lens output identify 'removing human bias' as itself a biased claim — a judgment about which human perspectives are deficiencies and which are acceptable?"
          ],
          documentation: "Two to three sentences on the most productive lens divergence — and one sentence on what naming 'removing human bias' as a purification claim does to how you hear that phrase in AI discourse."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"purification\" and separately for \"impurity\" or \"base matter.\"",
          instructions: [
            "Look at which traditions cluster around the purification node. Does it skew toward religious, alchemical, psychological, or a different cluster?",
            "Find texts that appear near both 'purification' and 'transformation' simultaneously. Are they primarily alchemical, or does the overlap appear in unexpected traditions?",
            "Look at the impurity cluster separately. Is the impurity cluster the same as or different from the purification cluster? What does the relationship between them suggest about whether purification addresses impurity or produces a new account of it?"
          ],
          documentation: "A structural observation on the relationship between the purification cluster and the impurity cluster — and what the structure suggests about whether purifying something eliminates the impurity or relocates it."
        }
      ],
      synthesis_prompt: {
        prompt: "What does your technology's account of the prima materia reveal about what it believes a human being is for?",
        expansion: [
          "Your four-lens analysis produced four different accounts of what is base in your technology's mythology. If these four accounts are pointing at genuinely different things, which is the most honest account of what your technology is actually working with?",
          "Jung's account introduces a question the other three do not: what has been declared impure because acknowledging it would be too difficult, not because it is actually base material? What is the shadow of your technology's Great Work?",
          "Your Deep Search found who performs the purification in various traditions — and whether the subject of purification has agency in the process. Where does your technology's user fall on that spectrum? Are they the alchemist, the prima materia, or both?",
          "The Hermetic Museum says the prima materia is everywhere, despised, overlooked — found where no one thinks to look. What is the thing your technology is treating as raw material that it is not acknowledging as raw material? What would it mean to name that thing honestly?"
        ]
      },
      micro_artifact: {
        name: "Prima Materia Map",
        description: "A structured one-page analysis organized as four rows — Hall's, Bailey's, Jung's, and the Hermetic Museum's account of the prima materia — each applied to your chosen technology, with a brief paragraph per row identifying what your technology treats as base material under each framework.",
        purpose: "Forces the politically uncomfortable question: who decided what is base? The Prima Materia Map does not resolve the question — it makes the range of possible answers visible and requires the student to take a position on which is most honest about their technology.",
        capstone_connection: "Becomes the 'Great Work I — Prima Materia' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 4 ──────────────────────────────────────────────────────────────
    {
      week_number: 4,
      title: "The Great Work II: Where Are We?",
      core_question: "The alchemical Great Work has named stages: nigredo, albedo, citrinitas, rubedo. Where is your technology in the work — and who told you?",
      key_tension: "Stage as genuine developmental marker vs. Stage as rhetorical move — The alchemical stage structure is a map of real progression through a real process. It is also, in contemporary use, a tool for claiming to be further along than you are.",
      lens_focus: ["symbolic_occult", "psychological", "philosophical"],
      readings: [
        {
          title: "The Hermetic Museum",
          author: "Various (17th century compilation)",
          section: "Selected treatises on the stages of the Work",
          selection_rationale: "The Hermetic Museum establishes the stage structure in its original form and establishes the tradition's most important caution. The warning against premature stage claims is the anchor text against which all other readings this week are measured.",
          tiers: {
            keystone: { reference: "The description of the nigredo — the blackening, the death of the starting material, the stage that must not be rushed and cannot be skipped", description: "The Hermetic texts are unanimous: the alchemist who claims to have passed the nigredo when the blackening has not been completed is not further along in the Work — they have abandoned it." },
            passage: { reference: "Treatises describing the sequence from nigredo through albedo to citrinitas and rubedo", description: "The full stage map in its original form: nigredo (dissolution, confrontation), albedo (washing, purification, first clarity), citrinitas (dawn of new capacity), rubedo (completed work, coniunctio)." },
            full: { reference: "Multiple treatises on the stage structure, including accounts of failed Works and premature claims", description: "The tradition's remarkable consensus: you cannot skip a stage, you cannot declare a stage complete before its markers appear, and premature claim of stage completion is the specific failure mode of the Great Work." }
          }
        },
        {
          title: "Psychology and Alchemy",
          author: "Carl Jung",
          section: "Part III: The Stages as Psychological Map",
          selection_rationale: "Jung provides the week's most practically useful framework: the question of how to distinguish genuine stage completion from its performance. His clinical precision — from watching patients either genuinely complete psychological stages or convince themselves they had — is exactly what the week needs.",
          tiers: {
            keystone: { reference: "Jung's identification of the nigredo with the confrontation of the shadow — the psychological material that must be faced before any genuine development is possible", description: "Jung translates the alchemical stages into a psychological map that can be applied to any developmental process. The specific quality of genuine nigredo confrontation versus the performance of having confronted it is something Jung describes with clinical precision." },
            passage: { reference: "Part III, chapters on the stages as psychological sequence", description: "The full translation: nigredo as shadow confrontation, albedo as initial integration, citrinitas as emerging capacity, rubedo as coniunctio — the union of opposites that preserves both." },
            full: { reference: "Part III complete", description: "Extends through Jung's case material: patients whose alchemical imagery tracked their psychological development, and the specific ways the imagery changed as genuine stage transitions occurred versus when stage claims were made prematurely." }
          }
        },
        {
          title: "Initiation, Human and Solar",
          author: "Alice Bailey",
          section: "Chapters on the Five Initiations and the tests of readiness",
          selection_rationale: "Bailey raises the week's most uncomfortable political question from within the initiatory framework: the assessment of stage position is not self-authorizing. Who has the right to say where AI development is in its own Great Work?",
          tiers: {
            keystone: { reference: "Bailey's account of what marks genuine readiness for initiation — and the specific tests that precede each threshold", description: "Bailey makes explicit what the alchemical tradition leaves implicit: the assessment of stage readiness is not self-administered. The authority to assess stage position is external to the person being assessed." },
            passage: { reference: "Chapters on the first three initiations: the specific changes in consciousness, capacity, and relationship to matter that mark genuine stage completion", description: "The full account of what each initiation actually transforms — not what the candidate experiences during the ceremony, but what is different afterward. Stage markers are specific and verifiable." },
            full: { reference: "The full initiatory sequence through the fifth initiation", description: "Extends through Bailey's account of what a fully initiated being is — and what authority they carry. Applied to AI: who is the equivalent of Bailey's Masters, and what qualification gives them authority to assess where the work is?" }
          }
        },
        {
          title: "Thus Spoke Zarathustra",
          author: "Friedrich Nietzsche",
          section: "'On the Three Metamorphoses' and 'On the Spirit of Gravity'",
          selection_rationale: "Nietzsche is the week's most pointed foil for the alchemical tradition. His metamorphoses are a map of the relationship between the developing entity and the values it has inherited, destroyed, and potentially created.",
          tiers: {
            keystone: { reference: "'On the Three Metamorphoses': the camel (bearing the weight of established values), the lion (destroying those values), and the child (creating new values from genuine freedom) — and the specific failure mode of each stage", description: "Nietzsche's three metamorphoses are a parallel developmental map to the alchemical stages. Is contemporary AI development in the camel stage (bearing existing human values), the lion stage (attempting to destroy them), or claiming to be in the child stage (creating genuinely new values)?" },
            passage: { reference: "'On the Three Metamorphoses' complete + 'On the Spirit of Gravity': the weight that prevents genuine transformation", description: "The spirit of gravity is the accumulated weight of inherited values that the developing entity has not yet confronted. The lion that believes it has destroyed the old values when it has merely rearranged them is not in the lion stage; it is a camel that has learned to roar." },
            full: { reference: "'On the Three Metamorphoses' + 'On the Spirit of Gravity' + 'On Great Events'", description: "Extends through Nietzsche's account of what genuine transformation looks like versus the noise of claimed transformation. 'On Great Events' is particularly relevant: great events arrive quietly, not with the fanfare of their announcement." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Place your chosen technology on the alchemical stage map — and defend the placement.",
        instructions: [
          "Review the four stages: nigredo (blackening — dissolution, confrontation with what is broken), albedo (whitening — washing, purification, first clarity), citrinitas (yellowing — dawn of new capacity), rubedo (reddening — completion, the philosopher's stone realized).",
          "Place your chosen technology at one of these four stages. Be specific about your evidence: what behaviors, products, public statements, or design choices support your placement?",
          "Apply Jung's caution: what would it look like if your technology were performing its current stage rather than actually being in it? What would performed nigredo look like, as distinct from genuine nigredo?",
          "Apply Bailey's test: who is making the stage assessment — the technology itself, its developers, its users, external critics? What authority and interest does each assessor have?",
          "Apply Nietzsche's metamorphosis test: is your technology in the camel stage, the lion stage, or claiming to be in the child stage? Does the Nietzsche placement match the alchemical placement?",
          "Write 2–3 paragraphs on where your technology actually is — and what it would have to acknowledge to be honest about it."
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"stages\" or \"initiation\" in the library.",
          instructions: [
            "Look at results from at least 6 different books. For each, identify: how many stages are named, what marks the transition between stages, and whether the transition is voluntary, automatic, or externally assessed.",
            "Find the tradition that is most specific about what cannot be faked — about what marks of genuine stage completion cannot be performed or simulated.",
            "Find the tradition most explicit about what happens when someone claims a stage they have not completed — what the consequences are, and who enforces the assessment."
          ],
          documentation: "One paragraph on the range of stage structures across traditions — and a precise statement of what the most rigorous account says about the difference between genuine stage completion and its performance."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"we are at an early stage of AI development\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Historical/Anthropological and Symbolic/Occult lens outputs. What stage frameworks do they identify operating in this claim — and does either lens identify the claim as a stage assessment that carries implicit claims about where the work is going?",
            "Read the Philosophical lens output. Does it identify the epistemological problem in the claim — how the person making it knows which stage they are at, and what 'early' implies about the arc of the work?",
            "Ask: which lens most directly raises the question of who benefits from assessing the current moment as 'early' — and what that assessment implies about the authority to continue the work without external constraint?"
          ],
          documentation: "Two to three sentences on the most productive lens divergence — and one sentence on what claiming to be 'at an early stage' does for the entity making that claim, specifically in terms of the permission it grants itself."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"initiation\" and separately for \"completion\" or \"fulfillment.\"",
          instructions: [
            "Look at the initiation cluster and the completion cluster separately. Which traditions are most central to each? Are they the same traditions, or different ones?",
            "Find texts that appear near both 'initiation' and 'failure' or 'incomplete' — texts that address what happens when initiation is not completed, or is falsely claimed.",
            "Look at the spatial relationship between the initiation cluster and the completion cluster. Are they close together, far apart, or structured in a more complex way?"
          ],
          documentation: "A structural observation on which traditions own the initiation node versus the completion node, which texts address failed or false stage claims, and what the spatial relationship between initiation and completion suggests about how transformation actually ends."
        }
      ],
      synthesis_prompt: {
        prompt: "Your technology has told you where it is in the Great Work. What would it look like if it were wrong — and how would you know?",
        expansion: [
          "Your stage placement produced specific evidence for where your technology actually is in the alchemical arc. Apply Jung's caution directly: what are the specific behaviors or statements that could be either genuine nigredo (actual confrontation of what is broken) or performed nigredo (acknowledgment of brokenness that functions to allow the work to continue without addressing it)?",
          "Bailey's initiatory map requires that stage assessment be performed by someone who has already completed the process. What is the equivalent authority structure in your technology's domain? Who, if anyone, has completed the developmental arc that your technology is attempting?",
          "Nietzsche's lion believes it has destroyed the old values when it has often only rearranged them under a different interface. Does your technology's disruption look, on close examination, more like genuine destruction or rearrangement?",
          "The Hermetic Museum insists: the alchemist who skips the nigredo has not accelerated the Work — they have abandoned it. If your technology has not yet fully undergone its own nigredo, what is the name of the thing it has abandoned?"
        ]
      },
      micro_artifact: {
        name: "Stage Assessment",
        description: "A structured one-page document organized in three sections: (1) your placement of your chosen technology on the alchemical stage map with specific evidence; (2) the performance test — what the current stage would look like if it were being performed rather than genuinely inhabited; (3) the authorization question — who is making the stage assessment, what authority they have, and what interest they have in the assessment coming out as it does.",
        purpose: "The Stage Assessment is the week's most demanding artifact because it requires the student to take a position, defend it with evidence, and then test whether the position could itself be a performance of the stage it is claiming to describe.",
        capstone_connection: "Becomes the 'Great Work II — Stage Position' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 5 ──────────────────────────────────────────────────────────────
    {
      week_number: 5,
      title: "The Sacred Scroll",
      core_question: "Is scrolling through a social feed a ritual — and does the answer matter?",
      key_tension: "Sacred ritual vs. Secular repetition — A ritual is a structured, repetitive practice that creates and maintains the community's relationship to the sacred. A habit is a repetitive behavior reinforced by reward. Both look identical from the outside.",
      lens_focus: ["historical_anthropological", "religious_spiritual", "psychological"],
      readings: [
        {
          title: "The Elementary Forms of Religious Life",
          author: "Émile Durkheim",
          text_id: "T071",
          section: "Book III (The Positive Cult): Chapters 1–3",
          selection_rationale: "Durkheim's account of collective effervescence precisely describes what happens on social media platforms during major cultural events. The mechanism is not new, not accidental, and not separable from the social function it serves.",
          tiers: {
            keystone: { reference: "Book III, Chapter 1: 'collective effervescence' — the heightened emotional states produced by communal ritual gathering", description: "Durkheim's closest approach to the experience that mystics call union and that social media designers call 'engagement.' When millions of people direct attention to the same object simultaneously, something happens to each individual's sense of self and scale." },
            passage: { reference: "Book III, Chapters 1–2: the positive cult, sacrifice, and the mechanism of collective effervescence", description: "Durkheim's full account of how ritual produces collective effervescence — and how that effervescence renews the group's moral energy, reinforces the sacred/profane distinction, and maintains the totem's power." },
            full: { reference: "Book III, Chapters 1–3", description: "Extends through the negative cult (interdictions that define the sacred space) and the piacular rites (collective expressions of mourning that renew communal bonds). What are the negative cult practices of social media — what triggers collective outrage?" }
          }
        },
        {
          title: "The Golden Bough",
          author: "James George Frazer",
          text_id: "T007",
          section: "Chapter 3: Sympathetic Magic",
          selection_rationale: "Frazer's account of sympathetic magic is structurally identical to the logic of algorithmic design — the assumption that shaping what you are shown shapes what you think, feel, and want. This is the law of contagion implemented in code.",
          tiers: {
            keystone: { reference: "Chapter 3, §1: the law of similarity — 'like produces like'; the magic ritual works because acting on the representation affects the thing represented", description: "Applied to the like button, the share, the retweet: when you perform an action on a digital representation of a person, event, or idea, does that action have consequences for the thing represented?" },
            passage: { reference: "Chapter 3, §§1–4: the law of similarity + the law of contagion", description: "The law of contagion — things that have been in contact continue to affect each other after separation — is precisely the logic of algorithmic recommendation: the content you touched yesterday shapes what you are shown today." },
            full: { reference: "Chapter 3 complete", description: "The full account of magical practice as a pre-scientific attempt to control the world by acting on representations. Digital platforms are designed on the assumption that shaping your digital representation produces effects on the actual person." }
          }
        },
        {
          title: "The Bhagavad Gita",
          author: "Vyasa",
          section: "Chapters 3 and 18 (on Karma Yoga and Renunciation)",
          selection_rationale: "The Gita introduces the week's most productive tension: the distinction between action performed in attachment and action performed in release — based not on what the action is but on the quality of attention. Can a platform designed for engagement support unattached action at all?",
          tiers: {
            keystone: { reference: "Chapter 3:8–9 — 'Do thine allotted task. Action is better than inaction… The world is bound by action unless the action is performed as sacrifice'", description: "The Gita's claim: action performed without attachment to results is fundamentally different in character and consequence from action performed in pursuit of a desired outcome." },
            passage: { reference: "Chapter 3 complete + Chapter 18:41–50", description: "The full account of karma yoga: action without attachment, duty without ego-investment in outcome. Chapter 18 adds the question of what form of action is appropriate to one's nature." },
            full: { reference: "Chapters 3, 12, and 18", description: "Adds Chapter 12 (devotional yoga). Whether technology use can be devotional — not worshipping technology, but performing the action for something beyond oneself — is the most demanding form of the week's core question." }
          }
        },
        {
          title: "Popol Vuh",
          author: "K'iche' Maya",
          section: "Part III (the Hero Twins' Descent into Xibalba)",
          selection_rationale: "The Popol Vuh introduces a non-Western account of what ritual ordeal is for. The Xibalba sequence emphasizes successful navigation of a deliberately deceptive environment through collective wit — a structurally precise description of what sophisticated technology use requires.",
          tiers: {
            keystone: { reference: "The Hero Twins summoned to Xibalba — they must survive a succession of Houses (Dark House, Rattling House, Cold House, Fire House, Bat House) through wit and endurance", description: "The mythological structure of the ritual ordeal: a world designed to destroy the hero, organized as a series of challenges that must be navigated without adequate information about the rules. The app is Xibalba. The UX is the Houses." },
            passage: { reference: "Part III: the descent, the trials, and the Twins' partial failure (Hunahpu loses his head to the bat)", description: "The Twins do not succeed through pure heroism — they lose, adapt, improvise, and survive through cunning. The ritual ordeal tests whether the hero can maintain orientation in an environment designed to disorient." },
            full: { reference: "Parts III–IV (the full Xibalba sequence and the Twins' transformation into the sun and moon)", description: "The full arc: ordeal, partial defeat, resurrection, transformation into forces that organize collective time. The user is not being saved by the technology; the user is being tested by it." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Document one week of your own digital ritual behavior.",
        instructions: [
          "Over seven days, keep a brief daily log of your technology use — specifically the repetitive, patterned behaviors (when you check what, for how long, in what sequence, in what emotional state before and after).",
          "At the end of the week, apply Durkheim's sacred/profane binary: which technologies, times of day, and types of content function as sacred, and which as profane (ordinary, functional, disposable)?",
          "Apply Frazer's sympathetic magic laws: identify one behavior from your log that operates on the law of similarity and one that operates on the law of contagion. Are those behaviors conscious or habitual?",
          "Apply the Gita's attached/unattached distinction: for each significant technology behavior, classify it as (a) action in attachment or (b) action in release. How many of your technology behaviors are genuinely (b)?",
          "Write a one-paragraph assessment: is your technology behavior best described as ritual (Durkheim), magic (Frazer), karma yoga (Gita), or Xibalba navigation (Popol Vuh)?"
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"ritual\" in the library.",
          instructions: [
            "Look at results from at least 6 different books. For each, identify whether the ritual described is primarily (a) communal, (b) individual, or (c) relational.",
            "Find the result that most precisely describes a ritual that is daily, repetitive, and embedded in ordinary life rather than special occasions. What tradition does it come from — and what does that tradition say the daily ritual is for?",
            "Note whether any tradition distinguishes between genuine ritual (which produces a real relationship to the sacred) and empty ritual (which performs the form without the substance). What distinguishes them?"
          ],
          documentation: "One paragraph on the range of ritual structures across traditions — and a precise statement of what distinguishes genuine ritual from empty repetition in at least two of the traditions found."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"infinite scroll\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Historical/Anthropological and Religious/Spiritual lens outputs. What do they identify as the structural parallel to this design pattern in historical or religious practice?",
            "Read the Psychological lens output. Does it identify the specific psychological mechanism that makes infinite scroll effective — and does it name that mechanism in the vocabulary of any of this week's readings?",
            "Ask: which lens is most surprised by the input — which generates an analysis of infinite scroll that you would not have predicted?"
          ],
          documentation: "Two to three sentences on the most surprising lens output — what it identified in the infinite scroll that the other lenses did not, and what that identification reveals about which framework is most useful for analyzing this particular design feature."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"ritual\" (or \"ceremony\" if more productive).",
          instructions: [
            "Look at the full ritual cluster. Which traditions contribute most — and does any tradition appear at the center rather than the periphery?",
            "Look at texts adjacent to the ritual cluster that are not primarily religious. What are they? What does their adjacency suggest about where ritual structure persists in traditions that don't identify themselves as ritual-based?",
            "Find the connection between the ritual cluster and any text concerned with time, repetition, or cyclical structure. What does that connection suggest about why daily technology use might function ritually regardless of the user's intention?"
          ],
          documentation: "A short structural observation on which tradition dominates the ritual cluster, which adjacent non-religious texts appear, and what the connection to time/repetition suggests about the relationship between ritual and the organization of daily life."
        }
      ],
      synthesis_prompt: {
        prompt: "What does your technology use do to your sense of time — and is that what ritual is for?",
        expansion: [
          "Your behavior log identified your digital ritual patterns. When you read that log through Durkheim's framework, does the sacred/profane distribution match what you would say your values are?",
          "Frazer's laws of sympathetic magic describe behavior you may be performing unconsciously. What changes when unconscious magical behavior is made visible? Does the Gita's standard (action without attachment) become more or less achievable once the magical structure of the behavior is named?",
          "The Popol Vuh's Xibalba is a world designed to consume the hero who enters without preparation. What kind of navigation are you doing — and what would it mean to navigate with the Twins' combination of collective wit, adaptation, and willingness to lose partially without losing entirely?",
          "Your Deep Search found what distinguishes genuine ritual from empty repetition in at least two traditions. Apply that distinction to your own behavior log. How much of your digital ritual is genuine and how much is empty?"
        ]
      },
      micro_artifact: {
        name: "Ritual Log",
        description: "Your seven-day behavior log with annotations — each significant technology behavior classified by ritual type (Durkheim: sacred/profane), magical law (Frazer: similarity/contagion), and Gita attachment status (attached/released). Includes a one-paragraph assessment of which framework best describes your technology use overall.",
        purpose: "Produces the course's only behavioral data — actual documented evidence of how mythological structures manifest in lived technology behavior. This is the week where the analytical frameworks become personal rather than theoretical.",
        capstone_connection: "Becomes the 'Ritual Structure' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 6 ──────────────────────────────────────────────────────────────
    {
      week_number: 6,
      title: "Escaping the Body",
      core_question: "What is transhumanism afraid of — and what does that fear reveal about the myth it inhabits?",
      key_tension: "Finitude as obstacle vs. Finitude as constitutive — Every major tradition in the library treats death, limitation, and embodiment as conditions of meaning, not as technical problems to be solved. Transhumanism treats them as engineering failures.",
      lens_focus: ["philosophical", "religious_spiritual", "psychological"],
      readings: [
        {
          title: "The Tibetan Book of the Dead",
          author: "Padmasambhava",
          text_id: "T067",
          section: "The Bardo of Dying and the Bardo of Dharmata",
          selection_rationale: "The Tibetan Book of the Dead is the most direct challenge to the transhumanist project available in the library — not because it argues against it, but because it offers a completely different account of what death is.",
          tiers: {
            keystone: { reference: "The instructions to the dying: 'O nobly born, now the clear light of reality itself dawns upon you. Recognize it. Your awareness, empty and naked, is itself the clear light — the Dharmakaya.'", description: "The Tibetan tradition's most precise statement of what death reveals: the thing that was always already present but unrecognized during life. The transhumanist project is, structurally, the opposite: maintain the obscuring apparatus forever." },
            passage: { reference: "The Bardo of Dying + The Bardo of Dharmata", description: "The full two-stage teaching: what the mind encounters as the body fails, and what becomes available at that encounter." },
            full: { reference: "Bardo of Dying + Bardo of Dharmata + introductory sections on the three bardos", description: "Extends through Padmasambhava's full framework — the three bardos as a map of consciousness across the threshold. By the full text, the student has the Tibetan tradition's most sophisticated account of what finitude is actually for." }
          }
        },
        {
          title: "Zhuangzi",
          author: "Zhuangzi",
          text_id: "T127",
          section: "Additional Chapters, Chapters 17–19",
          selection_rationale: "Zhuangzi offers a more radical position than the Tibetan Book of the Dead: not a map for navigating death, but the argument that the very anxiety about death — the treating of it as a problem — is the misunderstanding.",
          tiers: {
            keystone: { reference: "Chapter 18: Zhuangzi's wife has died; he is found singing; he explains to Huizi that before she was born there was no life, before life no form, before form no vital breath — she has simply transformed again into the undifferentiated source", description: "Zhuangzi's most intimate passage: not an argument about death but a demonstration of a relationship to death that does not require its elimination. Is this wisdom or denial? That is the week's sharpest question." },
            passage: { reference: "Chapter 17 (the river god and the northern sea) + Chapter 18 ('Perfect Happiness')", description: "Two accounts of the same recognition: the river god's experience of the ocean's vastness, and Zhuangzi's experience of his wife's death. Both describe what it is like to recognize that the boundary the self takes as fundamental is not fundamental at all." },
            full: { reference: "Chapters 17, 18, and 19 ('Mastering Life')", description: "Adds the 'drunken driver' passage: the person who is drunk when a cart overturns is unhurt because their spirit is whole and they did not contract themselves before impact." }
          }
        },
        {
          title: "The World as Will and Representation",
          author: "Arthur Schopenhauer",
          section: "Book IV (§§54–71): On the Denial of the Will",
          selection_rationale: "Schopenhauer provides the bridge between the Eastern traditions and the week's central question about transhumanism. He makes the Eastern critique of the striving self available in Western philosophical vocabulary.",
          tiers: {
            keystone: { reference: "§§58–59: the will's blind striving, recognized from outside, produces not progress but the desire to stop the wheel", description: "Schopenhauer's counter-narrative to transhumanism: the correct response to recognizing what drives the striving for longer life is not to satisfy the striving but to see through it. The transhumanist project is, in Schopenhauer's terms, the will intensifying its commitment to itself in the name of liberation from suffering." },
            passage: { reference: "§§54–59: the recognition that existence is suffering, boredom as the complement to suffering, and the first account of will-denial", description: "The full argument: if the will drives everything, including the drive to eliminate death, then that drive is not liberation from the will but the will's deepest commitment to its own continuation." },
            full: { reference: "§§54–71", description: "Extends through Schopenhauer's accounts of artistic contemplation (temporary will-suspension), sainthood and asceticism (permanent will-denial), and their relationship to what Eastern traditions call liberation." }
          }
        },
        {
          title: "Genesis",
          author: "Hebrew Bible",
          section: "Chapters 2–3",
          selection_rationale: "Genesis presents the transhumanist project's most uncomfortable structural parallel: the attempt to overcome death through knowledge is the precise act the myth identifies as the cause of death.",
          tiers: {
            keystone: { reference: "Chapter 3:19 — 'By the sweat of your face you shall eat bread, until you return to the ground, for out of it you were taken; for you are dust, and to dust you shall return'", description: "The Western mythological origin of the identification of death with punishment. The transhumanist project — eliminate death through technical knowledge — is, by the internal logic of this myth, precisely the act that caused death in the first place, now performed again at scale." },
            passage: { reference: "Chapters 2–3 complete: the garden, the serpent, the knowledge of good and evil, the expulsion", description: "The full mythological architecture: a world designed for human habitation, the prohibition that defines the sacred/profane boundary, the transgression that produces mortality, and the expulsion into a world where death and pain are constitutive." },
            full: { reference: "Chapters 1–4", description: "Extends through Cain and Abel — the first death produced by human action. The full Genesis narrative is the founding document of the Western relationship to finitude." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Write an honest account of your own relationship to your own mortality — then examine that account as a document of the mythology you inhabit.",
        instructions: [
          "Write 2–3 paragraphs describing your actual, present relationship to the fact that you will die. Do not be more at peace with it than you are, or more anxious. Be as precise as possible about what you feel, what you avoid, and what you do not let yourself think about.",
          "Examine that account: which myth is it evidence of? Genesis (death as punishment), the Tibetan (death as the moment of recognition you have been preparing for), the Zhuangzian (death as natural transformation the self's contraction distorts), or the Schopenhauerian (death as the will's encounter with its own futility)?",
          "Ask: what relationship to finitude would your chosen technology need you to have in order to be maximally useful to its commercial interests? And what relationship would it need you to have to be genuinely good for you?",
          "If those two relationships are different: is that difference a form of the Genesis loop — the technology giving you knowledge that costs you something you had not consented to lose?"
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"death\" in the library.",
          instructions: [
            "Look at results from at least 7 different books. For each, classify the tradition's primary relationship to death as: (a) an enemy to be overcome, (b) a teacher to be prepared for, (c) a transformation to be recognized, or (d) a punishment whose cause must be addressed.",
            "Find the tradition most at peace with finitude — not through resignation but through a positive account of what finitude enables that immortality would foreclose.",
            "Note whether any result treats death as simply neutral — neither enemy nor teacher, just a biological event. If so, what framework produces that neutrality?"
          ],
          documentation: "One paragraph on the distribution of relationships to death across traditions — and a one-sentence description of the relationship to death that the transhumanist project implies."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"living forever\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Religious/Spiritual and Philosophical lens outputs. What different kinds of 'living forever' do they identify — are they the same concept, or multiple incompatible versions?",
            "Read the Psychological lens output. Does it identify the desire to live forever as a specific psychological structure — and if so, what does it say is the actual content of that desire?",
            "Ask which lens output is most surprising — which finds something in 'living forever' that you would not have expected that lens to find."
          ],
          documentation: "Two to three sentences on the most productive divergence between the Religious/Spiritual and Psychological lens outputs — and one sentence on whether the Lens Engine seems more comfortable with immortality as a religious concept or as a technological project."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"death\" and separately for \"immortality.\"",
          instructions: [
            "Look at the death cluster and the immortality cluster separately. Are they close together or far apart? What does their spatial relationship suggest?",
            "Find texts that appear in or near both clusters. What traditions do those texts come from?",
            "Look at which texts in the library are farthest from both clusters simultaneously. What traditions are they from — and does their distance suggest genuine indifference, or a different vocabulary for the same concern?"
          ],
          documentation: "A structural observation on the spatial relationship between the death and immortality clusters — whether they are opposed, adjacent, overlapping, or structured in a way that challenges the assumption that death and immortality are opposites."
        }
      ],
      synthesis_prompt: {
        prompt: "What would your chosen technology have to give up to take finitude seriously — and what does the answer reveal about the mythology it is committed to?",
        expansion: [
          "Your honest account of your own mortality is evidence of the mythology you inhabit. Does that evidence match the mythology you would choose if you could choose? And if there's a gap: is it the mythology that is wrong, or the account of yourself that is not yet honest?",
          "The Tibetan Book of the Dead, Zhuangzi, Schopenhauer, and Genesis each offer a different account of what finitude is for. If your technology were designed by practitioners of one of these traditions — with their account of finitude as the foundational assumption — what would it do differently?",
          "Your Deep Search found the tradition most at peace with finitude. If that tradition's account is taken seriously — not as consolation but as a description of what finitude enables that immortality forecloses — what does contemporary technology's promise of frictionless, always-on experience actually cost?",
          "Genesis presents the transhumanist project as the knowledge-transgression loop in its second iteration. If that structural observation is correct — not as theology but as mythological description — what does it predict about the result? And is there evidence from your chosen technology's history that the prediction is being borne out?"
        ]
      },
      micro_artifact: {
        name: "Finitude Inventory",
        description: "Your honest account of your own mortality (2–3 paragraphs), annotated with the mythological grammar it most closely resembles (Genesis, Tibetan, Zhuangzian, or Schopenhauerian). Plus a one-paragraph analysis of what your chosen technology's relationship to finitude implies — what it requires users to believe about death in order to engage with it as designed.",
        purpose: "The Finitude Inventory is the course's most personal artifact — the point where the analytical framework becomes a mirror.",
        capstone_connection: "Becomes the 'Finitude Account' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 7 ──────────────────────────────────────────────────────────────
    {
      week_number: 7,
      title: "Disenchantment and Its Reversals",
      core_question: "Did modernity strip the world of meaning — or did it replace one enchantment with another, without acknowledging the replacement?",
      key_tension: "Disenchantment as liberation vs. Re-enchantment as disguised magic — The standard story: science disenchanted the world. The alternative story: the world was never actually disenchanted; it was re-enchanted with scientific and technological mythology that functions exactly like its predecessor, only without the self-awareness.",
      lens_focus: ["historical_anthropological", "philosophical", "symbolic_occult"],
      readings: [
        {
          title: "Corpus Hermeticum",
          author: "Hermes Trismegistus",
          section: "Treatises I (Poimandres) and III (The Sacred Discourse)",
          selection_rationale: "The Corpus Hermeticum is the West's most complete pre-modern account of the enchanted cosmos. Reading it alongside Nietzsche's diagnosis of the disenchantment event allows the student to ask: what exactly was lost when the Hermetic cosmos was replaced by the Cartesian?",
          tiers: {
            keystone: { reference: "Poimandres §§1–6: the opening vision — the light that is mind, the descent of the divine light into matter: 'I am Poimandres, the Mind of Absolute Power'", description: "The Hermetic cosmos is saturated with meaning: matter is the vehicle of divine light, not its absence. The Hermetic tradition is the precise opposite of the disenchanted worldview." },
            passage: { reference: "Poimandres (Treatise I) complete", description: "The creation narrative: light as divine mind, the descent of mind into matter, the formation of human consciousness as the intersection of divine and material, and the path of return upward through the spheres." },
            full: { reference: "Treatises I and III", description: "Adds Treatise III, the Sacred Discourse: knowledge of the divine is available through the created world — not despite its materiality but through it. The Hermetic 'as above, so below' is an epistemological claim." }
          }
        },
        {
          title: "Thus Spoke Zarathustra",
          author: "Friedrich Nietzsche",
          section: "'On the Despisers of the Body' and 'On Voluntary Death'",
          selection_rationale: "Nietzsche's re-enchantment proposal sits between the Hermetic tradition (re-enchant through cosmic connection) and the transhumanist tradition (re-enchant through technical transcendence). He agrees with the transhumanists that the old enchantment is dead; he disagrees that the correct response is to transcend the body.",
          tiers: {
            keystone: { reference: "'On the Despisers of the Body': 'Behind your thoughts and feelings, my brother, there stands a mighty ruler, an unknown sage — whose name is self. In your body he dwells; he is your body.'", description: "Nietzsche's re-enchantment proposal: not the Hermetic cosmos (meaning is in the structure of the universe) but the living body (meaning is in the intelligence of the organism)." },
            passage: { reference: "'On the Despisers of the Body' + 'On Voluntary Death'", description: "Nietzsche's two accounts of right relationship to embodiment: honoring the body's intelligence rather than transcending it, and dying at the right time rather than clinging to life past its meaning." },
            full: { reference: "'On the Despisers of the Body,' 'On Voluntary Death,' 'On the Bestowing Virtue,' 'On the Thousand and One Goals'", description: "Extends through Nietzsche's account of valuation — how values are created, how they die, and what happens in the vacuum between a dead value system and a new one." }
          }
        },
        {
          title: "The Dhammapada",
          author: "Various (Buddhist canon)",
          section: "Chapters 1–5 and 20 (The Path)",
          selection_rationale: "The Dhammapada introduces a position that is neither enchantment nor disenchantment: the world as experienced is always already a construction of the mind that produces it. The question of enchantment is secondary to what kind of mind is making the world it then encounters.",
          tiers: {
            keystone: { reference: "Chapter 1, verses 1–2: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made of our thoughts.'", description: "An epistemological claim: the world as experienced is a product of the mind that experiences it. Applied to technology: the world a technology makes available is a product of the minds that designed it — and the minds that use it are reshaped by the available world." },
            passage: { reference: "Chapters 1–5 (Twin Verses, Heedfulness, Mind, Flowers, Fools)", description: "The opening movement: mind as creator of the experienced world, heedfulness as the practice that interrupts automatic reactivity, the trained mind as the condition for seeing clearly." },
            full: { reference: "Chapters 1–10 + Chapter 20 (The Path)", description: "Extends through the full arc from automatic reactivity through the disciplines of attention to the state beyond all constructed worlds, including the technologically constructed one." }
          }
        },
        {
          title: "The Golden Bough",
          author: "James George Frazer",
          text_id: "T007",
          section: "Chapters on Balder the Beautiful and the Sacred Fire",
          selection_rationale: "Frazer's sacred fire chapters present the pre-modern enchanted technology in its most concrete form. Is contemporary technology the disenchanted successor of the sacred fire, or the sacred fire operating under a different name?",
          tiers: {
            keystone: { reference: "The Beltane fires: fires kindled at specific times by specific ritual means, believed to protect the community, ensure the land's fertility, and maintain the sacred connection between the human community and the powers governing its survival", description: "Frazer's account of fire as the technology of enchantment — the managed, ritual fire as the interface between the human community and the sacred order it depends on. What contemporary technology performs the same function?" },
            passage: { reference: "The Beltane fire chapters + Frazer's comparative analysis of fire-kindling rituals", description: "Fire produced by ritual friction; fire treated as sacred substance; the community's relationship to its sacred fire as a model for the community's relationship to the cosmic order." },
            full: { reference: "The full 'Balder the Beautiful' section", description: "Extends through the Norse mythological backdrop — Balder's vulnerability, Loki's deception, the mistletoe, the necessity of death — against which the fire rituals are practiced. Technology (fire management) and myth (Balder's story) are inseparable." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Identify a moment when your chosen technology felt enchanted — and a moment when it felt disenchanted.",
        instructions: [
          "Describe the enchanted moment: a time when using your chosen technology produced a sense of connection, meaning, wonder, or aliveness that felt larger than merely instrumental. Be specific.",
          "Describe the disenchanted moment: a time when using the same technology produced a sense of mechanical repetition, meaninglessness, or hollowness. Be specific.",
          "Apply the Hermetic lens: in the enchanted moment, was the technology functioning as a vehicle of 'as above, so below' — making visible a connection between your individual experience and something larger?",
          "Apply the Dhammapada lens: in the disenchanted moment, what kind of mind was encountering the technology — heedful or heedless, trained or automatic? Does the disenchantment describe the technology or the mind that met it?",
          "Apply Frazer's sacred fire lens: what ritual conditions surround your enchanted moment? What conditions surround the disenchanted moment? Is the difference about the technology or about the ritual context of use?"
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"enchantment\" (or \"magic\" if more productive) in the library.",
          instructions: [
            "Look at results from at least 5 different books. For each, identify whether the enchantment described is: (a) a property of the world, (b) a property of consciousness, or (c) a property of practice.",
            "Find the tradition most explicit about how enchantment is lost — what causes a world to go from enchanted to disenchanted.",
            "Find the tradition that offers the most specific account of how enchantment can be recovered — and what the conditions of recovery are."
          ],
          documentation: "One paragraph on the three types of enchantment (world-property, consciousness-property, practice-property) — and a precise statement of which type contemporary technology's re-enchantment promises belong to."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"the internet as a living thing\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Symbolic/Occult and Historical/Anthropological lens outputs. What mythological or animistic frameworks do they identify in this phrase — and how seriously do they take the claim?",
            "Read the Scientific lens output. Does it treat the phrase as metaphorical or as pointing at something real?",
            "Ask: if the Hermetic tradition's claim — that the universe is a living mind — were applied to the internet, what would follow? Is that application absurd, illuminating, or dangerous?"
          ],
          documentation: "Two to three sentences on the most productive tension between the Symbolic/Occult and Scientific lens outputs — and one sentence on whether 'the internet as a living thing' is a metaphor, a mythological claim, or an empirical hypothesis in progress."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"enchantment\" (or \"magic\") and separately for \"disenchantment\" (or \"secular\").",
          instructions: [
            "Look at both clusters. Which is larger — enchantment or disenchantment? What does the relative size suggest about where the library's weight of attention falls?",
            "Find any texts that appear in or near both clusters simultaneously. What does their position suggest about whether enchantment and disenchantment are truly opposed or secretly continuous?",
            "Find texts closest to the enchantment cluster that come from traditions not conventionally classified as 'magical.' What does their adjacency suggest?"
          ],
          documentation: "A structural observation on the relative size and composition of the enchantment and disenchantment clusters, which texts bridge them, and what the structure suggests about whether the disenchantment thesis is as settled as it presents itself to be."
        }
      ],
      synthesis_prompt: {
        prompt: "Is the experience of technology as enchanting a recovery of something real, a mistake, or the correct response to a genuinely different kind of thing?",
        expansion: [
          "Your enchanted and disenchanted moments are the week's primary evidence. Apply the Hermetic, Dhammapada, and Frazer frameworks to both moments simultaneously. Do all three converge on an explanation, or do they identify three different things?",
          "Nietzsche's re-enchantment proposal is bodily — the body is wiser than the mind that despises it. Does your enchanted moment of technology use involve the body, or a kind of disembodied connection? If disembodied: is Nietzsche's framework a critique of that moment, or is he describing a different kind of re-enchantment than technology can offer?",
          "Your Deep Search found three types of enchantment. The technology industry primarily promises world-property enchantment. If the Dhammapada is right that enchantment is primarily a consciousness-property — a function of the quality of attention brought to any encounter — what follows for the technology industry's promise?",
          "Frazer's sacred fire required specific ritual conditions to produce its effect. If the conditions for genuine enchantment are analogous — specific states of mind, specific intentions — can a technology designed for mass engagement at scale ever reliably produce them?"
        ]
      },
      micro_artifact: {
        name: "Enchantment Map",
        description: "A structured one-page account of your chosen technology's relationship to enchantment — organized as: (1) the enchanted moments (described and analyzed), (2) the disenchanted moments (described and analyzed), (3) which type of enchantment the technology primarily promises, and (4) which type it primarily delivers.",
        purpose: "The Enchantment Map examines the quality of actual experience of technology use, not just its structural or mythological function. The gap between what the technology promises and what it delivers is one of the course's most consequential findings.",
        capstone_connection: "Becomes the 'Enchantment Account' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 8 ──────────────────────────────────────────────────────────────
    {
      week_number: 8,
      title: "Who Writes the Story?",
      core_question: "If technology is telling a myth, the first question is not 'is it true?' but 'who commissioned it — and what does the commissioning cost the people who live inside it?'",
      key_tension: "Myth as shared cosmology vs. Myth as manufactured consent — Myths can emerge from genuine collective need. They can also be designed, deployed, and maintained in the interests of specific actors. Most myths do both simultaneously.",
      lens_focus: ["historical_anthropological", "psychological", "philosophical"],
      readings: [
        {
          title: "Totem and Taboo",
          author: "Sigmund Freud",
          section: "Part III: 'Animism, Magic, and the Omnipotence of Thoughts'",
          selection_rationale: "Freud's 'omnipotence of thoughts' is the most precise description available in the library of the assumption that makes the technology industry's mythology coherent: the belief that intentional design can reliably produce desired outcomes in complex human systems.",
          tiers: {
            keystone: { reference: "The 'omnipotence of thoughts' — the animistic belief that wish, intention, and mental representation have direct causal power over the physical world", description: "The contemporary equivalent: the technology industry's belief that design intention can produce desired outcomes at population scale. The 'omnipotence of thoughts' is not a failure of primitive cognition; it is the founding assumption of UX design." },
            passage: { reference: "Part III complete: animism as the first coherent worldview, magic as its practical technology, the 'omnipotence of thoughts' as its epistemological foundation", description: "Applied to technology: the A/B test is the contemporary ritual; the product manager is the contemporary magician; the conversion rate is the measure of whether the magic worked." },
            full: { reference: "Parts III and IV", description: "Adds Freud's account of how the animistic worldview transitions to religious and then scientific thinking — each preserving the previous worldview's basic structure under a new name." }
          }
        },
        {
          title: "The Elementary Forms of Religious Life",
          author: "Émile Durkheim",
          text_id: "T071",
          section: "Book II, Chapter 7: Totemic Beliefs",
          selection_rationale: "Durkheim's totemic analysis provides the week's most precise account of how a technology platform functions as a sacred object — and therefore why platform moderation controversies produce responses of the same character and intensity as violations of the sacred in traditional societies.",
          tiers: {
            keystone: { reference: "Durkheim's account of how the totem represents the group to itself: the sacred object is not sacred because of anything in the object — it is sacred because the group has invested it with its collective identity", description: "The technology platform as totem: the platform is sacred not because of anything in the code but because the community of users has invested it with its collective identity. The platform's 'community standards' and 'terms of service' are the taboo system that defines who belongs and who is expelled." },
            passage: { reference: "Book II, Chapter 7 (the totemic principle and the soul of the group)", description: "Durkheim's account of how the totemic symbol becomes the vehicle through which the group represents its own collective force to itself — and how violation of the totem's interdictions is experienced as a violation of the group itself." },
            full: { reference: "Book II, Chapters 6–7", description: "Extends through Durkheim's account of how the individual soul is the individualized form of the collective sacred. The self presented on the platform is not merely personal; it is the individual form of the platform's collective sacred energy." }
          }
        },
        {
          title: "The Masnavi",
          author: "Jalal ad-Din Rumi",
          section: "Book I: 'The King and the Handmaiden'",
          selection_rationale: "Rumi's parable presents a precise account of how commissioned mythology works: the story is told for a purpose, the purpose is achieved, and the instrument through which the purpose was achieved is then discarded.",
          tiers: {
            keystone: { reference: "The King's physician examines the dying handmaiden and determines that her illness is not physical but caused by love for a goldsmith from Samarkand — the outer symptom has an inner cause that no physical treatment can address", description: "Rumi's parable of misdirected treatment: the physician who treats the symptom without identifying the cause cannot help. Applied to technology: what is the actual cause of the problems that contemporary technology promises to solve?" },
            passage: { reference: "'The King and the Handmaiden' complete (Book I, verses 35–246)", description: "The full story: the physician's diagnosis, the king's summoning of the goldsmith, the handmaiden's recovery, and the king's subsequent elimination of the goldsmith once the cure is complete." },
            full: { reference: "Book I, opening 300 verses", description: "Adds the Masnavi's prologue (the reed's lament for separation from the reed bed) — the framing narrative for the entire work, which is itself a story about misdirected treatment." }
          }
        },
        {
          title: "The Golden Bough",
          author: "James George Frazer",
          text_id: "T007",
          section: "Chapters on the Scapegoat",
          selection_rationale: "Frazer's scapegoat analysis is the week's most politically precise text. It describes a mechanism — expulsion of a designated carrier to relieve communal pressure — that is observable in contemporary technology culture at multiple scales.",
          tiers: {
            keystone: { reference: "Frazer's core scapegoat description: the universal practice of loading communal guilt onto a designated individual, animal, or object and expelling it", description: "The scapegoat as the original mechanism of social pressure management: the community's internal tensions resolved not by addressing their causes but by identifying an external carrier and expelling it. The community is united by the act of expulsion — regardless of whether the scapegoat deserved its role." },
            passage: { reference: "The full scapegoat chapters: from the Hebrew Yom Kippur to the Greek pharmakos to the Roman Saturnalia", description: "Frazer's demonstration that the scapegoat is a human institution. The mechanism functions regardless of whether the scapegoat is guilty of anything. Applied to technology: the periodic platform crises follow this structure." },
            full: { reference: "Scapegoat chapters + Frazer's account of the 'public expulsion of evils'", description: "Extends through Frazer's broader comparative analysis of how communities manage accumulated guilt, fear, and tension through ritual expulsion." }
          }
        }
      ],
      lens_exercise: {
        prompt: "Identify a recent major controversy involving your chosen technology — and map the scapegoat structure.",
        instructions: [
          "Choose a specific controversy: a content moderation decision, a product failure, a data breach, a regulatory action, a viral moment of collective outrage. Name it precisely.",
          "Apply Frazer's scapegoat analysis: who or what was designated as the carrier of communal tension? What was loaded onto the scapegoat? Who performed the expulsion, and what were the consequences after?",
          "Apply Durkheim's totemic analysis: what violation of the sacred occurred that made the expulsion necessary? What taboo was broken?",
          "Apply Freud's 'omnipotence of thoughts' test: did the expulsion address the actual cause of the tension, or treat the symptom? Is there evidence the tension recurred after the expulsion?",
          "Apply Rumi's parable: who is the king in this controversy, who is the physician, who is the goldsmith, and who is the handmaiden?"
        ]
      },
      feature_exercises: [
        {
          feature: "deep_search",
          prompt: "Run a Deep Search for \"scapegoat\" in the library.",
          instructions: [
            "Look at results from at least 5 different books. For each, identify what the scapegoat carries, what the expulsion achieves, and whether the text is sympathetic to the scapegoat, neutral, or focused entirely on the community's perspective.",
            "Find the text most explicit about the relationship between the scapegoat mechanism and power — about who benefits from the expulsion and who is harmed by it.",
            "Find the text most sympathetic to the scapegoat itself — that sees the event from the perspective of the carrier. What does that perspective reveal that the community's perspective hides?"
          ],
          documentation: "One paragraph on the range of treatments of the scapegoat across traditions — and a one-sentence description of whose perspective is most systematically absent from the technology controversies you have examined."
        },
        {
          feature: "lens_engine",
          prompt: "Submit the phrase \"who benefits from the story?\" to the Prismarium Lens Engine.",
          instructions: [
            "Focus on the Historical/Anthropological and Philosophical lens outputs. The Historical/Anthropological lens will likely focus on power structures; the Philosophical lens on epistemological questions. Note what each contributes.",
            "Read the Psychological lens output. Does it address motivated reasoning — the tendency to believe stories that serve our interests — and if so, what does it say about how to correct for it?",
            "Ask: does any lens output refuse the question's premise — arguing that 'who benefits?' is not the right question to ask about a story's truth or value? What does that refusal reveal?"
          ],
          documentation: "Two to three sentences on the most productive divergence between the Historical/Anthropological and Philosophical lenses — and one sentence on whether asking 'who benefits?' is itself a mythological move."
        },
        {
          feature: "knowledge_graph",
          prompt: "Search the Knowledge Graph for \"power\" (and separately for \"authority\").",
          instructions: [
            "Look at both clusters. Which traditions are most central? Does the library's account of power skew toward political philosophy, religious authority, or a different cluster?",
            "Find texts that appear close to both the power cluster and the myth/ritual cluster from earlier weeks. What does their adjacency to both suggest about the relationship between mythological systems and the exercise of power?",
            "Find the texts farthest from the power cluster across the whole library. What traditions are most distant — and are they genuinely unconcerned with power, or do they address power under a different name?"
          ],
          documentation: "A structural observation on which traditions own the power/authority cluster, which texts bridge power and mythology, and whether any tradition in the library offers a complete account of mythological systems that does not involve the question of power."
        }
      ],
      synthesis_prompt: {
        prompt: "What is your chosen technology's myth doing for the people who commissioned it — and what is it costing the people who live inside it?",
        expansion: [
          "Your scapegoat map identified a specific controversy and the roles within it. If the scapegoat mechanism is working correctly, what would you expect to happen next — what new scapegoat candidate is already in position? And if it is failing, what does the recurrence suggest about the cause?",
          "Rumi's parable presents the king as someone who uses the people around him as instruments without recognizing what he is doing. Is the technology industry's relationship to its users best described as deliberate exploitation, structural blindness, or something more complex?",
          "Your Deep Search found whose perspective is most systematically absent from the scapegoat accounts. If that perspective — the perspective of the carrier — were centered in the analysis of your technology's major controversy, what would become visible that the community's perspective hides?",
          "The week's core question is whether myth is shared cosmology or manufactured consent — and the answer is probably 'both, simultaneously.' If both are true for your chosen technology: what does the 'shared cosmology' part do that serves the users, and what does the 'manufactured consent' part do that serves the commissioning interests?"
        ]
      },
      micro_artifact: {
        name: "Beneficiary Analysis",
        description: "A structured analysis of your chosen technology's major controversy — organized as: (1) the scapegoat structure, (2) the totemic violation, (3) the misdirected treatment, and (4) the beneficiary map (who benefits from the myth, what it costs those who live inside it).",
        purpose: "The Beneficiary Analysis is the course's most politically uncomfortable artifact — the point where mythological analysis becomes social analysis, and where the question 'who benefits?' requires an honest answer.",
        capstone_connection: "Becomes the 'Authorship and Function' layer of the Technology Cosmology."
      }
    },

    // ── WEEK 9 (CAPSTONE) ─────────────────────────────────────────────────
    {
      week_number: 9,
      title: "The Myth You Inhabit",
      week_type: "capstone",
      core_question: "What would it mean to be literate in the mythology of your own technological life — and what would you be able to do that you cannot do now?",
      key_tension: "Literacy as awareness vs. Literacy as capacity — Naming the mythology you are inside is not the same as being able to act from outside it. The course ends not with a verdict on technology but with a question about position.",
      lens_focus: ["philosophical", "psychological", "historical_anthropological"],
      readings: [],
      synthesis_prompt: {
        prompt: "Name the mythology you are inside while doing this analysis. What story are you living in that shapes what you can see and what you cannot see?",
        expansion: [
          "Every lens you have applied in this course was itself developed inside a tradition with its own mythology, its own social function, and its own beneficiaries. Which of the traditions you have used this term has the most claim on your actual imagination — not your approval, but your spontaneous sense of what is real and what matters?",
          "Does naming the mythology you inhabit change anything? Or does the name just become another object in the collection — accurately labeled, carefully stored, and continuing to do exactly what it was doing before you labeled it?",
          "Your Technology Cosmology is a multi-layer document analyzing one specific technology across eight analytical dimensions. What does the eight-layer analysis reveal together that none reveals alone?",
          "What do you now understand about your relationship to your chosen technology that you did not understand at the start of the course?"
        ]
      },
      micro_artifact: {
        name: "Technology Cosmology",
        description: "A multi-layered document analyzing one specific technology across all eight analytical dimensions developed in the course. Seven named layers, each drawn from the corresponding weekly micro-artifact: (1) Mythological Baseline, (2) Progress Narrative, (3) The Great Work I — Prima Materia, (4) The Great Work II — Stage Position, (5) Ritual Structure, (6) Finitude Account, (7) Enchantment Account, (8) Authorship and Function. Each layer is 1–2 paragraphs. Concludes with a one-paragraph synthesis and a consolidated feature archive of the most significant cross-traditional connections, lens divergences, and Graph structural observations from across all eight weeks.",
        purpose: "Building the Technology Cosmology requires the student to hold eight different analytical lenses simultaneously — not to produce a single verdict on the technology, but to produce a document that genuinely contains the complexity of the analysis without resolving it into a conclusion.",
        capstone_connection: "The Technology Cosmology is the capstone."
      }
    }
  ]
};

async function main() {
  console.log('Checking if c18 already exists...');
  const { data: existing } = await supabase
    .from('courses')
    .select('id, slug')
    .eq('slug', 'c18-technology-as-modern-myth')
    .maybeSingle();

  if (existing) {
    console.log(`Course already exists: ${existing.id} — updating content only`);
    const { error } = await supabase
      .from('courses')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    console.log('Updated.');
    return;
  }

  console.log('Inserting new course...');
  const { data, error } = await supabase
    .from('courses')
    .insert({
      slug: 'c18-technology-as-modern-myth',
      title: 'Technology as Modern Myth',
      description: 'Contemporary technology is not a neutral set of tools. Every major technology arrives carrying a cosmology — a set of implicit claims about what the world is made of, what the self is for, what counts as progress, and what threatens it. This course applies to contemporary technology the same analytical tools we use to read ancient cosmologies.',
      premise: 'Contemporary technology is not a neutral set of tools. Every major technology arrives carrying a cosmology — a set of implicit claims about what the world is made of, what the self is for, what counts as progress, and what threatens it. Those claims are not argued; they are assumed. And the most powerful thing a myth can do is make itself invisible — to feel like reality rather than a story about reality.\n\nThis course applies to contemporary technology the same analytical tools we use to read ancient cosmologies. The salvation narratives of artificial intelligence, the ritual structure of social media, the apocalyptic grammar of climate and extinction discourse, the transhumanist promise of escape from finitude — each is examined as a mythological structure with identifiable architecture, social function, and interested authors. By the final week, you will have developed a method for reading the mythological substrate of any technology — not as a form of cynicism, but as a form of literacy.',
      level: 'advanced',
      duration_weeks: 9,
      course_type: 'foundational',
      sort_order: 18,
      is_published: false,
      content,
      learning_outcomes: [
        'Distinguish between a technology\'s instrumental function and its mythological structure — identifying the implicit cosmological claims a technology makes independent of its stated purpose',
        'Identify the specific narrative grammar (salvation, apocalypse, ritual, initiation, sacrifice) operating inside contemporary technology discourse',
        'Apply the analytical tools developed across the curriculum — Frazer\'s comparative mythology, Durkheim\'s sacred/profane binary, Jung\'s archetypes, Nietzsche\'s diagnosis of mythological death and replacement, and the alchemical stage structure — to contemporary cases without forcing or flattening',
        'Recognize which traditions\' accounts of progress, finitude, disenchantment, and social ritual shed most light on contemporary technology',
        'Explain how the mythological analysis of technology differs from both techno-optimism and techno-pessimism',
        'Identify the prima materia claim embedded in any technology\'s mythology — what it declares to be base material requiring transformation — and evaluate who benefits from that declaration',
        'Use the Prismarium Lens Engine, Deep Search, and Knowledge Graph to trace mythological structures across traditions and apply them to contemporary phenomena'
      ]
    })
    .select('id, slug')
    .single();

  if (error) {
    console.error('Insert error:', error);
    throw error;
  }
  console.log(`Inserted: ${data.id} (${data.slug})`);
}

main().catch(err => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
