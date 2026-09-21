/**
 * Les deux ordres d'apprentissage proposés.
 *
 * Ce sont deux pédagogies distinctes, pas deux tris d'une même liste :
 * l'ordre des degrés suit l'intuition (do, ré, mi…) mais fait sauter la
 * difficulté, tandis que le cycle des quintes ajoute exactement une
 * altération par gamme et rend la structure visible.
 *
 * Les deux listes ne choisissent pas toujours la même orthographe pour une
 * même hauteur : sol♭ se lit naturellement entre fa et sol dans l'ordre des
 * degrés, alors que le cycle des quintes atteint fa♯ par le côté des dièses.
 * C'est volontaire — l'orthographe d'une tonalité dépend du chemin parcouru.
 */

import { describeKey, type ScaleKey, type Tonic } from './scales'

export type ProgressionId = 'degrees' | 'fifths'

export interface Progression {
  readonly id: ProgressionId
  readonly label: string
  readonly description: string
  readonly keys: readonly ScaleKey[]
}

const t = (letter: Tonic['letter'], alteration: Tonic['alteration'] = 0): Tonic => ({
  letter,
  alteration,
})

/** do, ré, mi, fa, sol, la, si — puis les toniques altérées. */
const DEGREE_ORDER: Tonic[] = [
  t('C'),
  t('D'),
  t('E'),
  t('F'),
  t('G'),
  t('A'),
  t('B'),
  t('D', -1),
  t('E', -1),
  t('G', -1),
  t('A', -1),
  t('B', -1),
]

/** do, sol, ré, la… côté dièses, puis fa, si♭, mi♭… côté bémols. */
const FIFTHS_ORDER: Tonic[] = [
  t('C'),
  t('G'),
  t('D'),
  t('A'),
  t('E'),
  t('B'),
  t('F', 1),
  t('F'),
  t('B', -1),
  t('E', -1),
  t('A', -1),
  t('D', -1),
]

export const PROGRESSIONS: Record<ProgressionId, Progression> = {
  degrees: {
    id: 'degrees',
    label: 'Ordre des degrés',
    description:
      'do, ré, mi, fa… L’ordre intuitif. La difficulté n’est pas graduelle : ' +
      'mi majeur compte 4 dièses, fa majeur 1 bémol.',
    keys: DEGREE_ORDER.map(describeKey),
  },
  fifths: {
    id: 'fifths',
    label: 'Cycle des quintes',
    description:
      'do, sol, ré, la… Chaque gamme ajoute une seule altération à la précédente. ' +
      'La structure devient visible au lieu d’être mémorisée.',
    keys: FIFTHS_ORDER.map(describeKey),
  },
}

export const PROGRESSION_LIST: readonly Progression[] = [
  PROGRESSIONS.degrees,
  PROGRESSIONS.fifths,
]

/** Retrouve une tonalité par son identifiant dans une progression donnée. */
export function findKey(progression: ProgressionId, id: string): ScaleKey | undefined {
  return PROGRESSIONS[progression].keys.find((key) => key.id === id)
}
