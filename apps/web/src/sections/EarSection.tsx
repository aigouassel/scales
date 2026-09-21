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
      <header className="section__header">
        <div>
          <h2>Reconnaître à l’oreille</h2>
          <p className="section__lead">
            Une note est jouée, vous la retrouvez sur le clavier. En mode relatif, la
            tonique est donnée d’abord comme point de repère.
          </p>
        </div>
      </header>

      {!inCalibration ? (
        <div className="toolbar">
          <div className="toolbar__group" role="group" aria-label="Mode d’écoute">
            <button
              type="button"
              className={`chip${mode === 'relative' ? ' chip--active' : ''}`}
              onClick={() => onModeChange('relative')}
              aria-pressed={mode === 'relative'}
            >
              Relatif
            </button>
            <button
              type="button"
              className={`chip${mode === 'absolute' ? ' chip--active' : ''}`}
              onClick={() => onModeChange('absolute')}
              aria-pressed={mode === 'absolute'}
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
              Montrer les notes de la gamme
            </label>
          ) : null}
        </div>
      ) : null}

      <p className="mode-note">
        {inCalibration ? (
          <>
            Test en cours — note {calibrationIndex + 1} sur {CALIBRATION_LENGTH}. Aucun retour
            n’est donné avant la fin, pour ne pas fausser la mesure.
          </>
        ) : mode === 'relative' ? (
          <>
            Les notes sont tirées dans {scaleKey.name}, hors tonique — elle vient d’être jouée
            comme référence.
          </>
        ) : (
          <>
            Aucune référence, tirage dans les douze notes chromatiques. Ce mode suppose
            l’oreille absolue.
          </>
        )}
      </p>

      <div className="ear">
        {inCalibration ? (
          <div className="ear__progress">
            <div
              className="ear__progress-bar"
              style={{ width: `${(calibrationIndex / CALIBRATION_LENGTH) * 100}%` }}
            />
          </div>
        ) : null}

        <div className="toolbar toolbar--center">
          {phase === 'idle' && !inCalibration ? (
            <button type="button" className="button button--primary" onClick={nextQuestion}>
              Commencer
            </button>
          ) : null}

          {question !== null ? (
            <button type="button" className="button" onClick={() => playQuestion(question)}>
              Réécouter
            </button>
          ) : null}

          {phase === 'answered' && !inCalibration ? (
            <button type="button" className="button button--primary" onClick={nextQuestion}>
              Note suivante
            </button>
          ) : null}

          {inCalibration ? (
            <button type="button" className="button" onClick={abortCalibration}>
              Abandonner le test
            </button>
          ) : null}
        </div>

        {phase === 'answered' && question !== null ? (
          <div className={`callout ${isCorrect ? 'callout--success' : 'callout--error'}`}>
            {isCorrect ? (
              <p>
                <strong>C’est bien {noteName(question.target)}</strong>
                {targetDegree !== null ? <> — {targetDegree}<sup>e</sup> degré de {scaleKey.name}.</> : '.'}
              </p>
            ) : (
              <p>
                <strong>C’était {noteName(question.target)}</strong>
                {answer !== null ? <> ; vous avez joué {noteName(answer)}.</> : null}
                {targetDegree !== null ? <> Le {targetDegree}<sup>e</sup> degré de {scaleKey.name}.</> : null}
              </p>
            )}
          </div>
        ) : null}

        <Piano
          preferFlats={preferFlats}
          highlighted={!inCalibration && mode === 'relative' && guided ? scale : undefined}
          feedback={
            phase === 'answered' && question !== null && answer !== null
              ? { note: isCorrect ? question.target : answer, kind: isCorrect ? 'correct' : 'wrong' }
              : null
          }
          disabled={phase === 'idle'}
          onNote={handleAnswer}
        />

        {!inCalibration && score.asked > 0 ? (
          <p className="ear__score">
            {score.correct} sur {score.asked} — {Math.round((score.correct / score.asked) * 100)} %
          </p>
        ) : null}
      </div>

      <div className="calibration">
        <h3>Test de calibrage</h3>
        <p>
          Dix notes sans aucune référence, dispersées sur trois octaves. Nommer des notes
          isolées à ce rythme n’est possible qu’avec l’oreille absolue ; le hasard seul donne
          environ une note sur douze. Le test mesure, il ne verrouille rien.
        </p>

        {verdict !== null ? (
          <div className={`verdict verdict--${verdict.profile}`}>
            <p className="verdict__score">
              {verdict.score} / {verdict.total}
            </p>
            <div>
              <p className="verdict__title">{verdict.title}</p>
              <p>{verdict.explanation}</p>
            </div>
          </div>
        ) : null}

        <div className="toolbar">
          <button
            type="button"
            className="button"
            onClick={startCalibration}
            disabled={inCalibration}
          >
            {verdict === null ? 'Lancer le test' : 'Refaire le test'}
          </button>
          {verdict !== null ? (
            <button type="button" className="button" onClick={() => onVerdict(null)}>
              Oublier le résultat
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
