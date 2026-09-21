import { describe, expect, it } from 'vitest'
import {
  diatonicIndex,
  fromDiatonicIndex,
  fullNoteName,
  isSamePitch,
  isSamePitchClass,
  pitch,
  toFrequency,
  toMidi,
} from './pitch'

describe('toMidi', () => {
  it('place le do central sur 60', () => {
    expect(toMidi(pitch('C', 0, 4))).toBe(60)
    expect(toMidi(pitch('A', 0, 4))).toBe(69)
  })

  it('applique les altérations', () => {
    expect(toMidi(pitch('C', 1, 4))).toBe(61)
    expect(toMidi(pitch('D', -1, 4))).toBe(61)
  })
})

describe('orthographe', () => {
  it('distingue do♯ de ré♭ alors qu’ils sonnent pareil', () => {
    const cSharp = pitch('C', 1, 4)
    const dFlat = pitch('D', -1, 4)
    expect(isSamePitch(cSharp, dFlat)).toBe(false)
    expect(isSamePitchClass(cSharp, dFlat)).toBe(true)
  })

  it('pose do♯ et do♭ sur la même ligne de portée', () => {
    expect(diatonicIndex(pitch('C', 1, 4))).toBe(diatonicIndex(pitch('C', -1, 4)))
    expect(diatonicIndex(pitch('C', 0, 4))).not.toBe(diatonicIndex(pitch('D', 0, 4)))
  })

  it('ignore l’octave dans la comparaison de classe', () => {
    expect(isSamePitchClass(pitch('F', 1, 3), pitch('F', 1, 5))).toBe(true)
  })
})

describe('index diatonique', () => {
  it('fait l’aller-retour sans perte', () => {
    for (let index = 21; index < 60; index += 1) {
      expect(diatonicIndex(fromDiatonicIndex(index))).toBe(index)
    }
  })
})

describe('toFrequency', () => {
  it('accorde le la3 à 440 Hz', () => {
    expect(toFrequency(pitch('A', 0, 4))).toBeCloseTo(440)
  })

  it('double la fréquence à l’octave', () => {
    expect(toFrequency(pitch('A', 0, 5))).toBeCloseTo(880)
  })
})

describe('fullNoteName', () => {
  it('affiche le nom français avec octave', () => {
    expect(fullNoteName(pitch('F', 1, 4))).toBe('fa♯4')
    expect(fullNoteName(pitch('B', -1, 3))).toBe('si♭3')
  })
})
