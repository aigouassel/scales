import { describe, expect, it } from 'vitest'
import { LETTERS, diatonicIndex, noteName, pitch, toMidi } from './pitch'
import { PROGRESSIONS } from './progressions'
import {
  degreeOf,
  describeKey,
  isTheoreticalKey,
  judgeWrittenNote,
  majorScale,
  naturalMinorScale,
  type Tonic,
} from './scales'

const write = (tonic: Tonic, octave = 4): string =>
  majorScale({ ...tonic, octave })
    .map((p) => noteName(p))
    .join(' ')

const T = (letter: Tonic['letter'], alteration: Tonic['alteration'] = 0): Tonic => ({
  letter,
  alteration,
})

describe('majorScale', () => {
  it('donne do majeur sans aucune altération', () => {
    expect(write(T('C'))).toBe('do ré mi fa sol la si do')
  })

  it('donne ré majeur avec fa♯ et do♯', () => {
    expect(write(T('D'))).toBe('ré mi fa♯ sol la si do♯ ré')
  })

  it.each([
    [T('E'), 'mi fa♯ sol♯ la si do♯ ré♯ mi'],
    [T('F'), 'fa sol la si♭ do ré mi fa'],
    [T('G'), 'sol la si do ré mi fa♯ sol'],
    [T('A'), 'la si do♯ ré mi fa♯ sol♯ la'],
    [T('B'), 'si do♯ ré♯ mi fa♯ sol♯ la♯ si'],
    [T('F', 1), 'fa♯ sol♯ la♯ si do♯ ré♯ mi♯ fa♯'],
    [T('D', -1), 'ré♭ mi♭ fa sol♭ la♭ si♭ do ré♭'],
    [T('E', -1), 'mi♭ fa sol la♭ si♭ do ré mi♭'],
    [T('G', -1), 'sol♭ la♭ si♭ do♭ ré♭ mi♭ fa sol♭'],
    [T('A', -1), 'la♭ si♭ do ré♭ mi♭ fa sol la♭'],
    [T('B', -1), 'si♭ do ré mi♭ fa sol la si♭'],
  ])('écrit correctement la gamme de %o', (tonic, expected) => {
    expect(write(tonic)).toBe(expected)
  })

  it('utilise chaque lettre une fois et une seule', () => {
    for (const progression of Object.values(PROGRESSIONS)) {
      for (const key of progression.keys) {
        const letters = majorScale({ ...key.tonic, octave: 4 })
          .slice(0, 7)
          .map((p) => p.letter)
        expect(new Set(letters).size, key.name).toBe(7)
        expect(letters).toHaveLength(LETTERS.length)
      }
    }
  })

  it('respecte le motif ton-ton-demi-ton-ton-ton-ton-demi-ton', () => {
    for (const progression of Object.values(PROGRESSIONS)) {
      for (const key of progression.keys) {
        const scale = majorScale({ ...key.tonic, octave: 4 })
        const steps = scale.slice(1).map((p, i) => toMidi(p) - toMidi(scale[i]!))
        expect(steps, key.name).toEqual([2, 2, 1, 2, 2, 2, 1])
      }
    }
  })

  it('monte d’un degré diatonique à chaque note', () => {
    const scale = majorScale(pitch('A', 0, 4))
    const indexes = scale.map(diatonicIndex)
    expect(indexes.map((v, i) => v - indexes[0]!)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('franchit l’octave au bon endroit', () => {
    expect(majorScale(pitch('A', 0, 4)).map((p) => p.octave)).toEqual([4, 4, 5, 5, 5, 5, 5, 5])
    expect(majorScale(pitch('C', 0, 4)).map((p) => p.octave)).toEqual([4, 4, 4, 4, 4, 4, 4, 5])
  })

  it('n’emploie jamais de double altération dans les tonalités proposées', () => {
    for (const progression of Object.values(PROGRESSIONS)) {
      for (const key of progression.keys) {
        for (const note of majorScale({ ...key.tonic, octave: 4 })) {
          expect(Math.abs(note.alteration), `${key.name} / ${noteName(note)}`).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('signale les tonalités théoriques au lieu de fausser l’orthographe', () => {
    // sol♯ majeur s'écrit correctement — mais avec un fa double dièse.
    expect(write(T('G', 1))).toBe('sol♯ la♯ si♯ do♯ ré♯ mi♯ fa𝄪 sol♯')
    expect(isTheoreticalKey(T('G', 1))).toBe(true)
    expect(isTheoreticalKey(T('A', -1))).toBe(false)
  })

  it('ne propose aucune tonalité théorique à l’apprentissage', () => {
    for (const progression of Object.values(PROGRESSIONS)) {
      for (const key of progression.keys) {
        expect(isTheoreticalKey(key.tonic), key.name).toBe(false)
      }
    }
  })
})

describe('describeKey', () => {
  it.each([
    [T('C'), 0, 'none'],
    [T('G'), 1, 'sharp'],
    [T('D'), 2, 'sharp'],
    [T('A'), 3, 'sharp'],
    [T('E'), 4, 'sharp'],
    [T('B'), 5, 'sharp'],
    [T('F', 1), 6, 'sharp'],
    [T('F'), 1, 'flat'],
    [T('B', -1), 2, 'flat'],
    [T('E', -1), 3, 'flat'],
    [T('A', -1), 4, 'flat'],
    [T('D', -1), 5, 'flat'],
    [T('G', -1), 6, 'flat'],
  ])('compte les altérations de %o', (tonic, count, kind) => {
    const key = describeKey(tonic)
    expect(key.accidentalCount).toBe(count)
    expect(key.accidentalKind).toBe(kind)
  })
})

describe('progressions', () => {
  it('ajoute exactement une altération par gamme dans le cycle des quintes', () => {
    const sharpSide = PROGRESSIONS.fifths.keys.slice(0, 7)
    expect(sharpSide.map((k) => k.accidentalCount)).toEqual([0, 1, 2, 3, 4, 5, 6])

    // Le côté des bémols repart de fa (1 bémol) et suit la même marche d'escalier.
    const flatSide = PROGRESSIONS.fifths.keys.slice(7)
    expect(flatSide.map((k) => k.accidentalCount)).toEqual([1, 2, 3, 4, 5])
  })

  it('couvre les 12 classes de hauteur dans chaque progression', () => {
    for (const progression of Object.values(PROGRESSIONS)) {
      const classes = progression.keys.map((k) => toMidi({ ...k.tonic, octave: 4 }) % 12)
      expect(new Set(classes).size, progression.label).toBe(12)
    }
  })
})

describe('degreeOf', () => {
  it('situe une note dans la gamme, orthographe comprise', () => {
    const scale = majorScale(pitch('D', 0, 4))
    expect(degreeOf(scale, pitch('F', 1, 4))).toBe(3)
    expect(degreeOf(scale, pitch('A', 0, 4))).toBe(5)
    // sol♭ sonne comme fa♯ mais ne fait pas partie de ré majeur.
    expect(degreeOf(scale, pitch('G', -1, 4))).toBeNull()
  })
})

describe('naturalMinorScale', () => {
  const writeMinor = (tonic: Tonic): string =>
    naturalMinorScale({ ...tonic, octave: 4 })
      .map((p) => noteName(p))
      .join(' ')

  it.each([
    [T('A'), 'la si do ré mi fa sol la'],
    [T('C'), 'do ré mi♭ fa sol la♭ si♭ do'],
    [T('E'), 'mi fa♯ sol la si do ré mi'],
  ])('écrit correctement la gamme mineure de %o', (tonic, expected) => {
    expect(writeMinor(tonic)).toBe(expected)
  })

  it('est la gamme majeure démarrée à son 6e degré', () => {
    // la mineur et do majeur emploient exactement les mêmes notes ; seul le
    // point de départ change, et c'est lui qui produit la couleur mineure.
    const cMajor = majorScale(pitch('C', 0, 4)).slice(0, 7).map(noteName).sort()
    const aMinor = naturalMinorScale(pitch('A', 0, 4)).slice(0, 7).map(noteName).sort()
    expect(aMinor).toEqual(cMajor)
  })

  it('diffère du majeur de trois degrés sur la même tonique', () => {
    const major = majorScale(pitch('C', 0, 4)).slice(0, 7)
    const minor = naturalMinorScale(pitch('C', 0, 4)).slice(0, 7)
    const differing = major
      .map((note, index) => (noteName(note) === noteName(minor[index]!) ? null : index + 1))
      .filter((degree): degree is number => degree !== null)
    expect(differing).toEqual([3, 6, 7])
  })
})

describe('judgeWrittenNote', () => {
  // ré majeur : ré mi fa♯ sol la si do♯ ré
  const dMajor = majorScale(pitch('D', 0, 4))

  it('accepte la note attendue', () => {
    expect(judgeWrittenNote(dMajor, 2, pitch('F', 1, 4))).toEqual({ kind: 'correct' })
  })

  it('distingue la faute d’orthographe de la fausse note', () => {
    // sol♭ sonne comme fa♯, mais la lettre sol est celle du 4e degré.
    const verdict = judgeWrittenNote(dMajor, 2, pitch('G', -1, 4))
    expect(verdict.kind).toBe('enharmonic')
    if (verdict.kind !== 'enharmonic') throw new Error('verdict inattendu')
    expect(noteName(verdict.expected)).toBe('fa♯')
    expect(verdict.clashingDegree).toBe(4)
  })

  it('signale une lettre étrangère à la gamme', () => {
    // mi majeur : le 7e degré est ré♯ ; mi♭ sonne pareil et la lettre mi est
    // celle de la tonique.
    const eMajor = majorScale(pitch('E', 0, 4))
    const verdict = judgeWrittenNote(eMajor, 6, pitch('E', -1, 5))
    expect(verdict.kind).toBe('enharmonic')
    if (verdict.kind !== 'enharmonic') throw new Error('verdict inattendu')
    expect(verdict.clashingDegree).toBe(1)
  })

  it('traite une mauvaise hauteur comme une fausse note', () => {
    expect(judgeWrittenNote(dMajor, 2, pitch('F', 0, 4)).kind).toBe('wrong')
    expect(judgeWrittenNote(dMajor, 2, pitch('G', 0, 4)).kind).toBe('wrong')
  })

  it('traite une erreur d’octave comme une fausse note, pas d’orthographe', () => {
    // Même classe de hauteur, mauvaise octave : c'est un problème de placement.
    expect(judgeWrittenNote(dMajor, 2, pitch('F', 1, 5)).kind).toBe('wrong')
  })

  it('juge correctement une gamme entière écrite en enharmonies', () => {
    const kinds = dMajor.map((_, index) => {
      const written = index === 2 ? pitch('G', -1, 4) : index === 6 ? pitch('D', -1, 5) : dMajor[index]!
      return judgeWrittenNote(dMajor, index, written).kind
    })
    expect(kinds).toEqual([
      'correct',
      'correct',
      'enharmonic',
      'correct',
      'correct',
      'correct',
      'enharmonic',
      'correct',
    ])
  })
})
