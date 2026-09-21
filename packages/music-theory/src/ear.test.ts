import { describe, expect, it } from 'vitest'
import { noteName, pitch, pitchClass } from './pitch'
import {
  CALIBRATION_LENGTH,
  buildCalibration,
  calibrationVerdict,
  drawTrainingQuestion,
  isCorrectAnswer,
} from './ear'
import { majorScale, type Tonic } from './scales'

/** Générateur déterministe, pour que les tests ne dépendent pas du hasard. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const D: Tonic = { letter: 'D', alteration: 0 }

describe('drawTrainingQuestion — mode relatif', () => {
  it('joue la tonique comme référence', () => {
    const question = drawTrainingQuestion('relative', D, 4, seeded(1))
    expect(question.reference && noteName(question.reference)).toBe('ré')
  })

  it('ne tire que dans la gamme étudiée, et jamais la tonique elle-même', () => {
    const rng = seeded(7)
    const scale = majorScale({ ...D, octave: 4 })
    const inScale = new Set(scale.slice(1, 7).map(noteName))

    for (let i = 0; i < 200; i += 1) {
      const { target } = drawTrainingQuestion('relative', D, 4, rng)
      expect(inScale.has(noteName(target))).toBe(true)
      expect(noteName(target)).not.toBe('ré')
    }
  })

  it('finit par proposer chacun des six degrés restants', () => {
    const rng = seeded(3)
    const seen = new Set<string>()
    for (let i = 0; i < 500; i += 1) {
      seen.add(noteName(drawTrainingQuestion('relative', D, 4, rng).target))
    }
    expect(seen).toEqual(new Set(['mi', 'fa♯', 'sol', 'la', 'si', 'do♯']))
  })
})

describe('drawTrainingQuestion — mode absolu', () => {
  it('ne joue aucune référence', () => {
    const question = drawTrainingQuestion('absolute', D, 4, seeded(11))
    expect(question.reference).toBeNull()
  })

  it('balaie les 12 classes chromatiques', () => {
    const rng = seeded(5)
    const classes = new Set<number>()
    for (let i = 0; i < 1000; i += 1) {
      classes.add(pitchClass(drawTrainingQuestion('absolute', D, 4, rng).target))
    }
    expect(classes.size).toBe(12)
  })
})

describe('buildCalibration', () => {
  const questions = buildCalibration(seeded(42))

  it('produit le bon nombre de notes, sans référence', () => {
    expect(questions).toHaveLength(CALIBRATION_LENGTH)
    expect(questions.every((q) => q.reference === null)).toBe(true)
  })

  it('espace les notes d’au moins une quarte', () => {
    // Sans cet écart, on répondrait en comparant à la note précédente —
    // c'est-à-dire à l'oreille relative, ce que le test doit exclure.
    for (let i = 1; i < questions.length; i += 1) {
      const gap = Math.abs(pitchClass(questions[i]!.target) - pitchClass(questions[i - 1]!.target))
      expect(Math.min(gap, 12 - gap)).toBeGreaterThanOrEqual(5)
    }
  })

  it('disperse les notes sur plusieurs octaves', () => {
    expect(new Set(questions.map((q) => q.target.octave)).size).toBeGreaterThan(1)
  })
})

describe('calibrationVerdict', () => {
  it('conclut à l’oreille absolue au-delà de 8 sur 10', () => {
    expect(calibrationVerdict(9).profile).toBe('absolute')
    expect(calibrationVerdict(9).suggestedMode).toBe('absolute')
  })

  it('conclut à l’oreille relative quand le score est compatible avec le hasard', () => {
    expect(calibrationVerdict(1).profile).toBe('relative')
    expect(calibrationVerdict(3).profile).toBe('relative')
  })

  it('ne tranche pas dans la zone intermédiaire', () => {
    expect(calibrationVerdict(5).profile).toBe('inconclusive')
  })
})

describe('isCorrectAnswer', () => {
  const question = { target: pitch('F', 1, 4), reference: null }

  it('ignore l’octave', () => {
    expect(isCorrectAnswer(question, pitch('F', 1, 5))).toBe(true)
  })

  it('accepte l’enharmonie : on désigne une touche, pas une orthographe', () => {
    expect(isCorrectAnswer(question, pitch('G', -1, 4))).toBe(true)
  })

  it('refuse une autre note', () => {
    expect(isCorrectAnswer(question, pitch('F', 0, 4))).toBe(false)
  })
})
