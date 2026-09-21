/**
 * Correspondance entre le clavier de l'ordinateur et celui du piano.
 *
 * On écoute `event.code` et non `event.key`. `code` désigne la POSITION
 * PHYSIQUE de la touche, indépendamment de la disposition installée : la
 * touche que l'AZERTY nomme « q » se trouve là où le QWERTY met « a », et
 * remonte donc comme `KeyA`. Raisonner en position, c'est garantir que la
 * main garde la même forme quelle que soit la disposition — et c'est bien
 * une géométrie qu'on apprend, pas des lettres.
 *
 * Les touches situées au-dessus des intervalles mi–fa et si–do restent
 * délibérément muettes : le piano n'y a pas de touche noire non plus.
 */

import { pitch, type Alteration, type Letter, type Pitch } from '@scales/music-theory'

export interface KeySlot {
  /** Code physique, au sens de KeyboardEvent.code. */
  readonly code: string
  /** Libellé AZERTY, utilisé tant que le navigateur n'en fournit pas un. */
  readonly azertyLabel: string
  readonly color: 'white' | 'black'
  /** Lettre et octave de la note ; l'altération dépend de la tonalité. */
  readonly letter: Letter
  readonly octave: number
  /** Altération en écriture par dièses. */
  readonly sharpAlteration: Alteration
  /** Même son, écrit par bémols : do♯ devient ré♭. */
  readonly flatLetter: Letter
  readonly flatAlteration: Alteration
  /** Rang de la touche blanche, ou rang de la blanche précédente pour une noire. */
  readonly whiteIndex: number
}

const white = (
  code: string,
  azertyLabel: string,
  letter: Letter,
  octave: number,
  whiteIndex: number,
): KeySlot => ({
  code,
  azertyLabel,
  color: 'white',
  letter,
  octave,
  sharpAlteration: 0,
  flatLetter: letter,
  flatAlteration: 0,
  whiteIndex,
})

const black = (
  code: string,
  azertyLabel: string,
  letter: Letter,
  flatLetter: Letter,
  octave: number,
  whiteIndex: number,
): KeySlot => ({
  code,
  azertyLabel,
  color: 'black',
  letter,
  octave,
  sharpAlteration: 1,
  flatLetter,
  flatAlteration: -1,
  whiteIndex,
})

/**
 * Deux rangées, do4 à ré5.
 *
 *     z    e         t    y    u         o
 *    do♯  ré♯       fa♯  sol♯ la♯       do♯
 *     q    s    d    f    g    h    j    k    l
 *    do4  ré4  mi4  fa4  sol4 la4  si4  do5  ré5
 */
export const KEY_SLOTS: readonly KeySlot[] = [
  white('KeyA', 'q', 'C', 4, 0),
  black('KeyW', 'z', 'C', 'D', 4, 0),
  white('KeyS', 's', 'D', 4, 1),
  black('KeyE', 'e', 'D', 'E', 4, 1),
  white('KeyD', 'd', 'E', 4, 2),
  // KeyR (« r ») : pas de touche noire entre mi et fa.
  white('KeyF', 'f', 'F', 4, 3),
  black('KeyT', 't', 'F', 'G', 4, 3),
  white('KeyG', 'g', 'G', 4, 4),
  black('KeyY', 'y', 'G', 'A', 4, 4),
  white('KeyH', 'h', 'A', 4, 5),
  black('KeyU', 'u', 'A', 'B', 4, 5),
  white('KeyJ', 'j', 'B', 4, 6),
  // KeyI (« i ») : pas de touche noire entre si et do.
  white('KeyK', 'k', 'C', 5, 7),
  black('KeyO', 'o', 'C', 'D', 5, 7),
  white('KeyL', 'l', 'D', 5, 8),
]

/** Touches physiques volontairement inertes, affichées comme telles. */
export const DEAD_KEYS: readonly { code: string; azertyLabel: string; whiteIndex: number }[] = [
  { code: 'KeyR', azertyLabel: 'r', whiteIndex: 2 },
  { code: 'KeyI', azertyLabel: 'i', whiteIndex: 6 },
]

export const KEY_SLOTS_BY_CODE: ReadonlyMap<string, KeySlot> = new Map(
  KEY_SLOTS.map((slot) => [slot.code, slot]),
)

export const WHITE_KEY_COUNT = KEY_SLOTS.filter((slot) => slot.color === 'white').length

/**
 * Note produite par une touche, dans l'orthographe demandée.
 *
 * Une touche noire n'a pas de nom absolu : la même touche est do♯ en ré
 * majeur et ré♭ en la♭ majeur. C'est la tonalité en cours qui tranche.
 */
export function slotToPitch(slot: KeySlot, preferFlats: boolean): Pitch {
  if (slot.color === 'white') return pitch(slot.letter, 0, slot.octave)
  return preferFlats
    ? pitch(slot.flatLetter, slot.flatAlteration, slot.octave)
    : pitch(slot.letter, slot.sharpAlteration, slot.octave)
}

/**
 * Libellés réels des touches, quand le navigateur sait les donner.
 * L'API Keyboard Map n'existe que sur Chromium ; ailleurs on garde l'AZERTY.
 */
export async function readKeyboardLabels(): Promise<Map<string, string> | null> {
  const keyboard = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } })
    .keyboard
  if (keyboard?.getLayoutMap === undefined) return null
  try {
    return await keyboard.getLayoutMap()
  } catch {
    return null
  }
}
