/**
 * Représentation d'une hauteur de note.
 *
 * Le choix central du projet : une note n'est PAS un numéro MIDI. 61 désigne
 * à la fois do♯ et ré♭, alors qu'en ré majeur écrire ré♭ est une faute. On
 * conserve donc l'orthographe — lettre + altération + octave — et le MIDI
 * n'est calculé qu'au moment de produire du son.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = (typeof LETTERS)[number]

/** Demi-tons de déplacement : -2 double bémol … +2 double dièse. */
export type Alteration = -2 | -1 | 0 | 1 | 2

export interface Pitch {
  readonly letter: Letter
  readonly alteration: Alteration
  /** Octave scientifique : do4 = do central (MIDI 60). */
  readonly octave: number
}

/** Distance en demi-tons entre do et chaque lettre naturelle. */
const SEMITONES_FROM_C: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const FRENCH_NAMES: Record<Letter, string> = {
  C: 'do',
  D: 'ré',
  E: 'mi',
  F: 'fa',
  G: 'sol',
  A: 'la',
  B: 'si',
}

const ALTERATION_SYMBOLS: Record<Alteration, string> = {
  [-2]: '𝄫',
  [-1]: '♭',
  [0]: '',
  [1]: '♯',
  [2]: '𝄪',
}

/** Suffixe VexFlow pour une altération ('' = aucune, 'n' = bécarre explicite). */
const VEXFLOW_ACCIDENTALS: Record<Alteration, string> = {
  [-2]: 'bb',
  [-1]: 'b',
  [0]: 'n',
  [1]: '#',
  [2]: '##',
}

export function pitch(letter: Letter, alteration: Alteration, octave: number): Pitch {
  return { letter, alteration, octave }
}

/**
 * Index diatonique : compte les lettres, en ignorant les altérations.
 * C'est la coordonnée verticale d'une note sur la portée — do♯4 et do♭4
 * s'écrivent sur la même ligne, donc partagent le même index.
 */
export function diatonicIndex(p: Pick<Pitch, 'letter' | 'octave'>): number {
  return p.octave * 7 + LETTERS.indexOf(p.letter)
}

/** Reconstruit lettre et octave depuis un index diatonique. */
export function fromDiatonicIndex(index: number): { letter: Letter; octave: number } {
  const octave = Math.floor(index / 7)
  const letter = LETTERS[index - octave * 7]
  if (letter === undefined) throw new Error(`Index diatonique invalide : ${index}`)
  return { letter, octave }
}

/** Numéro MIDI : do4 (do central) = 60. */
export function toMidi(p: Pitch): number {
  return 12 * (p.octave + 1) + SEMITONES_FROM_C[p.letter] + p.alteration
}

/** Classe de hauteur, 0 = do. Deux notes enharmoniques la partagent. */
export function pitchClass(p: Pitch): number {
  return ((toMidi(p) % 12) + 12) % 12
}

/** Fréquence en hertz, diapason la3 = 440 Hz. */
export function toFrequency(p: Pitch): number {
  return 440 * Math.pow(2, (toMidi(p) - 69) / 12)
}

/** Même note, orthographe comprise : ré♭ ≠ do♯. */
export function isSamePitch(a: Pitch, b: Pitch): boolean {
  return a.letter === b.letter && a.alteration === b.alteration && a.octave === b.octave
}

/** Même son, quelle que soit l'orthographe et l'octave. Sert à corriger l'oreille. */
export function isSamePitchClass(a: Pitch, b: Pitch): boolean {
  return pitchClass(a) === pitchClass(b)
}

/** « fa♯ » — nom français, sans octave. */
export function noteName(p: Pitch): string {
  return FRENCH_NAMES[p.letter] + ALTERATION_SYMBOLS[p.alteration]
}

/** « fa♯4 » — nom français avec octave. */
export function fullNoteName(p: Pitch): string {
  return `${noteName(p)}${p.octave}`
}

/** Clé VexFlow, par exemple « c#/4 ». */
export function toVexflowKey(p: Pitch): string {
  return `${p.letter.toLowerCase()}/${p.octave}`
}

/** Symbole d'altération attendu par VexFlow, ou null si aucune à graver. */
export function toVexflowAccidental(p: Pitch, includeNatural: boolean): string | null {
  if (p.alteration === 0) return includeNatural ? VEXFLOW_ACCIDENTALS[0] : null
  return VEXFLOW_ACCIDENTALS[p.alteration]
}

/** Altération naturelle d'une note écrite sur une ligne donnée, pour un son voulu. */
export function alterationFor(letter: Letter, octave: number, targetMidi: number): number {
  const natural = 12 * (octave + 1) + SEMITONES_FROM_C[letter]
  return targetMidi - natural
}

/** Une altération au-delà du double dièse/bémol n'est pas notable ici. */
export function isWritableAlteration(value: number): value is Alteration {
  return Number.isInteger(value) && value >= -2 && value <= 2
}
