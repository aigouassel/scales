import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  degreeOf,
  diagnoseAttempts,
  drawTrainingQuestion,
  isCorrectAnswer,
  majorScale,
  noteName,
  type EarAttempt,
  type EarMode,
  type EarQuestion,
  type Pitch,
  type ScaleKey,
} from '@scales/music-theory'
import { notePlayer } from '@scales/audio'
import { Piano } from '@scales/ui'
import { usePersistentState } from '../usePersistentState'

export interface EarSectionProps {
  scaleKey: ScaleKey
  mode: EarMode
  onModeChange: (mode: EarMode) => void
}

type Phase = 'idle' | 'asking' | 'answered'

/** Durée de la note à reconnaître, en secondes. */
const NOTE_DURATION = 0.9
/** Délai entre la tonique de référence et la note à reconnaître. */
const TRAINING_INTERVAL = 1.1
/** Durée de l'agrégat de masquage. Voir `playMask`. */
const MASK_DURATION = 2
/**
 * Silence avant que l'agrégat démarre.
 *
 * Enchaîné sur la note qu'on vient de jouer pour répondre, il donne
 * l'impression d'être coupé la parole. Cette respiration sépare nettement
 * « ce que j'ai répondu » de « on efface, on recommence ».
 */
const MASK_LEAD = 1
/** Silence entre la fin de l'agrégat et la note : assez pour les séparer. */
const MASK_GAP = 0.25

export function EarSection({ scaleKey, mode, onModeChange }: EarSectionProps) {
  const scale = useMemo(() => majorScale({ ...scaleKey.tonic, octave: 4 }), [scaleKey])
  const preferFlats = scaleKey.accidentalKind === 'flat'

  const [phase, setPhase] = useState<Phase>('idle')
  const [question, setQuestion] = useState<EarQuestion | null>(null)
  const [answer, setAnswer] = useState<Pitch | null>(null)
  const [score, setScore] = useState({ asked: 0, correct: 0 })
  const [guided, setGuided] = useState(true)
  /**
   * Masquage optionnel, en mode absolu.
   *
   * Sans lui, la note précédente — et surtout celle qu'on vient de jouer
   * soi-même pour répondre, dont on connaît donc le nom — reste disponible en
   * mémoire et sert de diapason. L'agrégat efface les deux d'un coup.
   */
  const [masked, setMasked] = usePersistentState<boolean>('earMask', false)

  /**
   * Toutes les réponses de la série en cours, gardées pour le diagnostic.
   * Le score dit « au-dessus du hasard » ; seule la forme des erreurs dit
   * comment la réponse a été trouvée.
   */
  const [attempts, setAttempts] = useState<EarAttempt[]>([])
  const [diagnosisShown, setDiagnosisShown] = useState(false)

  /** Cible de la question précédente : l'ancre potentielle, et l'objet du test. */
  const previousTarget = useRef<Pitch | null>(null)
  /** Instant où la note à reconnaître a commencé à sonner — origine de la latence. */
  const askedAt = useRef<number>(0)

  const maskable = mode === 'absolute'

  /**
   * Joue la question.
   *
   * La latence se compte depuis le DÉBUT de la note à reconnaître, pas depuis
   * sa fin : répondre avant qu'elle s'éteigne est le cas le plus intéressant,
   * et le dater depuis la fin le rendait négatif, donc invisible.
   */
  const playQuestion = useCallback(
    (current: EarQuestion) => {
      const withMask = maskable && masked
      const notes =
        current.reference === null ? [current.target] : [current.reference, current.target]

      void notePlayer.unlock().then(() => {
        notePlayer.stopAll()

        if (withMask) {
          notePlayer.playMask({ duration: MASK_DURATION, delay: MASK_LEAD })
          const startsAt = MASK_LEAD + MASK_DURATION + MASK_GAP
          notePlayer.play(current.target, { duration: NOTE_DURATION, delay: startsAt })
          window.setTimeout(() => {
            askedAt.current = performance.now()
          }, startsAt * 1000)
          return
        }

        notes.forEach((note, index) => {
          notePlayer.play(note, { duration: NOTE_DURATION, delay: index * TRAINING_INTERVAL })
        })
        window.setTimeout(
          () => {
            askedAt.current = performance.now()
          },
          (notes.length - 1) * TRAINING_INTERVAL * 1000,
        )
      })
    },
    [maskable, masked],
  )

  const record = useCallback((target: Pitch, played: Pitch) => {
    const latencyMs = askedAt.current === 0 ? 0 : performance.now() - askedAt.current
    setAttempts((previous) => [
      ...previous,
      { target, answer: played, previous: previousTarget.current, latencyMs },
    ])
    previousTarget.current = target
  }, [])

  const nextQuestion = useCallback(() => {
    // `previousTarget` ferme la fuite du tirage : en mode absolu, deux notes
    // consécutives ne peuvent plus être voisines d'un demi-ton.
    const drawn = drawTrainingQuestion(mode, scaleKey.tonic, 4, Math.random, previousTarget.current)
    setQuestion(drawn)
    setAnswer(null)
    setPhase('asking')
    playQuestion(drawn)
  }, [mode, playQuestion, scaleKey.tonic])

  // Changer de mode ou de tonalité invalide la question en cours, et la série
  // avec elle : mélanger deux dispositifs fausserait le diagnostic.
  useEffect(() => {
    setQuestion(null)
    setAnswer(null)
    setPhase('idle')
    setScore({ asked: 0, correct: 0 })
    setAttempts([])
    setDiagnosisShown(false)
    previousTarget.current = null
  }, [mode, scaleKey])

  const handleAnswer = (played: Pitch) => {
    // Hors exercice, le clavier reste jouable : on l'explore sans être noté.
    if (phase !== 'asking' || question === null) return

    record(question.target, played)
    const correct = isCorrectAnswer(question, played)
    setAnswer(played)
    setPhase('answered')
    setScore((previous) => ({
      asked: previous.asked + 1,
      correct: previous.correct + (correct ? 1 : 0),
    }))
  }

  const isCorrect = question !== null && answer !== null && isCorrectAnswer(question, answer)
  const targetDegree = question === null ? null : degreeOf(scale, question.target)

  const diagnosis = useMemo(
    () => (attempts.length === 0 ? null : diagnoseAttempts(attempts)),
    [attempts],
  )

  const showDiagnosis = diagnosisShown && diagnosis !== null

  return (
    <section className="section">
      <header className="bar">
        <h2>Reconnaître à l’oreille</h2>

        <div className="toolbar__group" role="group" aria-label="Mode d’écoute">
          <button
            type="button"
            className={`chip${mode === 'relative' ? ' chip--active' : ''}`}
            onClick={() => onModeChange('relative')}
            aria-pressed={mode === 'relative'}
            title="La tonique est jouée d’abord, comme point de repère"
          >
            Relatif
          </button>
          <button
            type="button"
            className={`chip${mode === 'absolute' ? ' chip--active' : ''}`}
            onClick={() => onModeChange('absolute')}
            aria-pressed={mode === 'absolute'}
            title="Aucune référence : chaque note se nomme seule"
          >
            Absolu
          </button>
        </div>

        {mode === 'relative' ? (
          <label className="switch">
            <input
              type="checkbox"
              checked={guided}
              onChange={(event) => setGuided(event.target.checked)}
            />
            Guider dans la gamme
          </label>
        ) : (
          <label
            className="switch"
            title="Un agrégat dissonant de deux secondes efface la note précédente, et celle que vous venez de jouer"
          >
            <input
              type="checkbox"
              checked={masked}
              onChange={(event) => setMasked(event.target.checked)}
            />
            Masquer entre les notes
          </label>
        )}

        <div className="bar__spacer" />

        {score.asked > 0 ? (
          <span className="bar__meta">
            {score.correct} / {score.asked} — {Math.round((score.correct / score.asked) * 100)} %
          </span>
        ) : null}

        {diagnosis !== null && attempts.length >= 6 ? (
          <button
            type="button"
            className="badge badge--neutral"
            onClick={() => setDiagnosisShown((shown) => !shown)}
            title="Comment vous trouvez vos réponses, pas combien vous en trouvez"
          >
            {diagnosisShown ? 'Masquer l’analyse' : 'Analyser mes réponses'}
          </button>
        ) : null}
      </header>

      <p className="hint">
        {mode === 'relative' ? (
          <>
            La tonique de {scaleKey.name} est jouée d’abord, puis une note de la gamme — hors
            tonique, qui vient d’être entendue. Retrouvez-la sur le clavier.
          </>
        ) : masked ? (
          <>
            Aucune référence, tirage dans les douze notes. L’agrégat dissonant efface de votre
            mémoire la note précédente <em>et</em> celle que vous venez de jouer : chaque note
            doit donc se nommer seule, sans repère.
          </>
        ) : (
          <>
            Aucune référence, tirage dans les douze notes.{' '}
            <strong className="hint__warning">Vous gardez toutefois un repère :</strong> vous
            entendez la note que vous jouez et lisez la réponse après chaque essai. Cochez
            « Masquer entre les notes » pour le supprimer.
          </>
        )}
      </p>

      {/* Le clavier occupe la scène et s'y centre, exactement comme sur
          « Jouer » : d'un onglet à l'autre, il ne saute pas. Le diagnostic,
          lui, est trop haut pour le bandeau : il prend la scène plutôt que
          de faire déborder la page. */}
      <div className={`stage${showDiagnosis ? ' stage--panel' : ' stage--center'}`}>
        {showDiagnosis ? (
          <div className="diagnosis">
            <p className="diagnosis__title">
              Comment vous trouvez vos réponses
              <span>
                {diagnosis.correct} / {diagnosis.total} sur cette série
              </span>
            </p>
            {diagnosis.readings.length === 0 ? (
              <p className="diagnosis__reading">
                Pas encore assez de réponses pour distinguer une stratégie d’une autre.
                Continuez : c’est le nombre d’essais, pas leur difficulté, qui fait parler
                les erreurs.
              </p>
            ) : (
              <ul className="diagnosis__list">
                {diagnosis.readings.map((reading) => (
                  <li key={reading} className="diagnosis__reading">
                    {reading}
                  </li>
                ))}
              </ul>
            )}
            <div className="ear-panel__actions">
              <button type="button" className="button" onClick={() => setDiagnosisShown(false)}>
                Revenir à l’entraînement
              </button>
            </div>
          </div>
        ) : (
          <Piano
            preferFlats={preferFlats}
            highlighted={mode === 'relative' && guided ? scale : undefined}
            feedback={
              phase === 'answered' && question !== null && answer !== null
                ? isCorrect
                  ? [{ note: question.target, kind: 'correct' as const }]
                  : [
                      { note: answer, kind: 'wrong' as const },
                      { note: question.target, kind: 'correct' as const },
                    ]
                : null
            }
            onNote={handleAnswer}
          />
        )}
      </div>

      <div className="ear-footer">
        {showDiagnosis ? null : (
          <div className="ear-panel">
            {phase === 'answered' && question !== null ? (
              <p className={`result ${isCorrect ? 'result--success' : 'result--error'}`}>
                {isCorrect ? (
                  <>
                    <strong>C’est bien {noteName(question.target)}</strong>
                    {targetDegree !== null ? (
                      <>
                        {' '}
                        — {targetDegree}
                        <sup>{targetDegree === 1 ? 'er' : 'e'}</sup> degré de {scaleKey.name}.
                      </>
                    ) : (
                      '.'
                    )}
                  </>
                ) : (
                  <>
                    <strong>C’était {noteName(question.target)}</strong>
                    {answer !== null ? <> ; vous avez joué {noteName(answer)}.</> : null}
                  </>
                )}
              </p>
            ) : (
              <p className="ear-panel__prompt">
                {phase === 'asking' ? 'Quelle note vient d’être jouée ?' : 'Prêt ?'}
              </p>
            )}

            <div className="ear-panel__actions">
              {phase === 'idle' ? (
                <button type="button" className="button button--primary" onClick={nextQuestion}>
                  Commencer
                </button>
              ) : null}
              {question !== null ? (
                <button type="button" className="button" onClick={() => playQuestion(question)}>
                  Réécouter
                </button>
              ) : null}
              {phase === 'answered' ? (
                <button type="button" className="button button--primary" onClick={nextQuestion}>
                  Note suivante
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
