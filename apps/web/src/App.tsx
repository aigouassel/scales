import { useEffect, useMemo } from 'react'
import {
  PROGRESSIONS,
  PROGRESSION_LIST,
  noteName,
  type EarMode,
  type ProgressionId,
} from '@scales/music-theory'
import '@scales/ui/styles.css'
import './app.css'
import { ExercisesSection } from './sections/ExercisesSection'
import { PlaySection } from './sections/PlaySection'
import { EarSection } from './sections/EarSection'
import { LexiconSection } from './sections/LexiconSection'
import { usePersistentState } from './usePersistentState'

type Tab = 'exercises' | 'play' | 'ear' | 'lexicon'

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'exercises', label: 'Exercices', hint: 'Écrire la gamme sur la portée' },
  { id: 'play', label: 'Jouer', hint: 'Le clavier sous les doigts' },
  { id: 'ear', label: 'Oreille', hint: 'Reconnaître les notes' },
  { id: 'lexicon', label: 'Lexique', hint: 'Les mots du solfège' },
]

export function App() {
  const [progressionId, setProgressionId] = usePersistentState<ProgressionId>(
    'progression',
    'fifths',
  )
  const [keyId, setKeyId] = usePersistentState<string>('key', 'C')
  const [storedTab, setTab] = usePersistentState<Tab>('tab', 'exercises')
  const [earMode, setEarMode] = usePersistentState<EarMode>('earMode', 'relative')
  const [solved, setSolved] = usePersistentState<string[]>('solved', [])

  /**
   * Les valeurs relues du stockage sont validées avant usage. Elles peuvent
   * venir d'une version antérieure de l'application, ou avoir été modifiées à
   * la main : un onglet inconnu afficherait une section vide, et une
   * progression inconnue ferait planter la lecture de ses tonalités.
   */
  const tab: Tab = TABS.some((item) => item.id === storedTab) ? storedTab : 'exercises'
  const progression = PROGRESSIONS[progressionId] ?? PROGRESSIONS.fifths

  // Les deux progressions n'emploient pas les mêmes orthographes de tonique :
  // fa♯ existe côté quintes, sol♭ côté degrés. On retombe sur do si besoin.
  const scaleKey = useMemo(() => {
    return progression.keys.find((key) => key.id === keyId) ?? progression.keys[0]!
  }, [keyId, progression])

  useEffect(() => {
    if (scaleKey.id !== keyId) setKeyId(scaleKey.id)
  }, [keyId, scaleKey.id, setKeyId])

  const markSolved = (id: string) => {
    setSolved((previous) => (previous.includes(id) ? previous : [...previous, id]))
  }

  return (
    <div className="app">
      <header className="navbar">
        <span className="navbar__brand">Gammes</span>

        <nav className="navbar__tabs" aria-label="Sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab${tab === item.id ? ' tab--active' : ''}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id}
              title={item.hint}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Le lexique ne travaille aucune gamme : lui présenter le sélecteur de
          tonalité donnerait un contrôle sans effet visible sur la page. Ses
          exemples suivent la tonalité choisie ailleurs, ce que la page dit. */}
      {tab !== 'lexicon' ? (
        <div className="context">
          <div className="context__progression" role="group" aria-label="Progression">
            {PROGRESSION_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip${progressionId === item.id ? ' chip--active' : ''}`}
                onClick={() => setProgressionId(item.id)}
                aria-pressed={progressionId === item.id}
                title={item.description}
              >
                {item.label}
              </button>
            ))}
          </div>

          <nav className="keys" aria-label="Tonalité">
            {progression.keys.map((key) => (
              <button
                key={key.id}
                type="button"
                className={`key-chip${key.id === scaleKey.id ? ' key-chip--active' : ''}${
                  solved.includes(key.id) ? ' key-chip--solved' : ''
                }`}
                onClick={() => setKeyId(key.id)}
                aria-current={key.id === scaleKey.id}
                title={solved.includes(key.id) ? `${key.name} — écrite sans faute` : key.name}
              >
                <span className="key-chip__name">{noteName({ ...key.tonic, octave: 0 })}</span>
                <span className="key-chip__signature">
                  {key.accidentalCount === 0
                    ? '—'
                    : `${key.accidentalCount} ${key.accidentalKind === 'sharp' ? '♯' : '♭'}`}
                </span>
              </button>
            ))}
          </nav>
        </div>
      ) : null}

      <main className={`app__main${tab === 'lexicon' ? ' app__main--scrollable' : ''}`}>
        {tab === 'exercises' ? (
          <ExercisesSection
            scaleKey={scaleKey}
            solvedCount={solved.length}
            totalCount={progression.keys.length}
            onSolved={markSolved}
          />
        ) : null}
        {tab === 'play' ? <PlaySection scaleKey={scaleKey} /> : null}
        {tab === 'ear' ? (
          <EarSection scaleKey={scaleKey} mode={earMode} onModeChange={setEarMode} />
        ) : null}
        {tab === 'lexicon' ? <LexiconSection scaleKey={scaleKey} /> : null}
      </main>
    </div>
  )
}
