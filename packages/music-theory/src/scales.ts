/**
 * Génération des gammes majeures.
 *
 * Aucune gamme n'est écrite en dur : elles sont déduites de deux règles.
 *
 *  1. Le motif d'intervalles ton-ton-demi-ton-ton-ton-ton-demi-ton, qui fixe
 *     le SON de chaque degré.
 *  2. Chaque lettre apparaît une fois et une seule, ce qui fixe son ÉCRITURE.
 *
 * En ré, la règle 1 impose un son à 4 demi-tons de la tonique pour le 3e
 * degré ; la règle 2 impose la lettre fa. Il ne reste qu'une possibilité :
 * fa♯. Écrire sol♭ sonnerait pareil mais réutiliserait la lettre sol.
 */

import {
  LETTERS,
  alterationFor,
  diatonicIndex,
  isWritableAlteration,
  noteName,
  toMidi,
  type Alteration,
  type Letter,
  type Pitch,
} from './pitch'

/** Intervalles successifs de la gamme majeure, en demi-tons. */
export const MAJOR_PATTERN = [2, 2, 1, 2, 2, 2, 1] as const

/**
 * Gamme mineure naturelle : le même cycle de sept intervalles, démarré au 6e
 * degré du majeur. C'est ce décalage — et lui seul — qui produit la couleur
 * dite « mineure ». L'application n'enseigne pas les gammes mineures ; ce
 * motif sert à faire entendre la différence dans le lexique.
 */
export const NATURAL_MINOR_PATTERN = [2, 1, 2, 2, 1, 2, 2] as const

/** Tonique d'une gamme : une note sans octave. */
export interface Tonic {
  readonly letter: Letter
  readonly alteration: Alteration
}

export interface ScaleKey {
  /** Identifiant stable, utilisable en clé de stockage : « D », « Bb », « F# ». */
  readonly id: string
  readonly tonic: Tonic
  /** « ré majeur » */
  readonly name: string
  /** Nombre d'altérations à l'armure. */
  readonly accidentalCount: number
  /** Sens des altérations : dièses, bémols, ou aucune. */
  readonly accidentalKind: 'sharp' | 'flat' | 'none'
}

/**
 * Construit une gamme de sept degrés sur une tonique, en suivant un motif
 * d'intervalles : 8 notes, tonique répétée à l'octave supérieure.
 *
 * Les deux règles sont appliquées ici, et elles sont indépendantes du motif :
 * le motif fixe le son de chaque degré, la contrainte « une lettre par degré »
 * fixe son écriture.
 */
export function buildScale(tonic: Pitch, pattern: readonly number[]): Pitch[] {
  const scale: Pitch[] = [tonic]
  const tonicLetterIndex = LETTERS.indexOf(tonic.letter)
  let midi = toMidi(tonic)

  for (let step = 0; step < pattern.length; step += 1) {
    midi += pattern[step] as number

    // Règle 2 : la lettre suivante, quoi qu'il arrive.
    const letterIndex = tonicLetterIndex + step + 1
    const letter = LETTERS[letterIndex % 7] as Letter
    const octave = tonic.octave + Math.floor(letterIndex / 7)

    // Règle 1 : l'altération est ce qui reste à ajuster pour atteindre le son.
    const alteration = alterationFor(letter, octave, midi)
    if (!isWritableAlteration(alteration)) {
      throw new Error(
        `La gamme de ${noteName(tonic)} exige une altération non notable ` +
          `(${alteration > 0 ? '+' : ''}${alteration} demi-tons sur ${letter}).`,
      )
    }

    scale.push({ letter, alteration, octave })
  }

  return scale
}

/** Gamme majeure : 8 notes, tonique répétée à l'octave supérieure. */
export function majorScale(tonic: Pitch): Pitch[] {
  return buildScale(tonic, MAJOR_PATTERN)
}

/** Gamme mineure naturelle, employée par le lexique pour la comparaison. */
export function naturalMinorScale(tonic: Pitch): Pitch[] {
  return buildScale(tonic, NATURAL_MINOR_PATTERN)
}

/** Décrit une tonalité : nom, nombre et sens des altérations. */
export function describeKey(tonic: Tonic): ScaleKey {
  const scale = majorScale({ ...tonic, octave: 4 })
  // On ignore la dernière note : c'est la tonique répétée.
  const degrees = scale.slice(0, 7)
  const sharps = degrees.filter((p) => p.alteration > 0).length
  const flats = degrees.filter((p) => p.alteration < 0).length

  return {
    id: tonicId(tonic),
    tonic,
    name: `${noteName({ ...tonic, octave: 0 })} majeur`,
    accidentalCount: sharps + flats,
    accidentalKind: sharps > 0 ? 'sharp' : flats > 0 ? 'flat' : 'none',
  }
}

/**
 * Une tonalité est dite « théorique » quand sa gamme exige une double
 * altération : sol♯ majeur s'écrit correctement, mais avec un fa double dièse
 * que personne n'emploie en pratique — on écrit la♭ majeur à la place.
 *
 * On ne l'interdit pas, on la signale : les 12 tonalités proposées par
 * l'application sont précisément celles qui ne le sont pas.
 */
export function isTheoreticalKey(tonic: Tonic): boolean {
  return majorScale({ ...tonic, octave: 4 }).some((p) => Math.abs(p.alteration) > 1)
}

/** « F# », « Bb », « C » — stable et lisible en stockage. */
export function tonicId(tonic: Tonic): string {
  const suffix =
    tonic.alteration > 0 ? '#'.repeat(tonic.alteration) : 'b'.repeat(-tonic.alteration)
  return tonic.letter + suffix
}

/**
 * Transpose une gamme pour qu'elle démarre dans une octave donnée, en gardant
 * l'orthographe intacte. Sert à caler n'importe quelle gamme sur la portée.
 */
export function scaleStartingAt(tonic: Tonic, octave: number): Pitch[] {
  return majorScale({ ...tonic, octave })
}

/** Les 7 degrés de la gamme, nommés. */
export const DEGREE_NAMES = [
  'tonique',
  'sus-tonique',
  'médiante',
  'sous-dominante',
  'dominante',
  'sus-dominante',
  'sensible',
] as const

/** Position d'une note dans une gamme (1 = tonique), ou null si hors gamme. */
export function degreeOf(scale: readonly Pitch[], note: Pitch): number | null {
  const index = scale
    .slice(0, 7)
    .findIndex((p) => p.letter === note.letter && p.alteration === note.alteration)
  return index === -1 ? null : index + 1
}

/** Étendue diatonique couverte par une gamme, bornes comprises. */
export function scaleRange(scale: readonly Pitch[]): { low: number; high: number } {
  const indexes = scale.map(diatonicIndex)
  return { low: Math.min(...indexes), high: Math.max(...indexes) }
}
