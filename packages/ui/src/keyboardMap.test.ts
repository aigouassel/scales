import { describe, expect, it } from 'vitest'
import { noteName, pitchClass, toMidi } from '@scales/music-theory'
import {
  DEAD_KEYS,
  KEY_SLOTS,
  KEY_SLOTS_BY_CODE,
  OCTAVE_SHIFT,
  WHITE_KEY_COUNT,
  keyboardRange,
  slotToPitch,
} from './keyboardMap'

describe('KEY_SLOTS', () => {
  it('couvre do4 à ré5 sans trou ni doublon', () => {
    const midis = KEY_SLOTS.map((slot) => toMidi(slotToPitch(slot, false)))
    const sorted = [...midis].sort((a, b) => a - b)
    expect(new Set(midis).size).toBe(KEY_SLOTS.length)
    expect(sorted[0]).toBe(toMidi({ letter: 'C', alteration: 0, octave: 4 }))
    expect(sorted[sorted.length - 1]).toBe(toMidi({ letter: 'D', alteration: 0, octave: 5 }))

    // Chromatique : chaque touche est un demi-ton au-dessus de la précédente.
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]! - sorted[i - 1]!).toBe(1)
    }
  })

  it('laisse muettes les positions où le piano n’a pas de touche noire', () => {
    // mi–fa et si–do sont séparés d'un demi-ton : rien à intercaler.
    for (const dead of DEAD_KEYS) {
      expect(KEY_SLOTS_BY_CODE.has(dead.code)).toBe(false)
    }
  })

  it('compte neuf touches blanches', () => {
    expect(WHITE_KEY_COUNT).toBe(9)
  })
})

describe('slotToPitch — orthographe', () => {
  const black = KEY_SLOTS.find((slot) => slot.code === 'KeyW')!

  it('écrit une noire en dièse ou en bémol selon la tonalité', () => {
    expect(noteName(slotToPitch(black, false))).toBe('do♯')
    expect(noteName(slotToPitch(black, true))).toBe('ré♭')
  })

  it('désigne le même son dans les deux orthographes', () => {
    expect(toMidi(slotToPitch(black, false))).toBe(toMidi(slotToPitch(black, true)))
  })
})

describe('slotToPitch — décalage d’octave', () => {
  it('monte d’exactement douze demi-tons', () => {
    for (const slot of KEY_SLOTS) {
      const low = slotToPitch(slot, false)
      const high = slotToPitch(slot, false, OCTAVE_SHIFT)
      expect(toMidi(high) - toMidi(low)).toBe(12)
    }
  })

  it('ne change rien à l’orthographe : do♯ reste do♯ une octave plus haut', () => {
    // C'est le même degré, joué ailleurs. Transposer n'est pas réécrire.
    for (const slot of KEY_SLOTS) {
      for (const flats of [false, true]) {
        const low = slotToPitch(slot, flats)
        const high = slotToPitch(slot, flats, OCTAVE_SHIFT)
        expect(high.letter).toBe(low.letter)
        expect(high.alteration).toBe(low.alteration)
        expect(noteName(high)).toBe(noteName(low))
      }
    }
  })

  it('conserve la classe de hauteur, donc le surlignage de la gamme', () => {
    // La gamme est repérée par le son, octave comprise : une touche surlignée
    // en bas doit l'être en haut, sinon Maj éteindrait les repères.
    for (const slot of KEY_SLOTS) {
      expect(pitchClass(slotToPitch(slot, false, OCTAVE_SHIFT))).toBe(
        pitchClass(slotToPitch(slot, false)),
      )
    }
  })

  it('ne décale rien par défaut', () => {
    for (const slot of KEY_SLOTS) {
      expect(slotToPitch(slot, false).octave).toBe(slot.octave)
    }
  })
})

describe('keyboardRange', () => {
  it('annonce do4 – ré5 au repos', () => {
    const { lowest, highest } = keyboardRange()
    expect(`${noteName(lowest)}${lowest.octave}`).toBe('do4')
    expect(`${noteName(highest)}${highest.octave}`).toBe('ré5')
  })

  it('annonce do5 – ré6 avec Maj', () => {
    const { lowest, highest } = keyboardRange(OCTAVE_SHIFT)
    expect(`${noteName(lowest)}${lowest.octave}`).toBe('do5')
    expect(`${noteName(highest)}${highest.octave}`).toBe('ré6')
  })

  it('couvre, les deux positions réunies, un peu plus de deux octaves', () => {
    const low = keyboardRange().lowest
    const high = keyboardRange(OCTAVE_SHIFT).highest
    expect(toMidi(high) - toMidi(low)).toBe(26)
  })
})
