import { describe, expect, it } from 'vitest'
import { noteName, pitch, pitchClass, type Pitch } from './pitch'
import {
  CHROMATIC_SIZE,
  chanceProbability,
  classifyError,
  diagnoseAttempts,
  drawTrainingQuestion,
  isCorrectAnswer,
  signedError,
  type EarAttempt,
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

/** Distance circulaire entre deux notes, en demi-tons. */
function gap(a: Pitch, b: Pitch): number {
  const raw = Math.abs(pitchClass(a) - pitchClass(b))
  return Math.min(raw, 12 - raw)
}

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
    expect(drawTrainingQuestion('absolute', D, 4, seeded(11)).reference).toBeNull()
  })

  it('balaie les 12 classes chromatiques', () => {
    const rng = seeded(5)
    const classes = new Set<number>()
    for (let i = 0; i < 1000; i += 1) {
      classes.add(pitchClass(drawTrainingQuestion('absolute', D, 4, rng).target))
    }
    expect(classes.size).toBe(CHROMATIC_SIZE)
  })

  it('disperse les notes sur plusieurs octaves', () => {
    const rng = seeded(23)
    const octaves = new Set<number>()
    for (let i = 0; i < 200; i += 1) {
      octaves.add(drawTrainingQuestion('absolute', D, 4, rng).target.octave)
    }
    expect(octaves.size).toBeGreaterThan(1)
  })

  it('évite les notes voisines de la précédente', () => {
    // Sans cet écart, deux demi-tons consécutifs se résolvaient à l'intervalle :
    // l'exercice testait l'oreille relative en croyant tester l'absolue.
    const rng = seeded(31)
    let previous = pitch('C', 0, 4)
    for (let i = 0; i < 300; i += 1) {
      const { target } = drawTrainingQuestion('absolute', D, 4, rng, previous)
      expect(gap(target, previous)).toBeGreaterThanOrEqual(5)
      previous = target
    }
  })
})

describe('chanceProbability', () => {
  it('vaut 1 quand on n’exige aucune bonne réponse', () => {
    expect(chanceProbability(0, 10)).toBe(1)
  })

  it('reproduit la queue binomiale de paramètre 1/12', () => {
    // Valeurs de référence calculées indépendamment.
    expect(chanceProbability(3, 10)).toBeCloseTo(0.044484, 5)
    expect(chanceProbability(5, 10)).toBeCloseTo(0.00070779, 7)
    expect(chanceProbability(6, 10)).toBeCloseTo(5.233e-5, 7)
  })

  it('tient sur de grands échantillons, là où les coefficients débordent', () => {
    const p = chanceProbability(42, 84)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1e-20)
  })

  it('décroît quand le score monte', () => {
    for (let k = 1; k < 10; k += 1) {
      expect(chanceProbability(k + 1, 10)).toBeLessThan(chanceProbability(k, 10))
    }
  })
})

describe('signedError', () => {
  it('vaut zéro pour la même classe, octave comprise', () => {
    expect(signedError(pitch('C', 0, 4), pitch('C', 0, 6))).toBe(0)
  })

  it('garde le signe : trop haut est positif', () => {
    expect(signedError(pitch('C', 0, 4), pitch('C', 1, 4))).toBe(1)
    expect(signedError(pitch('C', 0, 4), pitch('B', 0, 3))).toBe(-1)
  })

  it('se replie au-delà du triton, et reste dans [-5, +6]', () => {
    // Les douze classes, prises depuis do. Au-delà du triton, l'écart change
    // de signe : « trop haut de onze » se lit « trop bas d'un », ce qui est la
    // seule lecture utile — on veut savoir de quel côté, et de combien.
    const CHROMATIC_FROM_C: [Parameters<typeof pitch>[0], Parameters<typeof pitch>[1], number][] = [
      ['C', 0, 0],
      ['C', 1, 1],
      ['D', 0, 2],
      ['E', -1, 3],
      ['E', 0, 4],
      ['F', 0, 5],
      ['F', 1, 6],
      ['G', 0, -5],
      ['A', -1, -4],
      ['A', 0, -3],
      ['B', -1, -2],
      ['B', 0, -1],
    ]

    for (const [letter, alteration, expected] of CHROMATIC_FROM_C) {
      const value = signedError(pitch('C', 0, 4), pitch(letter, alteration, 4))
      expect(value).toBe(expected)
      expect(value).toBeGreaterThanOrEqual(-5)
      expect(value).toBeLessThanOrEqual(6)
    }
  })
})

describe('classifyError', () => {
  it('reconnaît l’erreur d’un demi-ton', () => {
    expect(classifyError(pitch('G', 0, 4), pitch('A', -1, 4), null)).toBe('semitone')
    expect(classifyError(pitch('G', 0, 4), pitch('F', 1, 4), null)).toBe('semitone')
  })

  it('reconnaît le miroir : le bon intervalle, pris à l’envers', () => {
    // Précédente do, cible sol : une quinte au-dessus, donc une quarte
    // au-dessous en classes. Le miroir est fa, la quarte au-dessus — soit
    // très exactement la confusion quarte/quinte, l'erreur la plus banale de
    // l'oreille relative, et impossible pour qui nomme directement.
    const previous = pitch('C', 0, 4)
    expect(classifyError(pitch('G', 0, 4), pitch('F', 0, 4), previous)).toBe('mirrored')
  })

  it('ne voit pas de miroir sans note précédente', () => {
    expect(classifyError(pitch('G', 0, 4), pitch('F', 0, 4), null)).toBe('scattered')
  })

  it('range le reste dans les erreurs dispersées', () => {
    expect(classifyError(pitch('C', 0, 4), pitch('F', 1, 4), pitch('C', 0, 4))).toBe('scattered')
  })

  it('ne classe jamais une bonne réponse comme demi-ton', () => {
    expect(classifyError(pitch('C', 0, 4), pitch('C', 0, 5), null)).toBe('scattered')
  })
})

describe('diagnoseAttempts', () => {
  const attempt = (
    target: string,
    answer: string,
    previous: string | null,
    latencyMs = 1000,
  ): EarAttempt => {
    const parse = (name: string) => {
      const letter = name[0] as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
      const alteration = name.length > 1 ? (name[1] === '#' ? 1 : -1) : 0
      return pitch(letter, alteration, 4)
    }
    return {
      target: parse(target),
      answer: parse(answer),
      previous: previous === null ? null : parse(previous),
      latencyMs,
    }
  }

  it('compte les bonnes réponses en ignorant l’octave', () => {
    const result = diagnoseAttempts([
      { target: pitch('C', 0, 4), answer: pitch('C', 0, 5), previous: null, latencyMs: 800 },
    ])
    expect(result.correct).toBe(1)
    expect(result.rate).toBe(1)
  })

  it('mesure l’effet d’ancrage : réussite selon la distance à la précédente', () => {
    // Six notes proches, toutes justes ; six lointaines, toutes fausses.
    // C'est exactement la signature d'une réponse calculée depuis un repère.
    const near = Array.from({ length: 6 }, () => attempt('D', 'D', 'C'))
    const far = Array.from({ length: 6 }, () => attempt('F#', 'A', 'C'))
    const result = diagnoseAttempts([...near, ...far])

    expect(result.anchor).not.toBeNull()
    expect(result.anchor!.nearRate).toBe(1)
    expect(result.anchor!.farRate).toBe(0)
    expect(result.anchor!.delta).toBe(1)
    expect(result.readings.join(' ')).toContain('repère')
  })

  it('ne compare pas deux groupes trop maigres', () => {
    const result = diagnoseAttempts([attempt('D', 'D', 'C'), attempt('F#', 'A', 'C')])
    expect(result.anchor).toBeNull()
  })

  it('dit quand la distance ne change rien', () => {
    const near = Array.from({ length: 6 }, () => attempt('D', 'D', 'C'))
    const far = Array.from({ length: 6 }, () => attempt('F#', 'F#', 'C'))
    const result = diagnoseAttempts([...near, ...far])
    expect(result.anchor!.delta).toBe(0)
    expect(result.readings.join(' ')).toContain('ne dépend pas')
  })

  it('repère une majorité d’erreurs au demi-ton', () => {
    const errors = Array.from({ length: 10 }, () => attempt('G', 'G#', null))
    const result = diagnoseAttempts(errors)
    expect(result.shapes.semitone).toBe(1)
    expect(result.readings.join(' ')).toContain('demi-ton')
  })

  it('distingue une latence stable d’une latence erratique', () => {
    const quick = Array.from({ length: 8 }, () => attempt('C', 'C', null, 700))
    expect(diagnoseAttempts(quick).readings.join(' ')).toContain('sans être cherché')

    const erratic = [400, 4200, 600, 5100, 800, 3900, 700, 4800].map((ms) =>
      attempt('C', 'C', null, ms),
    )
    expect(diagnoseAttempts(erratic).readings.join(' ')).toContain('calcul')
  })

  it('ne qualifie jamais de « calcul » une réponse rapide', () => {
    // Le cas mixte — vite, mais irrégulièrement — n'existait pas : il tombait
    // dans la branche « lent » et produisait « vous répondez en 0,4 s, le temps
    // d'un calcul », une phrase qui se contredit elle-même.
    const mixed = [200, 250, 300, 350, 1500, 1600, 1700, 1800].map((ms) =>
      attempt('C', 'C', null, ms),
    )
    const readings = diagnoseAttempts(mixed).readings.join(' ')
    expect(readings).toContain('deux mécanismes cohabitent')
    expect(readings).not.toContain('calcul')
  })

  it('reste muet quand il n’y a rien à dire', () => {
    expect(diagnoseAttempts([]).readings).toHaveLength(0)
    expect(diagnoseAttempts([]).total).toBe(0)
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

