/**
 * Génération et diagnostic des exercices de reconnaissance à l'oreille.
 *
 * Deux modes, un seul moteur :
 *
 *  - RELATIF : la tonique est jouée, puis une note de la gamme. Entraînable à
 *    tout âge, et directement branché sur la progression en cours.
 *  - ABSOLU : aucune référence, tirage dans les douze notes chromatiques.
 *
 * Le mode absolu reste un terrain d'entraînement, pas un instrument de mesure :
 * on y entend la note qu'on joue et on lit la réponse après chaque essai, ce
 * qui fournit un repère pour la question suivante. L'interface le dit, et une
 * option de masquage permet de resserrer l'exercice quand on le souhaite.
 *
 * Le diagnostic (plus bas) ne compte pas les bonnes réponses : il regarde la
 * FORME des erreurs. C'est elle, et non le score, qui distingue « nommer » de
 * « calculer depuis un repère ».
 */

import { pitch, pitchClass, type Alteration, type Letter, type Pitch } from './pitch'
import { majorScale, type Tonic } from './scales'

export type EarMode = 'relative' | 'absolute'

export interface EarQuestion {
  /** La note à reconnaître. */
  readonly target: Pitch
  /** La tonique jouée avant, ou null quand aucune référence n'est donnée. */
  readonly reference: Pitch | null
}

export type Rng = () => number

function pick<T>(items: readonly T[], rng: Rng): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) throw new Error('Tirage dans une liste vide')
  return item
}

/**
 * Orthographe canonique des 12 notes chromatiques, hors contexte tonal.
 * Sans gamme pour trancher entre do♯ et ré♭, on retient l'usage courant
 * (dièses en montant, sauf mi♭, la♭, si♭).
 */
const CHROMATIC: ReadonlyArray<readonly [Letter, Alteration]> = [
  ['C', 0],
  ['C', 1],
  ['D', 0],
  ['E', -1],
  ['E', 0],
  ['F', 0],
  ['F', 1],
  ['G', 0],
  ['A', -1],
  ['A', 0],
  ['B', -1],
  ['B', 0],
]

/** Nombre d'alternatives à chaque question : le hasard vaut 1/12. */
export const CHROMATIC_SIZE = CHROMATIC.length

/** Octaves balayées dès qu'aucune référence n'est donnée. */
export const SPREAD_OCTAVES = [3, 4, 5]

/**
 * Écart minimal, en demi-tons, entre deux notes consécutives sans référence.
 *
 * Une quarte. En deçà, on répondrait en comparant à la note précédente encore
 * en mémoire — c'est-à-dire à l'oreille relative, précisément ce qu'un test
 * d'oreille absolue doit exclure.
 */
const MIN_GAP = 5

/** Distance circulaire entre deux classes, de 0 à 6. */
function circularGap(a: Pitch, b: Pitch): number {
  const gap = Math.abs(pitchClass(a) - pitchClass(b))
  return Math.min(gap, 12 - gap)
}

function drawChromatic(rng: Rng, octaves: readonly number[] = SPREAD_OCTAVES): Pitch {
  const [letter, alteration] = pick(CHROMATIC, rng)
  return pitch(letter, alteration, pick(octaves, rng))
}

/**
 * Tire une question d'entraînement.
 *
 * En mode relatif, le premier degré est exclu : il vient d'être joué comme
 * référence, le reconnaître ne demanderait aucun effort.
 *
 * En mode absolu, `previous` — la cible de la question précédente — sert à
 * imposer l'écart minimal, et l'octave est tirée au sort. Sans ces deux
 * précautions, deux demi-tons voisins dans la même octave pouvaient se
 * succéder : l'exercice se résolvait alors à l'intervalle.
 */
export function drawTrainingQuestion(
  mode: EarMode,
  tonic: Tonic,
  octave: number,
  rng: Rng = Math.random,
  previous: Pitch | null = null,
): EarQuestion {
  if (mode === 'absolute') {
    let target = drawChromatic(rng)
    // Borne dure : un tirage adverse ne doit pas boucler indéfiniment.
    for (let tries = 0; tries < 64 && previous !== null; tries += 1) {
      if (circularGap(target, previous) >= MIN_GAP) break
      target = drawChromatic(rng)
    }
    return { target, reference: null }
  }

  const scale = majorScale({ ...tonic, octave })
  const candidates = scale.slice(1, 7)
  return { target: pick(candidates, rng), reference: scale[0] ?? null }
}

/* ------------------------------------------------------------------ */
/* Statistiques                                                        */
/* ------------------------------------------------------------------ */

/** Table de log-factorielles, calculée une fois jusqu'au rang demandé. */
const LOG_FACTORIAL: number[] = [0, 0]
function logFactorial(n: number): number {
  for (let i = LOG_FACTORIAL.length; i <= n; i += 1) {
    LOG_FACTORIAL[i] = (LOG_FACTORIAL[i - 1] ?? 0) + Math.log(i)
  }
  return LOG_FACTORIAL[n] ?? 0
}

/**
 * Probabilité d'obtenir `score` bonnes réponses ou plus **par pur hasard**.
 *
 * C'est la queue d'une loi binomiale de paramètre 1/12. On la calcule en
 * logarithmes : sur 84 essais, les coefficients binomiaux dépassent largement
 * ce qu'un double peut représenter, alors que leurs logarithmes tiennent sans
 * effort.
 *
 * L'intuition se trompe lourdement ici, et dans les deux sens : avec douze
 * alternatives, 3 bonnes réponses sur 10 ont une probabilité de 0,044 d'être
 * dues au hasard — déjà significatif — tandis que 2 sur 2 font 100 % sans rien
 * prouver du tout. D'où le calcul plutôt que des paliers écrits à la main.
 */
export function chanceProbability(
  score: number,
  total: number,
  alternatives = CHROMATIC_SIZE,
): number {
  if (total <= 0) return 1
  const hit = Math.max(0, Math.min(Math.round(score), total))
  if (hit === 0) return 1

  const logP = Math.log(1 / alternatives)
  const logQ = Math.log(1 - 1 / alternatives)
  const logTotal = logFactorial(total)

  let tail = 0
  for (let j = hit; j <= total; j += 1) {
    tail += Math.exp(
      logTotal - logFactorial(j) - logFactorial(total - j) + j * logP + (total - j) * logQ,
    )
  }
  return Math.min(1, tail)
}

/* ------------------------------------------------------------------ */
/* Diagnostic : la forme des erreurs, pas leur nombre                  */
/* ------------------------------------------------------------------ */

/** Une réponse, avec tout ce qu'il faut pour la diagnostiquer après coup. */
export interface EarAttempt {
  readonly target: Pitch
  readonly answer: Pitch
  /** Cible de la question précédente : l'ancre potentielle. */
  readonly previous: Pitch | null
  /** Délai entre la fin de la note et la réponse, en millisecondes. */
  readonly latencyMs: number
}

export type ErrorShape =
  /** ±1 demi-ton : la bonne zone, ratée d'un cran. Signature de l'oreille absolue. */
  | 'semitone'
  /** Même distance à la note précédente, sens inverse : un intervalle calculé à l'envers. */
  | 'mirrored'
  /** Aucune structure. */
  | 'scattered'

/**
 * Écart signé entre la note attendue et la réponse, en demi-tons, ramené
 * dans [-5, +6]. Le signe compte : un biais constant trahit un repère mal
 * placé, là où des écarts alternés relèvent de l'imprécision.
 */
export function signedError(target: Pitch, answer: Pitch): number {
  const raw = (pitchClass(answer) - pitchClass(target) + 12) % 12
  return raw > 6 ? raw - 12 : raw
}

/**
 * Classe une erreur selon sa géométrie.
 *
 * `mirrored` mérite un mot : la réponse se situe à la même distance de la note
 * précédente que la bonne réponse, mais de l'autre côté. C'est un intervalle
 * correctement dimensionné et mal orienté — un geste que seule une stratégie
 * par intervalle peut produire. Qui nomme directement ne peut pas se tromper
 * ainsi ; il n'a rien mesuré depuis quoi que ce soit.
 *
 * Attention : chacune de ces formes survient aussi par hasard. Sur onze
 * réponses fausses possibles, deux sont à un demi-ton et une est le miroir.
 * Une occurrence isolée ne prouve rien — seule leur PART, comparée à cette
 * base de hasard, est interprétable. D'où `diagnoseAttempts`.
 */
export function classifyError(target: Pitch, answer: Pitch, previous: Pitch | null): ErrorShape {
  const offset = signedError(target, answer)
  if (offset === 0) return 'scattered'
  if (Math.abs(offset) === 1) return 'semitone'

  if (previous !== null) {
    const asked = Math.abs(signedError(previous, target))
    const played = Math.abs(signedError(previous, answer))
    if (asked === played) return 'mirrored'
  }

  return 'scattered'
}

/** Part attendue de chaque forme parmi les erreurs, si l'on répond au hasard. */
export const CHANCE_SHAPE_SHARE: Readonly<Record<ErrorShape, number>> = {
  semitone: 2 / 11,
  mirrored: 1 / 11,
  scattered: 8 / 11,
}

/**
 * Frontière entre « proche » et « lointain », en demi-tons depuis la note
 * précédente. Une tierce majeure : au-delà, comparer de tête devient coûteux.
 */
const NEAR_GAP = 4

export interface AnchorEffect {
  readonly nearRate: number
  readonly farRate: number
  readonly nearCount: number
  readonly farCount: number
  /** nearRate − farRate : positif si la proximité aide. */
  readonly delta: number
}

export interface EarDiagnosis {
  readonly total: number
  readonly correct: number
  readonly rate: number
  readonly chanceP: number
  readonly errorCount: number
  /** Part observée de chaque forme parmi les erreurs. */
  readonly shapes: Readonly<Record<ErrorShape, number>>
  /**
   * Réussite selon la distance à la note précédente. Null quand l'un des deux
   * groupes est trop maigre pour être comparé.
   */
  readonly anchor: AnchorEffect | null
  readonly medianLatencyMs: number | null
  /** Écart interquartile des latences : c'est la VARIANCE qui trahit le calcul. */
  readonly latencySpreadMs: number | null
  /** Lectures en français, de la plus informative à la moins. */
  readonly readings: readonly string[]
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0
  const position = (sorted.length - 1) * q
  const low = Math.floor(position)
  const high = Math.ceil(position)
  const lowValue = sorted[low] ?? 0
  const highValue = sorted[high] ?? lowValue
  return lowValue + (highValue - lowValue) * (position - low)
}

/** Échantillon minimal par groupe avant d'oser comparer deux taux. */
const MIN_GROUP = 6

/**
 * Diagnostique une série de réponses.
 *
 * Le score dit seulement « au-dessus du hasard ». Ce sont la forme des
 * erreurs, l'effet d'ancrage et la dispersion des latences qui disent
 * COMMENT la réponse a été trouvée.
 */
export function diagnoseAttempts(attempts: readonly EarAttempt[]): EarDiagnosis {
  const total = attempts.length
  const wrong = attempts.filter((a) => signedError(a.target, a.answer) !== 0)
  const correct = total - wrong.length
  const rate = total === 0 ? 0 : correct / total

  const counts: Record<ErrorShape, number> = { semitone: 0, mirrored: 0, scattered: 0 }
  for (const attempt of wrong) {
    counts[classifyError(attempt.target, attempt.answer, attempt.previous)] += 1
  }
  const share = (shape: ErrorShape) =>
    wrong.length === 0 ? 0 : counts[shape] / wrong.length
  const shapes = {
    semitone: share('semitone'),
    mirrored: share('mirrored'),
    scattered: share('scattered'),
  }

  // Effet d'ancrage : la prédiction testable de « je compare à la précédente ».
  const anchored = attempts.filter((a) => a.previous !== null)
  const near = anchored.filter((a) => circularGap(a.target, a.previous!) <= NEAR_GAP)
  const far = anchored.filter((a) => circularGap(a.target, a.previous!) > NEAR_GAP)
  const hits = (group: readonly EarAttempt[]) =>
    group.filter((a) => signedError(a.target, a.answer) === 0).length

  let anchor: AnchorEffect | null = null
  if (near.length >= MIN_GROUP && far.length >= MIN_GROUP) {
    const nearRate = hits(near) / near.length
    const farRate = hits(far) / far.length
    anchor = {
      nearRate,
      farRate,
      nearCount: near.length,
      farCount: far.length,
      delta: nearRate - farRate,
    }
  }

  const latencies = attempts
    .map((a) => a.latencyMs)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
  const medianLatencyMs = latencies.length === 0 ? null : quantile(latencies, 0.5)
  const latencySpreadMs =
    latencies.length < 4 ? null : quantile(latencies, 0.75) - quantile(latencies, 0.25)

  return {
    total,
    correct,
    rate,
    chanceP: chanceProbability(correct, total),
    errorCount: wrong.length,
    shapes,
    anchor,
    medianLatencyMs,
    latencySpreadMs,
    readings: buildReadings({ shapes, anchor, medianLatencyMs, latencySpreadMs, wrong: wrong.length }),
  }
}

/** Marge au-delà de laquelle une part dépasse vraiment sa base de hasard. */
const SHAPE_MARGIN = 1.6
/**
 * Latence en deçà de laquelle la réponse relève de l'accès direct.
 *
 * La littérature situe la nomination par oreille absolue autour de 500 ms.
 * On prend large : ce qui compte ici n'est pas la moyenne mais sa régularité.
 */
const QUICK_MS = 1200
/** Écart de taux à partir duquel l'effet d'ancrage se raconte. */
const ANCHOR_MARGIN = 0.15

function buildReadings(input: {
  shapes: Readonly<Record<ErrorShape, number>>
  anchor: AnchorEffect | null
  medianLatencyMs: number | null
  latencySpreadMs: number | null
  wrong: number
}): string[] {
  const readings: string[] = []
  const percent = (value: number) => `${Math.round(value * 100)} %`

  if (input.anchor !== null && input.anchor.delta >= ANCHOR_MARGIN) {
    readings.push(
      `Vous réussissez ${percent(input.anchor.nearRate)} des notes proches de la précédente, ` +
        `contre ${percent(input.anchor.farRate)} des lointaines. Cet écart est la signature ` +
        `d’un repère : vous situez la note par rapport à ce que vous venez d’entendre.`,
    )
  } else if (input.anchor !== null && Math.abs(input.anchor.delta) < ANCHOR_MARGIN) {
    readings.push(
      `Votre réussite ne dépend pas de la distance à la note précédente ` +
        `(${percent(input.anchor.nearRate)} contre ${percent(input.anchor.farRate)}). ` +
        `Vous ne vous servez donc pas de la note d’avant comme repère.`,
    )
  }

  if (input.wrong >= 8 && input.shapes.mirrored >= CHANCE_SHAPE_SHARE.mirrored * SHAPE_MARGIN) {
    readings.push(
      `${percent(input.shapes.mirrored)} de vos erreurs sont des miroirs : le bon intervalle, ` +
        `pris à l’envers. On ne se trompe ainsi qu’en mesurant depuis un repère.`,
    )
  }

  if (input.wrong >= 8 && input.shapes.semitone >= CHANCE_SHAPE_SHARE.semitone * SHAPE_MARGIN) {
    readings.push(
      `${percent(input.shapes.semitone)} de vos erreurs ne dépassent pas le demi-ton. ` +
        `Vous visez juste et manquez d’un cran : c’est un défaut de précision, pas de repère.`,
    )
  }

  if (input.medianLatencyMs !== null) {
    const seconds = (input.medianLatencyMs / 1000).toFixed(1).replace('.', ',')
    const stable = input.latencySpreadMs !== null && input.latencySpreadMs < 700
    const quick = input.medianLatencyMs < QUICK_MS

    // Trois cas, et non deux : « rapide mais irrégulier » existe, et le ranger
    // avec les réponses lentes produisait la phrase « vous répondez en 0,4 s,
    // le temps d'un calcul » — qui se contredit elle-même.
    if (quick && stable) {
      readings.push(
        `Vous répondez en ${seconds} s, et régulièrement : le nom vient sans être cherché.`,
      )
    } else if (quick) {
      readings.push(
        `Vous répondez vite — ${seconds} s en moyenne — mais très inégalement. Certaines ` +
          `notes se nomment seules, d’autres se cherchent : deux mécanismes cohabitent.`,
      )
    } else {
      readings.push(
        `Vous répondez en ${seconds} s${stable ? '' : ', avec des délais très inégaux'} — ` +
          `le temps d’un calcul plutôt que d’une reconnaissance.`,
      )
    }
  }

  return readings
}

/**
 * Corrige une réponse. L'octave est ignorée : on demande QUELLE note, pas à
 * quelle hauteur — et une même note reste la même note d'une octave à l'autre.
 */
export function isCorrectAnswer(question: EarQuestion, answer: Pitch): boolean {
  return pitchClass(question.target) === pitchClass(answer)
}
