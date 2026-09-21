/**
 * Génération des exercices de reconnaissance à l'oreille.
 *
 * Deux modes, un seul moteur :
 *
 *  - RELATIF : l'app joue la tonique de la gamme étudiée, puis une note de
 *    cette gamme. Entraînable à tout âge, et directement branché sur la
 *    progression en cours.
 *  - ABSOLU : aucune référence, tirage dans les 12 notes chromatiques. Ne
 *    fonctionne que si l'on possède l'oreille absolue.
 *
 * Le test de calibrage mesure laquelle des deux on possède. Il est informatif :
 * il ne verrouille aucun mode.
 */

import { pitch, pitchClass, type Alteration, type Letter, type Pitch } from './pitch'
import { majorScale, type Tonic } from './scales'

export type EarMode = 'relative' | 'absolute'

export interface EarQuestion {
  /** La note à reconnaître. */
  readonly target: Pitch
  /** La tonique jouée avant, ou null en mode absolu. */
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
 * En mode absolu il n'y a pas de gamme pour trancher entre do♯ et ré♭ : on
 * retient l'usage courant (dièses en montant sauf mi♭, la♭, si♭).
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

/**
 * Tire une question d'entraînement.
 *
 * En mode relatif, le premier degré est exclu : il vient d'être joué comme
 * référence, le reconnaître ne demanderait aucun effort.
 */
export function drawTrainingQuestion(
  mode: EarMode,
  tonic: Tonic,
  octave: number,
  rng: Rng = Math.random,
): EarQuestion {
  if (mode === 'absolute') {
    const [letter, alteration] = pick(CHROMATIC, rng)
    return { target: pitch(letter, alteration, octave), reference: null }
  }

  const scale = majorScale({ ...tonic, octave })
  const candidates = scale.slice(1, 7)
  return { target: pick(candidates, rng), reference: scale[0] ?? null }
}

/** Nombre de notes du test de calibrage. */
export const CALIBRATION_LENGTH = 10

/** Octaves balayées par le calibrage. */
const CALIBRATION_OCTAVES = [3, 4, 5]

/**
 * Construit le test de calibrage : des notes sans référence, dispersées sur
 * trois octaves.
 *
 * La dispersion n'est pas cosmétique. Si les notes s'enchaînaient dans une
 * seule octave, on pourrait répondre en comparant à la note précédente encore
 * en mémoire — c'est-à-dire à l'oreille relative, précisément ce que le test
 * prétend exclure. On impose donc en plus un écart minimal entre deux notes
 * consécutives.
 */
export function buildCalibration(rng: Rng = Math.random): EarQuestion[] {
  const questions: EarQuestion[] = []
  let previous: Pitch | null = null

  while (questions.length < CALIBRATION_LENGTH) {
    const [letter, alteration] = pick(CHROMATIC, rng)
    const octave = pick(CALIBRATION_OCTAVES, rng)
    const candidate = pitch(letter, alteration, octave)

    // Écart minimal d'une quarte : casse la comparaison de proche en proche.
    if (previous !== null) {
      const gap = Math.abs(pitchClass(candidate) - pitchClass(previous))
      const circular = Math.min(gap, 12 - gap)
      if (circular < 5) continue
    }

    questions.push({ target: candidate, reference: null })
    previous = candidate
  }

  return questions
}

export type EarProfile = 'absolute' | 'relative' | 'inconclusive'

export interface CalibrationVerdict {
  readonly score: number
  readonly total: number
  readonly profile: EarProfile
  readonly title: string
  readonly explanation: string
  readonly suggestedMode: EarMode
}

/**
 * Interprète un score de calibrage.
 *
 * Le hasard pur donne environ 1/12 de réussite, soit moins d'une note sur 10.
 * Un score de 8 ou plus ne s'obtient pas par chance ; un score de 3 ou moins
 * est compatible avec le hasard. Entre les deux, on ne conclut pas.
 */
export function calibrationVerdict(score: number, total = CALIBRATION_LENGTH): CalibrationVerdict {
  if (score >= 8) {
    return {
      score,
      total,
      profile: 'absolute',
      title: 'Oreille absolue probable',
      explanation:
        'Nommer des notes isolées sans référence, à ce taux, ne s’obtient pas par ' +
        'chance. Le mode absolu est un entraînement pertinent pour vous.',
      suggestedMode: 'absolute',
    }
  }

  if (score <= 3) {
    return {
      score,
      total,
      profile: 'relative',
      title: 'Oreille relative',
      explanation:
        'Ce score est compatible avec le hasard, ce qui est le cas de la très grande ' +
        'majorité des musiciens, même excellents. L’oreille relative, elle, se ' +
        'travaille à tout âge : le mode relatif est fait pour ça.',
      suggestedMode: 'relative',
    }
  }

  return {
    score,
    total,
    profile: 'inconclusive',
    title: 'Résultat non concluant',
    explanation:
      'Au-dessus du hasard, mais en dessous du seuil de l’oreille absolue. Relancez ' +
      'le test pour trancher : un seul essai de 10 notes reste fragile.',
    suggestedMode: 'relative',
  }
}

/**
 * Corrige une réponse. L'octave est ignorée : on demande QUELLE note, pas à
 * quelle hauteur — et une même note reste la même note d'une octave à l'autre.
 */
export function isCorrectAnswer(question: EarQuestion, answer: Pitch): boolean {
  return pitchClass(question.target) === pitchClass(answer)
}
