import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Reusable, verified sources referenced by the "Read more" modal.
const S = {
  sep: { label: "Stanford Encyclopedia of Philosophy — Atheism and Agnosticism", url: "https://plato.stanford.edu/entries/atheism-agnosticism/" },
  implicit: { label: "Negative and positive atheism (overview)", url: "https://en.wikipedia.org/wiki/Negative_and_positive_atheism" },
  historyAtheism: { label: "History of atheism", url: "https://en.wikipedia.org/wiki/History_of_atheism" },
  stahl: { label: "Ståhl (2021), “The amoral atheist?”, PLOS ONE — summary", url: "https://www.sciencedaily.com/releases/2021/02/210224143306.htm" },
  secularEthics: { label: "Secular ethics (overview)", url: "https://en.wikipedia.org/wiki/Secular_ethics" },
  humanism: { label: "Secular humanism (overview)", url: "https://en.wikipedia.org/wiki/Secular_humanism" },
  pewScientists: { label: "Pew Research Center — Scientists and Belief (2009)", url: "https://www.pewresearch.org/religion/2009/11/05/scientists-and-belief/" },
  scientism: { label: "Scientism (overview)", url: "https://en.wikipedia.org/wiki/Scientism" },
  pewNonesScience: { label: "Pew Research Center — How “nones” view science (2024)", url: "https://www.pewresearch.org/religion/2024/01/24/how-do-nones-view-science/" },
  pewRLS: { label: "Pew Research Center — Religious Landscape Study (2023–24)", url: "https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/" },
  pewNones: { label: "Pew Research Center — Religious “Nones” in America (2024)", url: "https://www.pewresearch.org/religion/2024/01/24/religious-nones-in-america-who-they-are-and-what-they-believe/" },
  torcaso: { label: "Torcaso v. Watkins (1961)", url: "https://en.wikipedia.org/wiki/Torcaso_v._Watkins" },
  teapot: { label: "Russell’s teapot", url: "https://en.wikipedia.org/wiki/Russell%27s_teapot" },
  euthyphro: { label: "The Euthyphro dilemma", url: "https://en.wikipedia.org/wiki/Euthyphro_dilemma" },
  goldenRule: { label: "The Golden Rule across cultures", url: "https://en.wikipedia.org/wiki/Golden_Rule" },
  charvaka: { label: "Cārvāka — ancient Indian materialism", url: "https://en.wikipedia.org/wiki/Charvaka" },
  lemaitre: { label: "Georges Lemaître", url: "https://en.wikipedia.org/wiki/Georges_Lema%C3%AEtre" },
  bigbang: { label: "Big Bang (overview)", url: "https://en.wikipedia.org/wiki/Big_Bang" },
  mendel: { label: "Gregor Mendel", url: "https://en.wikipedia.org/wiki/Gregor_Mendel" },
  nontheism: { label: "God in Buddhism / non-theism", url: "https://en.wikipedia.org/wiki/God_in_Buddhism" },
  theisticEvo: { label: "Theistic evolution", url: "https://en.wikipedia.org/wiki/Theistic_evolution" },
  gallup: { label: "Gallup — Socialism and Atheism Still U.S. Political Liabilities (2020)", url: "https://news.gallup.com/poll/285563/socialism-atheism-political-liabilities.aspx" },
  snopesDarwin: { label: "Snopes — Darwin’s deathbed conversion", url: "https://www.snopes.com/fact-check/darwin-deathbed-conversion/" },
  talkorigins: { label: "TalkOrigins Archive — The Lady Hope story", url: "https://www.talkorigins.org/faqs/hope.html" },
  einsteinSnopes: { label: "Snopes — Einstein and “Spinoza’s God”", url: "https://www.snopes.com/fact-check/einstein-pantheism-baruch-spinoza/" },
  einsteinWiki: { label: "Religious and philosophical views of Albert Einstein", url: "https://en.wikipedia.org/wiki/Religious_and_philosophical_views_of_Albert_Einstein" },
  fotReport: { label: "Freedom of Thought Report — apostasy/blasphemy death penalties (2021)", url: "https://www.secularism.org.uk/news/2021/11/death-sentence-for-apostasy-in-nearly-a-dozen-countries-report-says" },
  // Arguments
  sepCosmo: { label: "Stanford Encyclopedia of Philosophy — Cosmological Argument", url: "https://plato.stanford.edu/entries/cosmological-argument/" },
  sepFineTune: { label: "Stanford Encyclopedia of Philosophy — Fine-Tuning Argument", url: "https://plato.stanford.edu/entries/fine-tuning/" },
  sepOnto: { label: "Stanford Encyclopedia of Philosophy — Ontological Arguments", url: "https://plato.stanford.edu/entries/ontological-arguments/" },
  sepDesign: { label: "Stanford Encyclopedia of Philosophy — Teleological Arguments", url: "https://plato.stanford.edu/entries/teleological-arguments/" },
  sepMoralRealism: { label: "Stanford Encyclopedia of Philosophy — Moral Realism", url: "https://plato.stanford.edu/entries/moral-realism/" },
  poe: { label: "Problem of evil (overview)", url: "https://en.wikipedia.org/wiki/Problem_of_evil" },
  pascal: { label: "Pascal’s Wager (overview)", url: "https://en.wikipedia.org/wiki/Pascal%27s_wager" },
  occam: { label: "Occam’s razor (overview)", url: "https://en.wikipedia.org/wiki/Occam%27s_razor" },
  sagan: { label: "The Sagan standard — “extraordinary claims…”", url: "https://en.wikipedia.org/wiki/Sagan_standard" },
  fsm: { label: "Flying Spaghetti Monster (overview)", url: "https://en.wikipedia.org/wiki/Flying_Spaghetti_Monster" },
  gaps: { label: "God of the gaps (overview)", url: "https://en.wikipedia.org/wiki/God_of_the_gaps" },
  kitzmiller: { label: "Kitzmiller v. Dover Area School District (2005)", url: "https://en.wikipedia.org/wiki/Kitzmiller_v._Dover_Area_School_District" },
  presup: { label: "Presuppositional apologetics (overview)", url: "https://en.wikipedia.org/wiki/Presuppositional_apologetics" },
  appealConseq: { label: "Appeal to consequences (fallacy)", url: "https://en.wikipedia.org/wiki/Appeal_to_consequences" },
  burden: { label: "Burden of proof (philosophy)", url: "https://en.wikipedia.org/wiki/Philosophic_burden_of_proof" },
  irreducible: { label: "Irreducible complexity (overview)", url: "https://en.wikipedia.org/wiki/Irreducible_complexity" },
  watchmaker: { label: "Watchmaker analogy (overview)", url: "https://en.wikipedia.org/wiki/Watchmaker_analogy" },
  // History & global
  pewUnaff: { label: "Pew Research Center — religiously unaffiliated population change, 2010–2020", url: "https://www.pewresearch.org/religion/2025/06/09/religiously-unaffiliated-population-change/" },
  pewLandscape: { label: "Pew Research Center — how the global religious landscape changed, 2010–2020", url: "https://www.pewresearch.org/religion/2025/06/09/how-the-global-religious-landscape-changed-from-2010-to-2020/" },
  foxholes: { label: "“There are no atheists in foxholes” (overview)", url: "https://en.wikipedia.org/wiki/There_are_no_atheists_in_foxholes" },
  pledge: { label: "Pledge of Allegiance — “under God” added 1954", url: "https://en.wikipedia.org/wiki/Pledge_of_Allegiance" },
  motto: { label: "“In God We Trust” — U.S. national motto (1956)", url: "https://en.wikipedia.org/wiki/In_God_We_Trust" },
  engel: { label: "Engel v. Vitale (1962)", url: "https://en.wikipedia.org/wiki/Engel_v._Vitale" },
  schempp: { label: "Abington School District v. Schempp (1963)", url: "https://en.wikipedia.org/wiki/Abington_School_District_v._Schempp" },
  ohair: { label: "Madalyn Murray O’Hair (overview)", url: "https://en.wikipedia.org/wiki/Madalyn_Murray_O%27Hair" },
  irreligionCountries: { label: "List of countries by irreligion", url: "https://en.wikipedia.org/wiki/Irreligion_by_country" },
  newAtheism: { label: "New Atheism (overview)", url: "https://en.wikipedia.org/wiki/New_Atheism" },
  secularState: { label: "Secular state (overview)", url: "https://en.wikipedia.org/wiki/Secular_state" },
  laicite: { label: "Laïcité — French secularism", url: "https://en.wikipedia.org/wiki/La%C3%AFcit%C3%A9" },
  freethought: { label: "Freethought (overview)", url: "https://en.wikipedia.org/wiki/Freethought" },
  treatyTripoli: { label: "Treaty of Tripoli (1797), Article 11", url: "https://en.wikipedia.org/wiki/Treaty_of_Tripoli" },
  noReligiousTest: { label: "No Religious Test Clause (Article VI)", url: "https://en.wikipedia.org/wiki/No_Religious_Test_Clause" },
  ingersoll: { label: "Robert G. Ingersoll — “The Great Agnostic”", url: "https://en.wikipedia.org/wiki/Robert_G._Ingersoll" },
  agnosticismWiki: { label: "Agnosticism — term coined by T. H. Huxley (1869)", url: "https://en.wikipedia.org/wiki/Agnosticism" },
  scopes: { label: "Scopes “Monkey” Trial (1925)", url: "https://en.wikipedia.org/wiki/Scopes_trial" },
  // Top-ups
  deism: { label: "Deism (overview)", url: "https://en.wikipedia.org/wiki/Deism" },
  pantheism: { label: "Pantheism (overview)", url: "https://en.wikipedia.org/wiki/Pantheism" },
  sbnr: { label: "“Spiritual but not religious” (overview)", url: "https://en.wikipedia.org/wiki/Spiritual_but_not_religious" },
  ignosticism: { label: "Ignosticism / theological noncognitivism", url: "https://en.wikipedia.org/wiki/Ignosticism" },
  implicitAtheism: { label: "Implicit and explicit atheism", url: "https://en.wikipedia.org/wiki/Implicit_and_explicit_atheism" },
  apatheism: { label: "Apatheism (overview)", url: "https://en.wikipedia.org/wiki/Apatheism" },
  isOught: { label: "The is–ought problem (Hume)", url: "https://en.wikipedia.org/wiki/Is%E2%80%93ought_problem" },
  evoMorality: { label: "Evolution of morality (overview)", url: "https://en.wikipedia.org/wiki/Evolution_of_morality" },
  abiogenesis: { label: "Abiogenesis (origin of life)", url: "https://en.wikipedia.org/wiki/Abiogenesis" },
  theoryMeaning: { label: "Scientific theory — what “theory” means", url: "https://en.wikipedia.org/wiki/Scientific_theory" },
  entropyLife: { label: "Entropy and life / the second law", url: "https://en.wikipedia.org/wiki/Entropy_and_life" },
  methodNat: { label: "Naturalism — methodological vs. philosophical", url: "https://en.wikipedia.org/wiki/Naturalism_(philosophy)" },
  ageUniverse: { label: "Age of the universe (~13.8 billion years)", url: "https://en.wikipedia.org/wiki/Age_of_the_universe" },
  peteStark: { label: "Pete Stark — first openly nontheistic member of Congress", url: "https://en.wikipedia.org/wiki/Pete_Stark" },
};

// Real content: common misconceptions and false assumptions about atheism.
// `explanation` is the short inline blurb; `detail` + `sources` power the
// "Read more" modal on the results/review screen.
const questions = [
  // ---- Definitions & distinctions ----
  {
    text: '"Atheism is a religion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Easy",
    explanation:
      "Myth. Atheism is simply the absence of belief in gods — it has no doctrine, worship, or ritual that would make it a religion. (Stanford Encyclopedia of Philosophy)",
    detail:
      "A religion generally combines belief in the supernatural with shared doctrines, rituals, clergy, or sacred texts. Atheism has none of these: it is a single answer — “no,” or “I’m not convinced” — to one question about the existence of gods. Calling it a religion is a bit like calling “off” a TV channel, or “bald” a hair colour.",
    sources: [S.sep, S.historyAtheism],
  },
  {
    text: "What does the word “atheism” most precisely mean?",
    options: [
      "Certainty that no gods exist",
      "A lack of belief in gods",
      "Hatred of religion",
      "The belief that science explains everything",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Easy",
    explanation:
      "In its broad and most common sense, atheism is the absence of belief in gods, not a positive claim of certainty. (Stanford Encyclopedia of Philosophy)",
    detail:
      "Philosophers distinguish “negative” (weak) atheism — simply not holding a belief in any god — from “positive” (strong) atheism, which asserts that no gods exist. The everyday meaning is usually the former, which is why many atheists prefer to say they “lack belief” rather than “believe there is no god.”",
    sources: [S.sep, S.implicit],
  },
  {
    text: "The difference between atheism and agnosticism is best described as:",
    options: [
      "Atheism is about belief; agnosticism is about knowledge",
      "They mean exactly the same thing",
      "Agnostics believe in God part-time",
      "Atheists are certain and agnostics are religious",
    ],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Atheism concerns what you believe; agnosticism concerns what you claim to know. The two overlap — an “agnostic atheist” lacks belief without claiming certainty. (Stanford Encyclopedia of Philosophy)",
    detail:
      "Belief and knowledge are two different axes. You can lack belief in gods (atheist) while also holding that the question can’t be settled with certainty (agnostic) — that combination is an “agnostic atheist.” By the same logic, an “agnostic theist” believes but doesn’t claim to know.",
    sources: [S.sep],
  },
  {
    text: '"Every atheist claims to know for certain that no god exists."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Myth. That describes only “positive” (strong) atheism. Many atheists hold “negative” atheism — they simply lack belief without asserting certainty. (Stanford Encyclopedia of Philosophy)",
    detail:
      "Only positive/strong atheism makes the assertion “there are no gods.” Most people who call themselves atheists hold the weaker position of simply not being convinced by the evidence offered — a stance that requires no claim of certainty and nothing to “prove.”",
    sources: [S.sep, S.implicit],
  },
  {
    text: "How does antitheism differ from atheism?",
    options: [
      "It means believing in many gods",
      "There's no difference — they're identical",
      "It actively opposes religion, rather than merely lacking belief in gods",
      "It's a branch of Christianity",
    ],
    correctIndex: 2,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Atheism is just the absence of god-belief; antitheism is the further, active stance that religion is harmful. Not all atheists are antitheists.",
    detail:
      "Antitheism adds a value judgment — that religion is harmful and should be opposed — on top of simple non-belief. Many atheists are not antitheists at all; they may be indifferent to religion or even appreciate its cultural, artistic, or community roles.",
    sources: [S.historyAtheism],
  },
  {
    text: '"Atheism takes just as much faith as religious belief."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Hard",
    explanation:
      "Myth. Withholding belief for lack of evidence is not itself a faith claim — an absence of belief is not the same act as holding one. (Stanford Encyclopedia of Philosophy, on negative atheism)",
    detail:
      "Faith usually means commitment to a claim beyond the available evidence. Declining to accept a claim precisely because the evidence is lacking is the opposite move. “Not collecting stamps” is not itself a hobby, and withholding belief is not itself a faith.",
    sources: [S.sep],
  },

  // ---- Morality & ethics ----
  {
    text: '"You can’t be moral without believing in God."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Easy",
    explanation:
      "Myth. Studies find no evidence that religious people behave more morally than atheists. (Ståhl, 2021, PLOS ONE; classic “good Samaritan” helping studies)",
    detail:
      "Large surveys and field experiments find no reliable link between religiosity and moral behaviour. Humans across cultures — religious or not — share core moral intuitions about fairness and avoiding harm, which is what secular ethics builds on.",
    sources: [S.stahl, S.secularEthics],
  },
  {
    text: "Research comparing the moral behavior of atheists and believers generally finds:",
    options: [
      "Believers behave far more morally",
      "Atheists are measurably less trustworthy",
      "No such studies have ever been done",
      "No meaningful difference in moral behavior",
    ],
    correctIndex: 3,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Across surveys and field experiments, religiosity does not reliably predict more moral behavior. (Ståhl, 2021, PLOS ONE, n≈4,193 in the US and Sweden)",
    detail:
      "Ståhl’s 2021 PLOS ONE study of about 4,193 people in the US and Sweden found atheists and believers share the moral values most tied to protecting others. Classic “good Samaritan” experiments likewise found religiosity didn’t predict who stopped to help. Differences that do appear are in emphasis, not in being more or less moral.",
    sources: [S.stahl],
  },
  {
    text: '"Atheists can lead meaningful, purpose-driven lives without religion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Easy",
    explanation:
      "Fact. Secular humanism and similar worldviews locate meaning in human relationships, goals, and experience rather than in a deity.",
    detail:
      "Secular worldviews locate meaning in relationships, work, curiosity, and contributing to others rather than in a cosmic plan handed down from above. Surveys of the nonreligious find most report meaningful, satisfying lives — meaning appears to be something people build, not only something they’re given.",
    sources: [S.humanism],
  },
  {
    text: '"Secular ethical systems exist that don’t depend on religion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Fact. Frameworks like humanism, consequentialism, and contractarianism ground ethics in reason and human welfare, independent of any religion.",
    detail:
      "Secular ethics is a mature field. Utilitarianism reasons from wellbeing, Kantian ethics from universal duties, virtue ethics from good character, and contractarian views from mutual agreement — all without appealing to scripture or a deity.",
    sources: [S.secularEthics],
  },
  {
    text: "A bias documented by psychologists is that people intuitively:",
    options: [
      "Trust atheists more than believers",
      "Assume a described wrongdoer is more likely to be an atheist",
      "Cannot guess a wrongdoer's beliefs at all",
      "Rate atheists as the most generous group",
    ],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Hard",
    explanation:
      "Experiments show a widespread intuitive distrust of atheists — people more readily assume an immoral actor is an atheist. The stereotype isn’t borne out by behavior. (Ståhl, 2021; Gervais et al.)",
    detail:
      "In experiments where people read about someone behaving immorally, they intuitively guess the person is more likely an atheist — a bias found even among some atheists themselves. It reflects a deep cultural stereotype, not evidence that atheists actually behave worse.",
    sources: [S.stahl],
  },
  {
    text: '"Atheism logically forces a person into nihilism."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Myth. Not believing in gods doesn’t entail rejecting value or meaning; most atheists explicitly reject nihilism and hold considered ethical views.",
    detail:
      "Nihilism denies that anything has value or meaning; atheism only withholds belief in gods. The two are logically independent — nothing about lacking god-belief requires abandoning ethics or purpose, and most atheists actively reject nihilism.",
    sources: [S.secularEthics],
  },

  // ---- Science & reason ----
  {
    text: '"Accepting evolution is compatible with belief in God."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Science",
    difficulty: "Easy",
    explanation:
      "Fact. Many religious people accept evolution (“theistic evolution”); the theory describes how life changes and is silent on whether any god exists.",
    detail:
      "Major religious bodies — including the Catholic Church and many mainline Protestant and Jewish denominations — accept evolution, a position called “theistic evolution.” The science describes the mechanisms by which life changes over time; it takes no position on whether a god exists.",
    sources: [S.theisticEvo, S.pewScientists],
  },
  {
    text: '"All scientists are atheists" is false mainly because:',
    options: [
      "No scientists are atheists",
      "Science formally forbids atheism",
      "A substantial share of scientists hold religious beliefs",
      "Scientists never discuss religion",
    ],
    correctIndex: 2,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Surveys of scientists find a large minority hold religious beliefs, so the field is far from uniformly atheist. (Pew Research Center, “Scientists and Belief,” 2009)",
    detail:
      "Pew’s survey of AAAS scientists found a large share hold some religious belief, with levels varying by discipline and country. Historically, many pivotal scientists — Mendel, Lemaître, Faraday — were religious. Science is a method, not a membership test for belief.",
    sources: [S.pewScientists],
  },
  {
    text: '"Atheism, by definition, means believing science can explain everything."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Myth. Atheism is only a position on god-belief. Believing science explains everything (“scientism”) is a separate view — common among atheists but not part of the definition. (SEP; Pew)",
    detail:
      "The view that science can explain everything is called “scientism,” a distinct philosophical position. Atheism is only about god-belief. Pew does find most atheists lean toward scientific explanations, but that’s a correlation among atheists — not what the word means.",
    sources: [S.scientism, S.pewNonesScience],
  },
  {
    text: '"Science has formally proven that God does not exist."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Easy",
    explanation:
      "Myth. Atheism is a stance on belief, not a proven scientific result. Science generally treats untestable supernatural claims as outside its scope.",
    detail:
      "Science tests falsifiable claims, and most god-concepts are framed so that no experiment could refute them, placing them outside science’s reach. Atheism is a stance about belief in the absence of good evidence — not a theorem that has been proven in a lab.",
    sources: [S.sep],
  },
  {
    text: 'Pew found roughly what share of U.S. atheists say "there is a scientific explanation for everything"?',
    options: ["About 20%", "About half", "Roughly 8 in 10", "Fewer than 5%"],
    correctIndex: 2,
    category: "Science",
    difficulty: "Hard",
    explanation:
      "Roughly eight-in-ten atheists say there’s a scientific explanation for everything, even if we don’t yet understand it. (Pew Research Center, 2024)",
    detail:
      "In Pew’s 2023–24 research, about eight-in-ten atheists agreed there’s a scientific explanation for everything, even where we don’t yet understand how it works. Worth noting: this is a common attitude among atheists, not part of atheism’s definition — you can be an atheist without holding it.",
    sources: [S.pewNonesScience],
  },
  {
    text: '"Not believing in a god is itself a kind of faith."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Myth. This conflates lacking a belief with holding one. Declining to accept a claim for want of evidence is the opposite of a faith commitment. (SEP)",
    detail:
      "This conflates two different acts: holding a belief versus lacking one. Requiring evidence before accepting a claim is the same standard we use everywhere else in life; labelling that standard “faith” drains the word of its meaning.",
    sources: [S.sep],
  },

  // ---- Demographics, history & society ----
  {
    text: "About what share of U.S. adults self-identify as atheist?",
    options: ["About 1%", "About 5%", "About 25%", "About half"],
    correctIndex: 1,
    category: "Society",
    difficulty: "Easy",
    explanation:
      "Around 5% of U.S. adults describe themselves as atheist, with more declining the label but still not believing in God. (Pew Research Center, Religious Landscape Study, 2023–24)",
    detail:
      "In Pew’s 2023–24 Religious Landscape Study, about 5% of US adults self-identify as atheist and 6% as agnostic. Many more people don’t accept the “atheist” label but still say they don’t believe in God, so measured atheism depends heavily on how the question is asked.",
    sources: [S.pewRLS, S.pewNones],
  },
  {
    text: 'The religiously unaffiliated ("nones") are about what share of U.S. adults?',
    options: ["About 5%", "About 10%", "Nearly 30%", "About 60%"],
    correctIndex: 2,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Nearly 3-in-10 U.S. adults are religiously unaffiliated (atheist, agnostic, or “nothing in particular”) — up from 16% in 2007. Note: most “nones” are not atheists. (Pew Research Center, 2024)",
    detail:
      "Nearly 30% of US adults are religiously unaffiliated, up from 16% in 2007. But “none” is not “atheist”: the largest slice is “nothing in particular,” and many nones still believe in God or a higher power. Rising disaffiliation isn’t the same as rising atheism.",
    sources: [S.pewNones, S.pewRLS],
  },
  {
    text: '"Atheists secretly worship the Devil."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Easy",
    explanation:
      "Myth. Atheists don’t believe in Satan any more than in gods — devil-worship is itself a religious belief.",
    detail:
      "Satan is a religious figure, so disbelief in gods entails disbelief in devils too. Even most self-described “Satanists” today — for example, The Satanic Temple — are non-theistic and use Satan as a literary symbol of rebellion, not an object of worship.",
    sources: [S.historyAtheism],
  },
  {
    text: '"Atheists are really just people who are angry at God."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Easy",
    explanation:
      "Myth. You can’t be angry at a being you don’t believe exists. Most atheists simply aren’t convinced any god is real.",
    detail:
      "You can’t hold a grudge against a being you don’t think exists. Some people do leave religion after painful experiences, but the defining feature of atheism isn’t anger — it’s simply being unconvinced that any god is real.",
    sources: [S.sep],
  },
  {
    text: '"Stalin was an atheist, which proves atheism causes mass murder."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Hard",
    explanation:
      "Myth. Atrocities under such regimes trace to totalitarian ideology and cults of personality. A lack of god-belief prescribes no actions, so it can’t be the cause (correlation ≠ causation).",
    detail:
      "Atheism is a single answer to one question and prescribes no actions, so it can’t “cause” a policy. Historians attribute 20th-century state atrocities to totalitarian ideology, absolute power, and cults of personality — not to disbelief itself. The reasoning error is treating correlation as causation.",
    sources: [S.historyAtheism],
  },
  {
    text: "A real, documented barrier atheists have faced in U.S. history is:",
    options: [
      "None — there were never any",
      "A federal law banning atheism",
      "Several state constitutions still nominally bar nonbelievers from public office",
      "A mandatory church tax on atheists",
    ],
    correctIndex: 2,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Several state constitutions still contain religious tests barring nonbelievers from office. They’ve been unenforceable since the Supreme Court’s Torcaso v. Watkins (1961).",
    detail:
      "Several US state constitutions still contain religious tests barring nonbelievers from public office. The Supreme Court’s unanimous ruling in Torcaso v. Watkins (1961) made such tests unenforceable, but the dead-letter language often remains on the books to this day.",
    sources: [S.torcaso],
  },

  // ===== Expansion set =====

  // ---- Definitions & distinctions ----
  {
    text: '"Atheism and secular humanism are different things."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Easy",
    explanation:
      "Fact. Atheism is only the absence of belief in gods. Secular humanism is a positive worldview built on reason, ethics, and human dignity — an atheist need not be a humanist, and vice versa.",
    detail:
      "Atheism answers just one question: “do you believe in gods?” Secular humanism adds a positive programme — using reason and science, and treating human dignity as the basis for ethics and meaning. You can hold one without the other, which is why the two labels aren’t interchangeable.",
    sources: [S.humanism, S.sep],
  },
  {
    text: '"An atheist is obligated to prove that God does not exist."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Myth. In its common sense, atheism is a lack of belief, not a positive claim — so it carries no burden to disprove gods. The burden of proof rests on the one asserting a thing exists. (Stanford Encyclopedia of Philosophy)",
    detail:
      "In its common (negative) sense, atheism asserts nothing, so there’s nothing for it to prove. The burden of proof falls on whoever claims a thing exists — the same standard we apply to any extraordinary claim, as Russell’s teapot illustrates.",
    sources: [S.sep, S.teapot],
  },
  {
    text: '"Strong" (or "positive") atheism specifically refers to:',
    options: [
      "Being emotionally committed to atheism",
      "The claim that no gods exist",
      "Aggressive online activism",
      "Certainty that science is always right",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Positive (strong) atheism asserts that no gods exist; negative (weak) atheism merely withholds belief. Both fall under “atheism.” (Stanford Encyclopedia of Philosophy)",
    detail:
      "The philosophical literature splits atheism into “positive/strong” — the assertion that no gods exist — and “negative/weak,” which merely lacks belief. Both count as atheism, but only the positive version makes a claim that invites justification.",
    sources: [S.implicit, S.sep],
  },
  {
    text: '"Atheists believe in nothing at all."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Easy",
    explanation:
      "Myth. Rejecting belief in gods says nothing about the many things atheists do accept — evidence, ethics, love, human rights, and more.",
    detail:
      "Lacking one belief doesn’t erase all the others. Atheists hold plenty of positions — about evidence, ethics, science, relationships, and human rights. “Atheist” simply isn’t a complete worldview by itself; it answers one question, not every question.",
    sources: [S.humanism],
  },
  {
    text: "Roman authorities originally used the label “atheist” as an insult against which group?",
    options: [
      "Traveling philosophers",
      "Early Christians, for rejecting the Roman gods",
      "Army deserters",
      "Foreign merchants",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Hard",
    explanation:
      "Early Christians were branded “atheists” for refusing to worship the Roman pantheon — a reminder that the term has always been relative to whichever gods are in question.",
    detail:
      "Because early Christians refused to honour the Roman gods, Romans branded them atheoi — “atheists.” The account of Polycarp’s martyrdom even records the crowd shouting “Away with the atheists!”, aimed at Christians. Who counts as an “atheist” has always depended on whose gods are in question.",
    sources: [S.historyAtheism],
  },
  {
    text: '"Skepticism about gods existed in the ancient world, long before modern times."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Fact. Nonbelief is old: the Cārvāka school in ancient India and Greek thinkers like Epicurus and Democritus questioned or denied the gods thousands of years ago.",
    detail:
      "Doubt about gods is ancient. India’s Cārvāka (Lokāyata) school and Greek thinkers such as Epicurus and Democritus articulated naturalistic, skeptical worldviews millennia ago. Modern atheism didn’t invent nonbelief; it inherited a very long tradition.",
    sources: [S.charvaka, S.historyAtheism],
  },

  // ---- Morality & ethics ----
  {
    text: "Plato’s “Euthyphro dilemma” famously challenges the idea that:",
    options: [
      "Atheists can behave morally",
      "Morality comes from a god’s commands",
      "Societies need written laws",
      "Any gods exist at all",
    ],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Hard",
    explanation:
      "The dilemma asks: is something good because God commands it, or does God command it because it’s good? Either horn undercuts the claim that morality must be grounded in divine command. (Plato, Euthyphro)",
    detail:
      "In Plato’s dialogue, Socrates asks whether something is good because the gods command it, or whether the gods command it because it is already good. If the first, morality is arbitrary; if the second, goodness exists independently of the gods. Either way, “because God says so” fails as a foundation for ethics.",
    sources: [S.euthyphro],
  },
  {
    text: '"Versions of the Golden Rule appear across many cultures and predate Christianity."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Fact. Reciprocity ethics show up in ancient Egypt, Confucius, and many traditions centuries before the Gospels — moral insight isn’t the property of one religion.",
    detail:
      "Reciprocity ethics — treat others as you’d want to be treated — appear in Confucius, ancient Egyptian texts, Hinduism, and Greek thought centuries before the Gospels. Shared moral intuitions like this look more like human universals than the property of any single faith.",
    sources: [S.goldenRule],
  },
  {
    text: '"An atheist has no reason not to harm others whenever they feel like it."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Easy",
    explanation:
      "Myth. Empathy, reputation, the law, social contracts, and reasoned ethics all give powerful reasons for good behavior that don’t require belief in a deity.",
    detail:
      "Reasons to treat others well include empathy, reputation, the law, the desire to cooperate, and reasoned ethical principles. These motivate everyone, believer or not — and are a big part of why secular societies with low religiosity can be safe and stable.",
    sources: [S.secularEthics],
  },
  {
    text: '"Many atheists describe feeling awe, wonder, and transcendence — for example, contemplating nature or the cosmos."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Fact. A rich, moving inner life doesn’t require religion; figures like Carl Sagan described a profound “cosmic” wonder grounded in the natural world.",
    detail:
      "Awe doesn’t require religion. Scientists such as Carl Sagan and Albert Einstein described a profound “cosmic” wonder grounded in nature itself, and surveys find many nonreligious people report experiences of awe, gratitude, and transcendence.",
    sources: [S.humanism],
  },
  {
    text: "Ethical frameworks that ground morality without reference to any god include:",
    options: [
      "Only nihilism",
      "Utilitarianism, Kantian ethics, and virtue ethics",
      "None — all ethics are religious",
      "Astrology and numerology",
    ],
    correctIndex: 1,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Secular moral philosophy is a large, serious field: consequentialism, deontology, and virtue ethics all reason about right and wrong without invoking a deity.",
    detail:
      "Utilitarianism (maximise wellbeing), Kantian deontology (act on universalizable duties), and virtue ethics (cultivate good character) are major, rigorous systems. Each reasons about right and wrong from human welfare and rationality — no deity required.",
    sources: [S.secularEthics],
  },
  {
    text: '"An atheist can’t be a trustworthy neighbor, friend, or parent."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Easy",
    explanation:
      "Myth. There’s no evidence that nonbelief makes someone a worse family member or citizen — the “untrustworthy atheist” is a stereotype, not a finding. (Ståhl, 2021)",
    detail:
      "The evidence doesn’t support the stereotype: nonbelief doesn’t predict worse parenting, friendship, or citizenship. The persistent image of the “untrustworthy atheist” is a documented cultural bias, not a research finding.",
    sources: [S.stahl],
  },

  // ---- Science & reason ----
  {
    text: "The “Big Bang” theory was first proposed by Georges Lemaître, who was:",
    options: [
      "A campaigning atheist",
      "A Catholic priest and physicist",
      "A science-fiction author",
      "A Soviet official",
    ],
    correctIndex: 1,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Lemaître was both a Catholic priest and a physicist — a clean counterexample to the idea that science and religious belief can’t coexist in one person.",
    detail:
      "Georges Lemaître, who first proposed the expanding universe and the “primeval atom” idea behind the Big Bang, was both a Catholic priest and a physicist. He argued that science and faith address different questions and shouldn’t be forced into conflict.",
    sources: [S.lemaitre, S.bigbang],
  },
  {
    text: '"Some serious, accomplished scientists have been devoutly religious."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Science",
    difficulty: "Easy",
    explanation:
      "Fact. Gregor Mendel, the founder of genetics, was a friar; Georges Lemaître a priest. Being a scientist doesn’t require — or forbid — religious belief.",
    detail:
      "Gregor Mendel, the friar who founded genetics, and Georges Lemaître, the priest behind the Big Bang, are famous examples. Surveys still find a substantial minority of working scientists hold religious beliefs. Doing science neither requires nor forbids religion.",
    sources: [S.mendel, S.pewScientists],
  },
  {
    text: '"Atheists claim the entire universe popped out of nothing, which is obviously absurd."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Myth. Most atheists don’t assert this; “we don’t yet know” is a common, honest answer. And cosmology’s “nothing” is a technical vacuum state, not philosophical non-existence.",
    detail:
      "Most atheists don’t claim the universe came from absolute nothing; the honest answer is often “we don’t know yet.” And in physics, “nothing” usually refers to a quantum vacuum with real properties — not the philosophical non-being the objection imagines.",
    sources: [S.bigbang],
  },
  {
    text: "“Russell’s teapot” is an analogy Bertrand Russell used to argue that:",
    options: [
      "Tea should be respected",
      "Whoever makes an unfalsifiable claim bears the burden of proof",
      "Outer space is completely empty",
      "Atheism can be proven mathematically",
    ],
    correctIndex: 1,
    category: "Science",
    difficulty: "Hard",
    explanation:
      "Russell noted that if he claimed an undetectable teapot orbits the Sun, it wouldn’t be others’ job to disprove it. The burden lies with the claimant — a point about extraordinary claims generally.",
    detail:
      "Bertrand Russell imagined an undetectable teapot orbiting the Sun: no one could disprove it, but that wouldn’t make believing in it reasonable. The analogy makes a general point about unfalsifiable claims — the burden of proof sits with whoever asserts the claim, not with the skeptic.",
    sources: [S.teapot],
  },
  {
    text: '"Accepting the Big Bang or evolution takes the same kind of faith as religion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Myth. Scientific acceptance rests on repeatable, testable evidence and is revised when the evidence changes — a different process from faith.",
    detail:
      "Scientific conclusions rest on evidence that is tested, reproduced, and revised when new data arrive. The Big Bang and evolution are accepted because many independent lines of evidence converge on them — not because of trust in an authority or a text.",
    sources: [S.bigbang],
  },
  {
    text: '"Atheism depends on the theory of evolution being true."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Easy",
    explanation:
      "Myth. People doubted gods for thousands of years before Darwin. Disbelief doesn’t hinge on any single scientific theory.",
    detail:
      "Nonbelief predates Darwin by millennia — see the Cārvāka and the Epicureans. Evolution explains the diversity of life; it isn’t the premise atheism stands or falls on. If evolution were somehow overturned tomorrow, the question of gods would be untouched.",
    sources: [S.historyAtheism, S.charvaka],
  },

  // ---- Demographics, history & society ----
  {
    text: "In a 2020 Gallup poll, what share of Americans said they would vote for a well-qualified atheist for president?",
    options: ["About 20%", "About 40%", "About 60%", "About 95%"],
    correctIndex: 2,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "About 60% — up from just 18% in 1958 — though atheists still rank near the bottom of groups Americans say they’d support. (Gallup, 2020)",
    detail:
      "Gallup’s 2020 poll found about 60% of Americans would vote for a well-qualified atheist presidential candidate — a big jump from just 18% in 1958. Even so, atheists and socialists still ranked at the bottom of the groups Gallup tested, showing real but shrinking prejudice.",
    sources: [S.gallup],
  },
  {
    text: '"Charles Darwin renounced evolution and converted to Christianity on his deathbed."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Hard",
    explanation:
      "Myth. The “Lady Hope” story was published in 1915, 33 years after Darwin died, and his family flatly denied it. (Snopes; TalkOrigins Archive)",
    detail:
      "The “Lady Hope” story appeared in a Baptist magazine in 1915 — 33 years after Darwin died. She wasn’t present at his deathbed, and Darwin’s children publicly denied the account. Fact-checkers and historians class it as a fabrication.",
    sources: [S.snopesDarwin, S.talkorigins],
  },
  {
    text: "Albert Einstein described his own religious outlook as closest to:",
    options: [
      "Campaigning atheism",
      "Evangelical Christianity",
      "“Spinoza’s God” — the order of nature, not a personal deity",
      "Traditional Judaism’s personal God",
    ],
    correctIndex: 2,
    category: "Society",
    difficulty: "Hard",
    explanation:
      "Einstein rejected a personal God but also rejected the “atheist” label, calling himself agnostic and pointing to “Spinoza’s God.” He’s often wrongly claimed by both sides. (Einstein, 1947 letter)",
    detail:
      "Einstein repeatedly rejected belief in a personal God, yet also rejected the label “atheist,” calling himself agnostic and invoking “Spinoza’s God” — the lawful order of nature. Quote-miners on both sides misrepresent him; his actual view fits neither camp neatly.",
    sources: [S.einsteinSnopes, S.einsteinWiki],
  },
  {
    text: '"In some countries today, openly expressing atheism can carry the death penalty."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Fact. Around a dozen countries punish apostasy or blasphemy — which includes expressing atheism — with death. (Humanists International, Freedom of Thought Report)",
    detail:
      "Humanists International’s Freedom of Thought Report documents roughly a dozen countries where apostasy or blasphemy — which can include openly expressing atheism — is punishable by death, with many more imposing prison terms. Anti-atheist discrimination is a serious, current human-rights issue.",
    sources: [S.fotReport],
  },
  {
    text: '"Atheists generally want to ban religion and stop people from worshipping."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Easy",
    explanation:
      "Myth. Most atheists support freedom of — and from — religion. Secularism keeps the state neutral, protecting believers and nonbelievers alike.",
    detail:
      "Most atheists support secularism: a state that stays neutral on religion and protects everyone’s freedom to believe or not. Wanting government out of religion is very different from wanting to abolish it — and secular protections shield believers just as much as nonbelievers.",
    sources: [S.humanism],
  },
  {
    text: "Buddhism is often noted in religious studies because many of its traditions are:",
    options: [
      "Strictly monotheistic",
      "Largely non-theistic — not centered on a creator God",
      "Officially atheist governments",
      "Identical to Christianity",
    ],
    correctIndex: 1,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Many Buddhist traditions don’t center on a creator god at all — showing that living without belief in such a god isn’t unique to people who call themselves atheists.",
    detail:
      "Many Buddhist traditions don’t posit a creator god, focusing instead on practice and liberation from suffering. It’s a leading example that a life — and even an entire religion — can be organised without belief in such a god, so non-theism isn’t unique to people who call themselves atheists.",
    sources: [S.nontheism],
  },

  // ===== Arguments =====
  {
    text: "The cosmological argument says the universe must have a first cause. A common reply is:",
    options: [
      "The universe isn’t real",
      "It special-pleads — if everything needs a cause, so would God",
      "Causes don’t exist",
      "God is made of atoms",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "If “everything needs a cause” then God would too; if something can be uncaused, it needn’t be God. Exempting God is special pleading.",
    detail:
      "The argument moves from “everything has a cause” to “therefore a first, uncaused cause — God.” Critics note this quietly exempts God from the very premise it relies on (special pleading), and even if a first cause exists, nothing in the argument shows it is a mind, is good, or is any particular god.",
    sources: [S.sepCosmo, S.burden],
  },
  {
    text: '"Everything must have a cause — except God, who doesn’t need one."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Myth (special pleading). You can’t use “everything needs a cause” to prove God and then exempt God from the rule.",
    detail:
      "This is the classic “then who made God?” objection. Either the premise “everything needs a cause” is true — in which case God needs one too — or some things can be uncaused, in which case the universe itself is a candidate and no god is required.",
    sources: [S.sepCosmo],
  },
  {
    text: "The fine-tuning argument says the universe’s constants are improbably suited to life. One naturalistic response is:",
    options: [
      "Constants can’t be measured",
      "A multiverse, or observer selection — we could only find ourselves in a life-permitting universe",
      "Life is an illusion",
      "The constants are just letters",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "If many universes exist (or given that observers can only arise where conditions allow), a life-permitting universe is unsurprising without a designer.",
    detail:
      "Responses include the multiverse (many universes with varied constants make some life-permitting ones likely) and the anthropic/observer-selection point (we necessarily find ourselves in a universe compatible with our existence). Critics also note the reasoning assumes we know the odds and that the constants could have been otherwise.",
    sources: [S.sepFineTune],
  },
  {
    text: '"Most of the universe is instantly lethal to life (vacuum, radiation, cold), which sits awkwardly with the idea it was fine-tuned for us."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "Fact — a common counterpoint: the cosmos is overwhelmingly hostile to life, which is hard to square with being purpose-built for it.",
    detail:
      "Life occupies a vanishingly small, fragile fraction of space and time. Fine-tuning proponents reply that the physical constants still had to fall in a narrow range for any life at all; skeptics counter that a universe designed for life looks like a strange way to go about it.",
    sources: [S.sepFineTune],
  },
  {
    text: '"Pascal’s Wager proves the smart move is to just believe in God, to be safe."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "Myth. The Wager doesn’t say which god, assumes belief is a choice, and a god could just as well reward honest doubt over feigned belief.",
    detail:
      "Objections include the “many gods” problem (which deity do you bet on, since they’d punish backing the wrong one?), that you can’t simply decide to believe, and that an honest god might prefer sincere doubt to self-interested pretending. It argues for the utility of belief, not the truth of it.",
    sources: [S.pascal],
  },
  {
    text: "Epicurus’s “problem of evil” challenges the coherence of a god that is:",
    options: [
      "Invisible and distant",
      "All-powerful and all-good, given that suffering exists",
      "Singular rather than plural",
      "Ancient rather than modern",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "If a god is willing and able to prevent suffering, why does it exist? The tension is between omnipotence, perfect goodness, and real-world evil.",
    detail:
      "Formalised as: is God willing to prevent evil but unable (not omnipotent), able but unwilling (not good), or both able and willing (then why evil)? Theologians answer with free will, “soul-making,” or mystery; the argument remains a central challenge to classical theism.",
    sources: [S.poe],
  },
  {
    text: '"The problem of evil is a modern atheist talking point."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "Myth. It’s commonly attributed to Epicurus (~300 BCE) and has been debated within theology for millennia.",
    detail:
      "Far from new or uniquely atheist, the problem of evil is one of the oldest questions in philosophy of religion, wrestled with by believers and skeptics alike — from Epicurus through Augustine, Leibniz (who coined “theodicy”), and Hume.",
    sources: [S.poe],
  },
  {
    text: "Occam’s razor is the principle that:",
    options: [
      "Simpler explanations, making fewer assumptions, are preferable",
      "More entities always explain more",
      "Older ideas are truer",
      "Razors settle debates",
    ],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "Among explanations that fit the evidence equally well, prefer the one that assumes the least. It’s a guide, not a proof.",
    detail:
      "Often invoked in god debates: if the natural world can be explained without adding a supernatural agent, the razor favours the leaner account. It doesn’t disprove anything — it’s a heuristic for not multiplying assumptions beyond necessity.",
    sources: [S.occam],
  },
  {
    text: '"Because you can’t prove God doesn’t exist, disbelief is irrational."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Myth. You generally can’t prove a universal negative; the burden of proof sits with the positive claim that something exists.",
    detail:
      "Withholding belief pending evidence is the same standard we use for undetectable teapots or invisible dragons (Russell, Sagan). “You can’t disprove it” applies equally to countless claims we’re all comfortable rejecting until there’s evidence.",
    sources: [S.burden, S.teapot],
  },
  {
    text: "Carl Sagan’s “extraordinary claims require extraordinary evidence” means:",
    options: [
      "All claims are equal",
      "The more a claim departs from established evidence, the stronger the evidence needed to accept it",
      "Evidence is always extraordinary",
      "Scientists dislike claims",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Belief should scale with evidence: a claim that overturns well-established knowledge needs proportionally strong support.",
    detail:
      "The “Sagan standard” popularised a long-standing idea (cf. Hume on miracles). It’s not a demand that god-claims meet an impossible bar — just that a hugely consequential, reality-reshaping claim be backed by evidence commensurate with its size.",
    sources: [S.sagan],
  },
  {
    text: '"The Flying Spaghetti Monster is just atheists mocking religion for fun."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "Myth. It’s a rhetorical device — an obviously unfalsifiable deity — created to make a point about the burden of proof and teaching intelligent design in science class.",
    detail:
      "The FSM was introduced in a 2005 open letter protesting a school board’s plan to teach intelligent design. The point: if unfalsifiable “designer” claims count as science, so should an equally unfalsifiable pasta deity — illustrating why untestable claims fall outside science.",
    sources: [S.fsm],
  },
  {
    text: "The design argument (a watch implies a watchmaker) is challenged by evolution because:",
    options: [
      "Watches are alive",
      "Natural selection produces the appearance of design without a designer",
      "There are no watches",
      "Designers don’t exist",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Cumulative selection over deep time can build complex, well-adapted structures without foresight — “design” without a designer.",
    detail:
      "Paley’s watchmaker analogy inferred a designer from apparent design in nature. Darwin supplied a mechanism — variation plus selection — that yields functional complexity gradually, which Richard Dawkins framed as the “blind watchmaker.”",
    sources: [S.watchmaker, S.sepDesign],
  },
  {
    text: '"If science can’t yet explain something, that gap is evidence for God."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Myth — the “God of the gaps.” Unexplained isn’t the same as unexplainable, and such gaps have repeatedly been filled by natural explanations.",
    detail:
      "Placing God in the current gaps of knowledge is a shrinking position: lightning, disease, and the diversity of life were all once “only God could explain” — until they weren’t. Not knowing an answer yet is a reason to keep investigating, not a proof of the supernatural.",
    sources: [S.gaps],
  },
  {
    text: "The ontological argument tries to prove God exists from:",
    options: [
      "Fossil evidence",
      "The very definition of God as a being than which none greater can be conceived",
      "Opinion surveys",
      "The power of thunder",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "It argues purely from a definition that existence is part of being maximally great — a move many philosophers reject as smuggling existence in by wordplay.",
    detail:
      "First framed by Anselm, it claims a greatest conceivable being must exist, since existing is “greater” than not. Critics from Gaunilo to Kant object that existence isn’t a property you can define things into having — you can define a perfect island, but that doesn’t conjure one.",
    sources: [S.sepOnto],
  },
  {
    text: '"Intelligent Design is a scientific alternative to evolution."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "Myth. A U.S. federal court (Kitzmiller v. Dover, 2005) ruled Intelligent Design is a religious view, not science, and can’t be taught as such.",
    detail:
      "In Kitzmiller v. Dover, the judge — a Republican appointee — found ID was creationism relabeled, made untestable claims, and failed as science. “Irreducible complexity” examples like the bacterial flagellum were shown to have plausible evolutionary pathways.",
    sources: [S.kitzmiller, S.irreducible],
  },
  {
    text: "In a debate over whether God exists, the burden of proof rests on:",
    options: [
      "The skeptic who isn’t convinced",
      "Whoever makes the positive claim that something exists",
      "Nobody — it’s unknowable",
      "The larger side",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "The one asserting a thing exists carries the burden. Not being convinced isn’t a claim that needs its own proof.",
    detail:
      "This is a general rule of reasoning, not an anti-religious trick: whoever advances a positive existence claim (a god, Bigfoot, an orbiting teapot) is the one who owes evidence. Declining to accept the claim until then is the default, not a rival claim.",
    sources: [S.burden, S.teapot],
  },
  {
    text: '"‘Presuppositional’ apologetics says you can’t even use logic without God."  How do critics usually respond?',
    options: [
      "By banning logic",
      "That logic’s reliability is demonstrated by use, not granted by assuming one particular god",
      "By agreeing completely",
      "That logic is a liquid",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "Critics say the argument assumes its conclusion: it presupposes a specific god to “ground” reason, when reason’s usefulness stands on its own track record.",
    detail:
      "Presuppositionalism claims logic, math, and morality only make sense if its god exists. Opponents note this is circular (it assumes the thing to be proved) and doesn’t single out any particular deity — every faith could assert the same about its own god.",
    sources: [S.presup],
  },
  {
    text: '"Atheism can’t be true because a universe without God would feel meaningless."  What’s the flaw?',
    options: [
      "There is no flaw",
      "It’s an appeal to consequences — disliking an implication doesn’t make a claim false",
      "Meaning is illegal",
      "The universe is small",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Whether a belief is comforting has no bearing on whether it’s true. Reasoning from “I’d hate that” to “therefore false” is a fallacy.",
    detail:
      "This is the “appeal to consequences.” Even if a godless universe were bleak (many atheists argue it isn’t), that says nothing about whether any god actually exists. Comfort and truth are separate questions.",
    sources: [S.appealConseq],
  },
  {
    text: '"Agnosticism is the safe, neutral middle between theism and atheism."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Myth. Agnosticism answers the knowledge question, not the belief question — so most people are both (an agnostic atheist or an agnostic theist), not sitting “in between.”",
    detail:
      "Belief and knowledge are separate axes. Saying “I can’t know for sure” (agnostic) doesn’t place you between believing and not-believing; you still either hold a god-belief or you don’t. That’s exactly the distinction the pre-quiz questions drew.",
    sources: [S.sep],
  },
  {
    text: "“Irreducible complexity” claims some biological systems can’t have evolved stepwise. This idea was:",
    options: [
      "Confirmed by the Nobel committee",
      "Rejected in court (Kitzmiller, 2005) after evolutionary pathways were shown",
      "Never examined",
      "Proven in 1859",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "Its flagship examples (e.g. the bacterial flagellum, blood clotting) were shown to have plausible precursors, and the Dover court rejected it as science.",
    detail:
      "Michael Behe’s “irreducible complexity” argued certain systems fail if any part is removed, so they couldn’t evolve gradually. Biologists showed components have other functions and viable intermediate stages exist; the Kitzmiller ruling treated it as a religious rather than scientific claim.",
    sources: [S.irreducible, S.kitzmiller],
  },
  {
    text: '"Atheists just haven’t seen the evidence — no rational person could remain unconvinced."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Arguments",
    difficulty: "Medium",
    explanation:
      "Myth. Reasonable, informed people evaluate the same arguments and reach different conclusions — disagreement isn’t proof someone is ignorant or irrational.",
    detail:
      "Philosophers of religion on all sides know the classic arguments intimately and still disagree. Assuming your opponent must be uninformed or dishonest is itself a reasoning error, not a rebuttal.",
    sources: [S.burden],
  },
  {
    text: '"‘First cause’ arguments, even if sound, would only get you to some cause — not necessarily a personal, loving god."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Hard",
    explanation:
      "Fact. This is the “gap” problem: proving a first cause doesn’t establish it has a mind, morality, or any features of a specific religion’s god.",
    detail:
      "Even granting a first cause, extra steps are needed to reach “therefore my god.” Critics argue those steps are usually asserted rather than demonstrated, so cosmological arguments — at best — support a bare deism, not any particular deity.",
    sources: [S.sepCosmo],
  },
  {
    text: '"Believing in one fewer god than a monotheist does — that’s roughly what atheism is."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "Fact (a popular framing). Everyone rejects the thousands of gods they don’t worship; atheists simply extend that same disbelief to one more.",
    detail:
      "The point of the quip is that dismissing other people’s gods already feels obvious to a believer; atheists apply the identical reasoning across the board. It’s a rhetorical illustration rather than a formal proof, but it highlights that disbelief in a given god isn’t exotic.",
    sources: [S.historyAtheism],
  },
  {
    text: '"Calling atheism a ‘belief’ makes it a religion, just like calling not-collecting-stamps a hobby."  What’s the point of that comparison?',
    options: [
      "Stamps are valuable",
      "Lacking a belief (or a hobby) isn’t the same as having one",
      "Everyone should collect stamps",
      "Religions require stamps",
    ],
    correctIndex: 1,
    category: "Arguments",
    difficulty: "Easy",
    explanation:
      "The analogy shows the category error: an absence of X isn’t a variety of X. Not-collecting-stamps is not a hobby; lacking god-belief is not a religion.",
    detail:
      "It’s a compact way to expose the “atheism is just another faith” move. Faith and religion are positive commitments; the default state of not being persuaded is defined by what it lacks, not by an alternative doctrine it holds.",
    sources: [S.sep],
  },

  // ===== History & the wider world =====
  {
    text: "Worldwide, the religiously unaffiliated (“nones”) are about the:",
    options: [
      "Smallest religious category",
      "Third-largest category, after Christians and Muslims",
      "Single largest category",
      "Same size as Judaism",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "Medium",
    explanation:
      "About 1.9 billion people were religiously unaffiliated in 2020 — the world’s third-largest category, behind Christians and Muslims. (Pew Research Center)",
    detail:
      "The unaffiliated grew from roughly 1.6 billion in 2010 to 1.9 billion in 2020. That includes atheists, agnostics, and the much larger “nothing in particular” group — so “third-largest” doesn’t mean 1.9 billion atheists.",
    sources: [S.pewLandscape, S.pewUnaff],
  },
  {
    text: "The three largest populations of religiously unaffiliated people live in:",
    options: [
      "The US, UK, and France",
      "China, Japan, and the United States",
      "India, Brazil, and Nigeria",
      "Italy, Spain, and Poland",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "Medium",
    explanation:
      "China has by far the most, followed by Japan and the United States. Most of the world’s nonreligious people live in the Asia-Pacific region. (Pew Research Center)",
    detail:
      "In 2020 about 78% of the globally unaffiliated lived in Asia-Pacific, with China alone accounting for a huge share. This is a useful corrective to the assumption that “nonreligious” mainly describes the secular West.",
    sources: [S.pewUnaff],
  },
  {
    text: '"‘Under God’ has always been part of the U.S. Pledge of Allegiance."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Easy",
    explanation:
      "Myth. The words “under God” were added in 1954, during the Cold War — over 60 years after the Pledge was written.",
    detail:
      "The Pledge dates to 1892 and originally had no reference to God. Congress inserted “under God” in 1954, amid Cold-War efforts to distinguish the US from “godless” communism.",
    sources: [S.pledge],
  },
  {
    text: "“In God We Trust” became the official U.S. national motto in:",
    options: ["1776", "1863", "1956", "2001"],
    correctIndex: 2,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Congress made it the national motto in 1956 — it is not a founding-era phrase.",
    detail:
      "Though it had appeared on some coins since the 1860s, “In God We Trust” only became the official motto in 1956 and began appearing on paper currency the following year — again, a product of the Cold-War era rather than the founding.",
    sources: [S.motto],
  },
  {
    text: '"An early U.S. treaty, ratified under John Adams in 1797, stated the U.S. government is ‘not in any sense founded on the Christian religion.’"  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "History",
    difficulty: "Hard",
    explanation:
      "Fact. Article 11 of the Treaty of Tripoli said exactly that, and the Senate ratified it unanimously.",
    detail:
      "The line is often cited in debates over whether the US is a “Christian nation.” Whatever the founders’ personal beliefs, this ratified treaty explicitly disclaimed a religious basis for the government itself.",
    sources: [S.treatyTripoli],
  },
  {
    text: "In Engel v. Vitale (1962), the U.S. Supreme Court ruled that:",
    options: [
      "Atheism is unlawful",
      "Official prayer in public schools violates the Constitution",
      "Churches must pay tax",
      "Evolution can’t be taught",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "Medium",
    explanation:
      "The Court held that state-sponsored prayer in public schools breaches the Establishment Clause — the government can’t compose or promote official prayers.",
    detail:
      "Engel struck down a New York state-written school prayer. The following year, Abington v. Schempp ended mandatory Bible readings. Together they established that public schools stay neutral on religion — they didn’t ban private, voluntary prayer.",
    sources: [S.engel, S.schempp],
  },
  {
    text: '"One woman, Madalyn Murray O’Hair, single-handedly ‘banned prayer in schools.’"  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Myth. Her case (part of Abington v. Schempp, 1963) ended mandatory Bible reading; the earlier Engel v. Vitale (1962) had already addressed school prayer — and courts, not one activist, decided.",
    detail:
      "O’Hair was a prominent atheist activist, but the “she banned prayer” story overstates it: the rulings were Supreme Court decisions, they concerned government-sponsored religious exercises, and voluntary personal prayer was never prohibited.",
    sources: [S.ohair, S.schempp],
  },
  {
    text: "France’s principle of strict separation of religion and state is called:",
    options: ["Laïcité", "Glasnost", "Manifest destiny", "Détente"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Laïcité — the French model of state secularism, keeping public institutions free of religious influence.",
    detail:
      "Rooted in a 1905 law separating church and state, laïcité is one influential model of secular governance. It shows that “secular state” isn’t a single idea — the US, French, and other models balance religion and government differently.",
    sources: [S.laicite, S.secularState],
  },
  {
    text: '"‘There are no atheists in foxholes’ is an established fact."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Easy",
    explanation:
      "Myth. It’s a WWII-era aphorism, not a statistic — and nonreligious service members are well documented.",
    detail:
      "The phrase is usually traced to a 1942 field sermon and was never a measured fact. The Military Association of Atheists & Freethinkers adopted “Atheists in Foxholes” to push back; surveys put the share of US military who are secular or nonreligious at roughly 16%.",
    sources: [S.foxholes],
  },
  {
    text: "About what share of U.S. military personnel identify as secular or nonreligious?",
    options: ["About 1%", "About 16%", "About 50%", "About 90%"],
    correctIndex: 1,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Around 16% — roughly one in six — say they’re humanist or have no religion, undercutting the “no atheists in foxholes” claim.",
    detail:
      "That figure is frequently cited in the debate over the foxhole aphorism. It reflects a substantial nonreligious minority serving in the armed forces — hardly the “none” the saying implies.",
    sources: [S.foxholes],
  },
  {
    text: '"Organized ‘freethought’ and secular movements only appeared in the 21st century."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Myth. Freethought societies and secular advocacy flourished in the 1800s — the 19th-century orator Robert Ingersoll was famous nationwide.",
    detail:
      "Freethought — forming beliefs from reason and evidence rather than authority or tradition — has a long organized history, with 19th-century lecture circuits, publications, and societies well before the 2000s “New Atheism” wave.",
    sources: [S.freethought, S.ingersoll],
  },
  {
    text: "“New Atheism” refers to:",
    options: [
      "A 2000s wave of best-selling atheist authors (Dawkins, Harris, Hitchens, Dennett)",
      "A newly founded religion",
      "A political party",
      "A music genre",
    ],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "It names the mid-2000s surge of prominent, assertive atheist writers — not a doctrine that all atheists share.",
    detail:
      "The “Four Horsemen” (Dawkins, Harris, Hitchens, Dennett) shaped a high-profile, often combative style of atheism. It’s one movement among many — plenty of atheists don’t identify with its tone or emphases.",
    sources: [S.newAtheism],
  },
  {
    text: '"Most religiously unaffiliated people live in Europe and North America."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Myth. The large majority — about 78% in 2020 — live in the Asia-Pacific region.",
    detail:
      "The secular West gets the attention, but the numbers are dominated by Asia, especially China. Nonbelief and religious unaffiliation are global, not a Western peculiarity.",
    sources: [S.pewUnaff],
  },
  {
    text: "As of 2020, countries where a majority had no religious affiliation included:",
    options: [
      "Saudi Arabia and Iran",
      "China, the Czech Republic, Japan, and the Netherlands",
      "India and Pakistan",
      "Brazil and Mexico",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "Hard",
    explanation:
      "Several countries are majority-unaffiliated, including China, the Czech Republic, Japan, and the Netherlands (with Uruguay and New Zealand joining by 2020).",
    detail:
      "Majority-nonreligious societies span very different cultures and histories, from East Asia to Central Europe to Latin America — evidence that widespread nonaffiliation isn’t tied to any single region or tradition.",
    sources: [S.pewLandscape, S.irreligionCountries],
  },
  {
    text: '"The U.S. Constitution names God as the foundation of the government."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Myth. The Constitution is secular: it establishes no religion and (Article VI) bars any religious test for public office.",
    detail:
      "The document doesn’t invoke God as its basis; its only mention of religion is to protect against government-imposed religion. The First Amendment’s Establishment Clause later reinforced that neutrality.",
    sources: [S.noReligiousTest, S.treatyTripoli],
  },
  {
    text: "The U.S. Constitution’s ban on requiring a religious test for public office is found in:",
    options: ["The Second Amendment", "Article VI", "The Preamble", "It contains no such ban"],
    correctIndex: 1,
    category: "History",
    difficulty: "Hard",
    explanation:
      "Article VI states that “no religious test shall ever be required” for any federal office — an explicitly secular provision from the founding.",
    detail:
      "This clause means a nonbeliever is constitutionally eligible for federal office. (Several state constitutions kept unenforceable religious tests anyway, struck down in Torcaso v. Watkins, 1961.)",
    sources: [S.noReligiousTest, S.torcaso],
  },
  {
    text: '"The USSR proves atheism has to be forced on people."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Myth. State atheism was a coercive policy of totalitarian regimes; meanwhile many free democracies have become highly secular with no coercion at all.",
    detail:
      "Forcing nonbelief (as some communist states did) is a feature of authoritarian control, not of atheism itself. The Nordic countries and others show large-scale, voluntary secularization within open, democratic societies.",
    sources: [S.secularState, S.irreligionCountries],
  },
  {
    text: "Some of the least religious societies today also tend to rank near the top of global measures of well-being. These include:",
    options: [
      "The Nordic countries",
      "The Gulf states",
      "Central Asian republics",
      "Microstates like the Vatican",
    ],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Highly secular Nordic countries (Sweden, Denmark, Norway) consistently rank among the most prosperous, safe, and stable — a strong counter to “societies collapse without religion.”",
    detail:
      "Correlation isn’t causation, but the pattern undercuts the claim that widespread nonbelief brings social breakdown: some of the world’s most secular nations are also among its most functional.",
    sources: [S.irreligionCountries],
  },
  {
    text: '"Between 2010 and 2020, the global number of religiously unaffiliated people fell."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Hard",
    explanation:
      "Myth. It rose — from about 1.6 billion to 1.9 billion.",
    detail:
      "The unaffiliated grew by roughly 17% over the decade in absolute terms. (As a share of the fast-growing world population the change is smaller — see the projection question.)",
    sources: [S.pewUnaff, S.pewLandscape],
  },
  {
    text: '"Even as their numbers grow, the religiously unaffiliated are projected to shrink as a share of the world, because religious populations have higher birth rates."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 1,
    category: "History",
    difficulty: "Hard",
    explanation:
      "Fact. Pew’s demographic projections show the unaffiliated growing in raw numbers but declining as a percentage of humanity, driven largely by fertility differences.",
    detail:
      "Religiously affiliated populations tend to be younger and have more children, so even with people leaving religion, the global share that’s unaffiliated is projected to edge down over the coming decades. Demography, not persuasion, dominates the trend.",
    sources: [S.pewLandscape],
  },
  {
    text: "The 19th-century American orator famous for popularizing nonbelief was known as:",
    options: [
      "“The Great Agnostic” (Robert Ingersoll)",
      "A founding pastor",
      "A Supreme Court justice",
      "A sitting president",
    ],
    correctIndex: 0,
    category: "History",
    difficulty: "Hard",
    explanation:
      "Robert G. Ingersoll drew huge crowds across America in the 1800s and was nicknamed “The Great Agnostic” — organized freethought long predates the modern era.",
    detail:
      "Ingersoll’s widely attended lectures on religion, science, and human rights make the point that skepticism about religion had a prominent public voice in the 19th century, not just today.",
    sources: [S.ingersoll, S.freethought],
  },
  {
    text: '"The word ‘agnostic’ was coined by Charles Darwin."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "History",
    difficulty: "Medium",
    explanation:
      "Myth. The biologist Thomas Henry Huxley coined “agnostic” in 1869 for the position that certain things — like God’s existence — are not known or knowable.",
    detail:
      "Huxley wanted a word for withholding judgment where evidence is lacking, distinct from confidently asserting or denying. It underscores that agnosticism is about knowledge — the same axis the pre-quiz question measured.",
    sources: [S.agnosticismWiki, S.sep],
  },
  {
    text: "The idea that government should stay neutral on religion — neither promoting nor obstructing it — is called:",
    options: ["Theocracy", "Secularism", "Monarchy", "Evangelism"],
    correctIndex: 1,
    category: "History",
    difficulty: "Easy",
    explanation:
      "Secularism keeps the state neutral so people of all faiths and none are treated equally — it protects believers as much as nonbelievers.",
    detail:
      "Secularism isn’t the same as atheism: a secular state takes no official religious stance, which safeguards religious freedom. Different countries implement it differently (the US Establishment Clause, French laïcité, and so on).",
    sources: [S.secularState, S.laicite],
  },
  {
    text: "The 1925 “Scopes Monkey Trial” put a teacher on trial for:",
    options: [
      "Being an atheist",
      "Teaching human evolution in a public school",
      "Closing a church",
      "Refusing to say the Pledge",
    ],
    correctIndex: 1,
    category: "History",
    difficulty: "Medium",
    explanation:
      "John Scopes was prosecuted under a Tennessee law banning the teaching of human evolution — an early flashpoint in the long US fight over science in the classroom.",
    detail:
      "The trial pitted Clarence Darrow against William Jennings Bryan and drew national attention. It didn’t settle the issue — later cases like Epperson v. Arkansas (1968) and Kitzmiller v. Dover (2005) did more — but it framed the enduring clash between evolution education and religious objection.",
    sources: [S.scopes, S.kitzmiller],
  },

  // ===== Top-ups to the original categories =====

  // ---- Definitions ----
  {
    text: "“Deism” is the belief that:",
    options: [
      "There are many gods",
      "A creator exists but doesn’t intervene — no miracles or revelation",
      "God and the universe are identical",
      "Gods are fictional",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "A deist accepts a creator but rejects an involved, miracle-working god. Several US founders leaned deist — it’s neither classical theism nor atheism.",
    detail:
      "Deism was influential in the Enlightenment: a “clockmaker” god who set the universe going and then left it to run by natural law. It shows the belief landscape isn’t a simple theist/atheist binary.",
    sources: [S.deism],
  },
  {
    text: "“Pantheism” holds that:",
    options: [
      "God is entirely separate from the universe",
      "God and nature/the universe are one and the same",
      "There are no gods at all",
      "One god who answers prayers",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Pantheists identify “God” with nature or the cosmos itself — the view Einstein gestured at with “Spinoza’s God.”",
    detail:
      "Pantheism blurs the theist/atheist line: there’s no separate, personal deity, just reverence for the universe as it is. It’s another reminder that “belief about god(s)” spans far more than yes/no.",
    sources: [S.pantheism, S.einsteinWiki],
  },
  {
    text: '"Being ‘spiritual but not religious’ is the same as being an atheist."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Myth. “Spiritual but not religious” people often believe in a higher power, soul, or energy — that’s a belief, not the absence of one.",
    detail:
      "SBNR describes distancing from organized religion while keeping spiritual beliefs or practices. Many nones fall here — which is exactly why “religiously unaffiliated” is not a synonym for “atheist.”",
    sources: [S.sbnr, S.pewNones],
  },
  {
    text: "“Ignosticism” is the view that:",
    options: [
      "God definitely exists",
      "The question “does God exist?” is meaningless until “God” is clearly defined",
      "Knowledge of anything is impossible",
      "All religions are equally true",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Hard",
    explanation:
      "An ignostic says we can’t sensibly answer “does God exist?” until we pin down a coherent, testable definition of “God.”",
    detail:
      "Also called theological noncognitivism, it argues many god-concepts are too vague or contradictory to affirm or deny. It’s a different move from both belief and ordinary agnosticism — it questions the question.",
    sources: [S.ignosticism],
  },
  {
    text: '"Everyone is born already believing in God."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Definitions",
    difficulty: "Easy",
    explanation:
      "Myth. Belief in specific gods is learned; a newborn has no such concept. This absence-by-default is sometimes called “implicit atheism.”",
    detail:
      "Children acquire the particular religion of their surroundings. The point isn’t that babies are card-carrying atheists, but that god-belief is taught, not innate — the default is simply the absence of the concept.",
    sources: [S.implicitAtheism],
  },
  {
    text: "An “apatheist” is someone who:",
    options: [
      "Hates all religion",
      "Considers the question of God’s existence unimportant or not worth worrying about",
      "Worships apathy",
      "Is certain God exists",
    ],
    correctIndex: 1,
    category: "Definitions",
    difficulty: "Medium",
    explanation:
      "Apatheism is practical indifference to the god question — whether or not a god exists, it doesn’t affect how they live.",
    detail:
      "It cuts across belief: one can be an apathetic theist or atheist. It highlights that, for many people, the god question simply isn’t a driving concern — which the theist/atheist labels don’t capture.",
    sources: [S.apatheism],
  },

  // ---- Morality ----
  {
    text: "Hume’s “is–ought problem” observes that:",
    options: [
      "You can’t derive what ought to be purely from what is",
      "“Ought” just means “is”",
      "Facts don’t exist",
      "Morality is against the law",
    ],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Hard",
    explanation:
      "It’s a challenge for everyone’s ethics — religious or secular: bridging facts and values takes an argued step, not a bare appeal to authority.",
    detail:
      "Some claim only a god can bridge is and ought, but “God commands X, therefore you ought to do X” faces the same gap (why obey?). Secular ethics tackles it via well-being, reason, and agreed goals — no shortcut, but no deity required either.",
    sources: [S.isOught, S.secularEthics],
  },
  {
    text: '"Empathy and cooperation could only have come from religion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Myth. Cooperation, fairness, and empathy appear across social animals and predate organized religion — evolution favors them.",
    detail:
      "Reciprocity, care for kin, and aversion to unfairness show up in primates and human infants before any religious teaching. Religions often encode and extend these impulses, but they didn’t invent them.",
    sources: [S.evoMorality],
  },
  {
    text: '"Atheists have no way to find comfort facing death or grief."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Easy",
    explanation:
      "Myth. Secular philosophies (Stoicism, humanism) and communities offer meaning, ritual, and consolation around mortality and loss.",
    detail:
      "From Epicurus’s reflections on death to modern humanist celebrants and secular grief support, nonbelievers draw comfort from relationships, memory, and perspective rather than an afterlife.",
    sources: [S.humanism],
  },
  {
    text: '"Without belief in an afterlife, this life must feel less valuable."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Myth. Many nonbelievers argue the opposite — that one finite life makes time, people, and choices more precious, not less.",
    detail:
      "If this is the only life you get, wasting it matters more, and the people in it are irreplaceable. Whether that view is right or not, the assumption that no-afterlife must mean less value is a non sequitur.",
    sources: [S.humanism],
  },
  {
    text: '"If morality doesn’t come from a god, it’s just arbitrary personal opinion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Hard",
    explanation:
      "Myth (or at least contested). Secular moral realists argue moral facts can be grounded in well-being and reason — not mere preference — without a deity.",
    detail:
      "“No god ⇒ anything goes” ignores whole traditions of secular ethics. And grounding morality in divine command faces the Euthyphro problem, so “it comes from God” isn’t obviously less arbitrary.",
    sources: [S.sepMoralRealism, S.euthyphro],
  },
  {
    text: '"Moral progress like abolishing slavery came purely from religion."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Morality",
    difficulty: "Medium",
    explanation:
      "Myth/oversimplified. Reform movements drew on both secular Enlightenment reasoning and religious activism — and often had to overcome religious defenders of the status quo.",
    detail:
      "Scripture was cited on both sides of slavery, segregation, and women’s rights. Moral progress has been a contested, mixed effort — evidence that ethical improvement isn’t the property of any single worldview.",
    sources: [S.secularEthics],
  },

  // ---- Science ----
  {
    text: '"Abiogenesis and evolution are the same thing, so doubts about life’s origin sink evolution."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Myth. Evolution explains how life diversifies once it exists; abiogenesis is a separate question about how life first began.",
    detail:
      "Even if the origin of life were completely unknown, evolution — change in populations over generations — would still be supported by independent evidence. Conflating the two is a common way to overstate uncertainty.",
    sources: [S.abiogenesis],
  },
  {
    text: "Calling evolution “just a theory” misreads the word — in science, a theory is:",
    options: [
      "A hunch or wild guess",
      "A well-substantiated explanation supported by extensive evidence",
      "A proven law with no exceptions",
      "A personal opinion",
    ],
    correctIndex: 1,
    category: "Science",
    difficulty: "Easy",
    explanation:
      "Scientific “theory” means a robust, evidence-backed framework (gravity and germs are “theories” too) — not a casual guess.",
    detail:
      "The everyday sense of “theory” (a guess) differs from the scientific sense (a comprehensive, tested explanation). Evolution is a theory in the strong sense — the framework that ties together mountains of evidence.",
    sources: [S.theoryMeaning],
  },
  {
    text: '"The second law of thermodynamics makes evolution impossible without God."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Hard",
    explanation:
      "Myth. The “entropy always increases” rule applies to closed systems; Earth isn’t closed — it receives a constant flood of energy from the Sun.",
    detail:
      "Local decreases in entropy (like life organizing itself) are fine as long as total entropy rises elsewhere — which the Sun amply provides. Order arising locally under an energy flow is ordinary physics, from snowflakes to organisms.",
    sources: [S.entropyLife],
  },
  {
    text: "“Methodological naturalism,” the working rule of science, means:",
    options: [
      "Scientists must personally be atheists",
      "Science explains via natural causes and doesn’t invoke the supernatural",
      "Nature must be worshipped",
      "Only physics counts as science",
    ],
    correctIndex: 1,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Science limits itself to testable, natural explanations. That’s a method, not a metaphysics — religious scientists use it too.",
    detail:
      "Methodological naturalism (how science operates) is distinct from philosophical naturalism (the claim that nothing supernatural exists). A believer can fully practice the former; that’s why faith and lab work coexist.",
    sources: [S.methodNat],
  },
  {
    text: '"Accepting evolution means believing life has no purpose."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Science",
    difficulty: "Medium",
    explanation:
      "Myth. Evolution describes a mechanism; it says nothing about meaning or purpose, which people (religious and not) find in many ways.",
    detail:
      "Confusing “no built-in cosmic purpose” with “no purpose at all” is a category error. Evolution explains how life’s diversity arose; what you make of your life is a separate question it doesn’t touch.",
    sources: [S.theisticEvo, S.humanism],
  },
  {
    text: "Scientific evidence puts the age of the universe at about:",
    options: ["6,000 years", "13.8 billion years", "1 million years", "Infinitely old"],
    correctIndex: 1,
    category: "Science",
    difficulty: "Hard",
    explanation:
      "Multiple independent methods converge on ~13.8 billion years — a finding from physics and astronomy, independent of anyone’s religion.",
    detail:
      "The cosmic microwave background, expansion rate, and ages of the oldest stars all agree. (Note: atheism doesn’t hinge on cosmology — but “the universe is only a few thousand years old” is a widespread science-vs-religion misconception.)",
    sources: [S.ageUniverse],
  },

  // ---- Society ----
  {
    text: "The first openly nontheistic member of the U.S. Congress, who said in 2007 he didn’t believe in a supreme being, was:",
    options: ["No one, ever", "Rep. Pete Stark", "A sitting president", "A senator in 1900"],
    correctIndex: 1,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Rep. Pete Stark — remarkably late for a group that’s millions strong, showing how underrepresented open nonbelief is in US politics.",
    detail:
      "That the first openly nontheistic congressperson came only in 2007 (and remained a rarity afterward) reflects real electoral stigma, not a lack of nonreligious citizens.",
    sources: [S.peteStark],
  },
  {
    text: '"Atheists are well represented among U.S. elected officials."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Myth. Openly nonreligious politicians are scarce relative to the population — a persistent electability gap.",
    detail:
      "Congress skews far more religious than the public, and openly atheist officeholders are rare. Polling that shows reluctance to vote for an atheist (even a well-qualified one) helps explain the gap.",
    sources: [S.peteStark, S.gallup],
  },
  {
    text: '"Atheist parents can’t raise moral, well-adjusted children."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Easy",
    explanation:
      "Myth. There’s no evidence secular parenting produces less moral or less well-adjusted kids.",
    detail:
      "Studies of children from nonreligious homes find them as generous, empathetic, and well-adjusted as peers. Values like honesty and kindness are taught in secular families just as deliberately.",
    sources: [S.stahl],
  },
  {
    text: '"Charity and community are things only religion can provide."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Myth. Secular charities, mutual-aid networks, and humanist groups do this too — and much “religious giving” goes to running the congregation itself.",
    detail:
      "Community and generosity aren’t exclusive to religion; secular organizations organize aid, volunteering, and belonging worldwide. Comparisons of giving also need care, since religious totals include donations to one’s own congregation.",
    sources: [S.humanism],
  },
  {
    text: "Surveys have repeatedly found atheists among the groups Americans are most reluctant to:",
    options: [
      "Live near",
      "Vote for as president, or welcome marrying into the family",
      "Hire for manual work",
      "None — atheists face no bias",
    ],
    correctIndex: 1,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Atheists have long ranked low on “would you vote for / accept in the family” measures — though the numbers are improving over time.",
    detail:
      "This documented social distrust (see the intuitive-distrust research and Gallup’s candidate polling) is the flip side of the moral-stereotype myths: bias persists even without evidence that atheists behave worse.",
    sources: [S.gallup, S.stahl],
  },
  {
    text: '"Leaving one’s childhood religion is rare, and usually about being angry."  —  Myth or Fact?',
    options: ["Myth", "Fact"],
    correctIndex: 0,
    category: "Society",
    difficulty: "Medium",
    explanation:
      "Myth. Disaffiliation is increasingly common (the rise of the “nones”) and is typically a gradual drift driven by doubt, not anger.",
    detail:
      "Surveys of why people leave religion point to stopping believing the teachings, and slow change over time, far more than a dramatic falling-out. The growth of the unaffiliated reflects broad social trends, not mass grievance.",
    sources: [S.pewNones],
  },
];

async function main() {
  // Deploy-safe by default: if questions already exist, do nothing and never
  // touch Result/Answer, so redeploys don't wipe players' results.
  // Set SEED_FORCE=1 to fully reset the question bank (local use only).
  const force = process.env.SEED_FORCE === "1";
  const existing = await prisma.question.count();

  if (existing > 0 && !force) {
    console.log(`Questions already present (${existing}); skipping seed. Set SEED_FORCE=1 to reset.`);
    return;
  }

  if (force) {
    await prisma.answer.deleteMany();
    await prisma.result.deleteMany();
  }
  await prisma.question.deleteMany();

  for (const q of questions) {
    const { sources, ...rest } = q;
    await prisma.question.create({
      data: {
        ...rest,
        options: JSON.stringify(q.options),
        sources: JSON.stringify(sources),
      },
    });
  }

  console.log(`Seeded ${questions.length} questions${force ? " (forced reset)" : ""}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
