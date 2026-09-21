import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CALIBRATION_LENGTH,
  buildCalibration,
  calibrationVerdict,
  degreeOf,
  drawTrainingQuestion,
  isCorrectAnswer,
  majorScale,
  noteName,
  type CalibrationVerdict,
  type EarMode,
  type EarQuestion,
  type Pitch,
  type ScaleKey,
} from '@scales/music-theory'
import { notePlayer } from '@scales/audio'
import { Piano } from '@scales/ui'

export interface EarSectionProps {
  scaleKey: ScaleKey
  mode: EarMode
  onModeChange: (mode: EarMode) => void
  verdict: CalibrationVerdict | null
  onVerdict: (verdict: CalibrationVerdict | null) => void
}

type Phase = 'idle' | 'asking' | 'answered'

export function EarSection({ scaleKey, mode, onModeChange, verdict, onVerdict }: EarSectionProps) {
  const scale = useMemo(() => majorScale({ ...scaleKey.tonic, octave: 4 }), [scaleKey])
  const preferFlats = scaleKey.accidentalKind === 'flat'

  const [phase, setPhase] = useState<Phase>('idle')
  const [question, setQuestion] = useState<EarQuestion | null>(null)
  const [answer, setAnswer] = useState<Pitch | null>(null)
  const [score, setScore] = useState({ asked: 0, correct: 0 })
  const [guided, setGuided] = useState(true)

  const [calibration, setCalibration] = useState<EarQuestion[] | null>(null)
  const [calibrationIndex, setCalibrationIndex] = useState(0)
  const [calibrationScore, setCalibrationScore] = useState(0)
  /** Le verdict occupe la scène juste après le test, puis s'efface. */
  const [verdictShown, setVerdictShown] = useState(false)

  const inCalibration = calibration !== null

  const playQuestion = useCallback((current: EarQuestion) => {
    const notes = current.reference === null ? [current.target] : [current.reference, current.target]
    void notePlayer.playSequence(notes, { interval: 1.1, duration: 0.9 })
  }, [])

  const nextQuestion = useCallback(() => {
    const drawn = drawTrainingQuestion(mode, scaleKey.tonic, 4)
    setQuestion(drawn)
    setAnswer(null)
    setPhase('asking')
    playQuestion(drawn)
  }, [mode, playQuestion, scaleKey.tonic])

  // Changer de mode ou de tonalité invalide la question en cours.
  useEffect(() => {
    setQuestion(null)
    setAnswer(null)
    setPhase('idle')
    setScore({ asked: 0, correct: 0 })
  }, [mode, scaleKey])

  const startCalibration = () => {
    const questions = buildCalibration()
    setCalibration(questions)
    setCalibrationIndex(0)
    setCalibrationScore(0)
    setVerdictShown(false)
    setPhase('asking')
    setQuestion(questions[0] ?? null)
    setAnswer(null)
    if (questions[0] !== undefined) playQuestion(questions[0])
  }

  const abortCalibration = () => {
    setCalibration(null)
    setQuestion(null)
    setPhase('idle')
  }

  const handleCalibrationAnswer = (played: Pitch) => {
    if (calibration === null || question === null) return

    const correct = isCorrectAnswer(question, played)
    const nextScore = calibrationScore + (correct ? 1 : 0)
    const nextIndex = calibrationIndex + 1
    setCalibrationScore(nextScore)

    if (nextIndex >= calibration.length) {
      // Le verdict tombe à la fin : donner le résultat note par note
      // apprendrait à répondre, et fausserait la mesure.
      onVerdict(calibrationVerdict(nextScore, calibration.length))
      setCalibration(null)
      setQuestion(null)
      setPhase('idle')
      setVerdictShown(true)
      return
    }

    setCalibrationIndex(nextIndex)
    const upcoming = calibration[nextIndex]
    if (upcoming === undefined) return
    setQuestion(upcoming)
    window.setTimeout(() => playQuestion(upcoming), 650)
  }

  const handleAnswer = (played: Pitch) => {
    if (inCalibration) {
      handleCalibrationAnswer(played)
      return
    }
    // Hors exercice, le clavier reste jouable : on l'explore sans être noté.
    if (phase !== 'asking' || question === null) return

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

  return (
    <section className="section">
      <header className="bar">
        <h2>Reconnaître à l’oreille</h2>
        {!inCalibration ? (
          <>
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
                title="Aucune référence : ce mode suppose l’oreille absolue"
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
            ) : null}
          </>
        ) : null}

        <div className="bar__spacer" />

        {score.asked > 0 && !inCalibration ? (
          <span className="bar__meta">
            {score.correct} / {score.asked} — {Math.round((score.correct / score.asked) * 100)} %
          </span>
        ) : null}

        {verdict !== null && !inCalibration ? (
          <button
            type="button"
            className={`badge badge--${verdict.profile}`}
            onClick={() => setVerdictShown((shown) => !shown)}
            title="Résultat du test de calibrage"
          >
            {verdict.title} · {verdict.score}/{verdict.total}
          </button>
        ) : null}

        <button
          type="button"
          className="button"
          onClick={startCalibration}
          disabled={inCalibration}
        >
          {verdict === null ? 'Test de calibrage' : 'Refaire le test'}
        </button>
      </header>

      <p className="hint">
        {inCalibration ? (
          <>
            Dix notes sans aucune référence, dispersées sur trois octaves. Aucun retour n’est
            donné avant la fin : corriger note par note apprendrait à répondre, et fausserait
            la mesure.
          </>
        ) : mode === 'relative' ? (
          <>
            La tonique de {scaleKey.name} est jouée d’abord, puis une note de la gamme — hors
            tonique, qui vient d’être entendue. Retrouvez-la sur le clavier.
          </>
        ) : (
          <>
            Aucune référence, tirage dans les douze notes chromatiques. Ce mode suppose
            l’oreille absolue ; le test de calibrage dit si vous la possédez.
          </>
        )}
      </p>

      <div className="stage stage--center">
        {inCalibration ? (
          <div className="ear-panel">
            <p className="ear-panel__step">
              Note {calibrationIndex + 1} <span>sur {CALIBRATION_LENGTH}</span>
            </p>
            <div className="ear__progress">
              <div
                className="ear__progress-bar"
                style={{ width: `${(calibrationIndex / CALIBRATION_LENGTH) * 100}%` }}
              />
            </div>
            <div className="ear-panel__actions">
              {question !== null ? (
                <button type="button" className="button" onClick={() => playQuestion(question)}>
                  Réécouter
                </button>
              ) : null}
              <button type="button" className="button" onClick={abortCalibration}>
                Abandonner
              </button>
            </div>
          </div>
        ) : verdictShown && verdict !== null ? (
          <div className={`ear-panel verdict verdict--${verdict.profile}`}>
            <p className="verdict__score">
              {verdict.score} / {verdict.total}
            </p>
            <div>
              <p className="verdict__title">{verdict.title}</p>
              <p>{verdict.explanation}</p>
              <div className="ear-panel__actions">
                <button type="button" className="button" onClick={() => setVerdictShown(false)}>
                  Revenir à l’entraînement
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    onVerdict(null)
                    setVerdictShown(false)
                  }}
                >
                  Oublier le résultat
                </button>
              </div>
            </div>
          </div>
        ) : (
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

      <Piano
        preferFlats={preferFlats}
        highlighted={!inCalibration && mode === 'relative' && guided ? scale : undefined}
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
    </section>
  )
}
