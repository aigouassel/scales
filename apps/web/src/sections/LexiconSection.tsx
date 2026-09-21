import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DEGREE_NAMES,
  diatonicIndex,
  majorScale,
  naturalMinorScale,
  noteName,
  pitch,
  type Pitch,
  type ScaleKey,
} from '@scales/music-theory'
import { notePlayer } from '@scales/audio'
import { Staff } from '@scales/ui'

export interface LexiconSectionProps {
  scaleKey: ScaleKey
}

interface TermEntry {
  id: string
  name: string
  body: ReactNode
}

interface Chapter {
  id: string
  title: string
  intro?: ReactNode
  terms: TermEntry[]
  outro?: ReactNode
}

/** Bouton d'écoute : un terme de solfège s'entend mieux qu'il ne se lit. */
function Listen({
  notes,
  label,
  interval = 0.55,
}: {
  notes: readonly Pitch[]
  label: string
  interval?: number
}) {
  return (
    <button
      type="button"
      className="listen"
      onClick={() => void notePlayer.playSequence(notes, { interval })}
    >
      <span aria-hidden="true">▶</span> {label}
    </button>
  )
}

const C4 = pitch('C', 0, 4)
const C5 = pitch('C', 0, 5)
const D4 = pitch('D', 0, 4)
const EFLAT4 = pitch('E', -1, 4)
const F4 = pitch('F', 0, 4)
const G4 = pitch('G', 0, 4)
const CSHARP4 = pitch('C', 1, 4)
const DFLAT4 = pitch('D', -1, 4)

const E4 = pitch('E', 0, 4)
const DSHARP5 = pitch('D', 1, 5)
const EFLAT5 = pitch('E', -1, 5)
const E5 = pitch('E', 0, 5)
const FSHARP4 = pitch('F', 1, 4)

/** Étendue de la portée d'illustration : la même que celle des exercices. */
const STAFF_LOW = diatonicIndex({ letter: 'C', octave: 4 })
const STAFF_HIGH = diatonicIndex({ letter: 'C', octave: 6 })

/** mi majeur, correctement orthographiée, puis avec mi♭ au 7e degré. */
const E_MAJOR = majorScale(E4)
const E_MAJOR_MISSPELLED = E_MAJOR.map((note, index) => (index === 6 ? EFLAT5 : note))

const INTERVAL_NAMES = [
  ['seconde', '1 lettre d’écart', 'do → ré'],
  ['tierce', '2 lettres', 'do → mi'],
  ['quarte', '3 lettres', 'do → fa'],
  ['quinte', '4 lettres', 'do → sol'],
  ['sixte', '5 lettres', 'do → la'],
  ['septième', '6 lettres', 'do → si'],
  ['octave', '7 lettres — la même note plus haut', 'do → do'],
] as const

const DEGREE_NOTES: Record<number, string> = {
  2: 'c’est elle qui décide si la gamme est majeure ou mineure',
  4: 'le pôle d’attraction, à la quinte de la tonique',
  6: 'à un demi-ton sous la tonique : elle « appelle » sa résolution',
}

/**
 * Le contenu est décrit comme une structure, pas écrit directement en JSX :
 * c'est ce qui permet au sommaire d'être dérivé du texte plutôt que tenu à
 * jour en parallèle — deux listes qui divergent tôt ou tard.
 */
function buildChapters(scaleKey: ScaleKey, goTo: (id: string) => void): Chapter[] {
  const scale = majorScale({ ...scaleKey.tonic, octave: 4 })
  const cMajor = majorScale(C4)
  const cMinor = naturalMinorScale(C4)

  return [
    {
      id: 'sons',
      title: 'Les briques du son',
      terms: [
        {
          id: 'hauteur',
          name: 'Hauteur, et note',
          body: (
            <>
              <p>
                La <strong>hauteur</strong> est la position d’un son dans l’aigu ou le grave —
                une fréquence. La <strong>note</strong> est son nom écrit : une lettre (do, ré,
                mi…), une éventuelle altération, et une octave.
              </p>
              <p>
                Les deux ne se confondent pas, et c’est ce que l’application prend au
                sérieux : <em>do♯</em> et <em>ré♭</em> sont la même hauteur mais deux notes
                différentes.
              </p>
            </>
          ),
        },
        {
          id: 'octave',
          name: 'Octave',
          body: (
            <>
              <p>
                L’intervalle entre une note et la note du même nom immédiatement au-dessus. Sa
                fréquence est exactement doublée, et l’oreille les perçoit comme «&nbsp;la même
                note&nbsp;». C’est pourquoi les lettres ne vont que de do à si avant de
                recommencer.
              </p>
              <p>
                Le chiffre d’une note indique son octave : <em>do4</em> est le do central du
                piano. <Listen notes={[C4, C5]} label="do4 puis do5" />
              </p>
            </>
          ),
        },
        {
          id: 'demi-ton',
          name: 'Demi-ton',
          body: (
            <>
              <p>
                Le plus petit écart du système occidental : d’une touche du piano à sa voisine
                immédiate, noire ou blanche. Il y en a douze dans une octave.
              </p>
              <p>
                Attention au piège visuel : <strong>mi–fa</strong> et <strong>si–do</strong>{' '}
                sont des demi-tons alors qu’aucune touche noire ne les sépare. C’est exactement
                pour cette raison que deux touches du clavier de l’ordinateur restent inertes
                dans l’application.
              </p>
              <p>
                <Listen notes={[E4, F4]} label="mi → fa, un demi-ton" />
              </p>
            </>
          ),
        },
        {
          id: 'ton',
          name: 'Ton',
          body: (
            <>
              <p>
                Deux demi-tons. Do → ré est un ton, parce que do♯ se trouve entre les deux.
              </p>
              <p>
                <Listen notes={[C4, D4]} label="do → ré, un ton" />{' '}
                <Listen notes={[C4, CSHARP4]} label="do → do♯, un demi-ton" />
              </p>
            </>
          ),
        },
        {
          id: 'intervalle',
          name: 'Intervalle',
          body: (
            <>
              <p>
                L’écart entre deux notes. Son nom se compte en <strong>lettres</strong>, bornes
                comprises — et non en tons.
              </p>
              <ul className="lexicon__table">
                {INTERVAL_NAMES.map(([name, gap, example]) => (
                  <li key={name}>
                    <span className="lexicon__term">{name}</span>
                    <span className="lexicon__gap">{gap}</span>
                    <span className="lexicon__example">{example}</span>
                  </li>
                ))}
              </ul>
              <p>
                Chaque intervalle porte ensuite une <em>qualité</em> qui précise sa taille
                exacte : une tierce est <strong>majeure</strong> (4 demi-tons) ou{' '}
                <strong>mineure</strong> (3 demi-tons) ; quartes, quintes et octaves sont dites{' '}
                <strong>justes</strong>.
              </p>
              <p>
                <Listen notes={[C4, E4]} label="tierce majeure" />{' '}
                <Listen notes={[C4, EFLAT4]} label="tierce mineure" />
              </p>
            </>
          ),
        },
        {
          id: 'quinte',
          name: 'Quinte juste',
          body: (
            <>
              <p>
                Sept demi-tons : do → sol. C’est, après l’octave, l’intervalle le plus consonant
                — les deux sons se fondent presque l’un dans l’autre. Cette proximité acoustique
                est la raison pour laquelle la quinte organise toute la théorie tonale, et donne
                son nom au <em>cycle des quintes</em> plus bas.
              </p>
              <p>
                <Listen notes={[C4, G4]} label="do → sol, quinte juste" />
              </p>
            </>
          ),
        },
        {
          id: 'enharmonie',
          name: 'Enharmonie',
          body: (
            <>
              <p>
                Deux notes <strong>enharmoniques</strong> sonnent identiques mais s’écrivent
                différemment : do♯ et ré♭, fa♯ et sol♭. Au piano, c’est la même touche.
              </p>
              <p>
                <Listen notes={[CSHARP4, DFLAT4]} label="do♯ puis ré♭ — même son" />
              </p>
              <p>
                Choisir entre les deux n’a pourtant rien d’arbitraire, et c’est l’une des idées
                les plus fécondes du solfège —{' '}
                <button type="button" className="link" onClick={() => goTo('enharmonie-fonction')}>
                  développée plus bas
                </button>
                , une fois la gamme et l’armure en place.
              </p>
            </>
          ),
        },
      ],
    },
    {
      id: 'gamme',
      title: 'La gamme',
      terms: [
        {
          id: 'gamme-def',
          name: 'Gamme',
          body: (
            <>
              <p>
                Une suite ordonnée de notes à l’intérieur d’une octave, choisie selon un motif
                d’intervalles fixe. Une gamme n’est pas une liste arbitraire : c’est ce motif
                appliqué à un point de départ.
              </p>
              <p>
                La gamme majeure suit toujours{' '}
                <strong>ton · ton · demi-ton · ton · ton · ton · demi-ton</strong>. Transposez ce
                motif où vous voulez, vous obtenez toutes les gammes majeures.
              </p>
            </>
          ),
        },
        {
          id: 'tonique',
          name: 'Tonique',
          body: (
            <>
              <p>
                La note de départ d’une gamme, celle qui lui donne son nom, et celle sur
                laquelle l’oreille a envie de se reposer. En {scaleKey.name}, la tonique est{' '}
                <strong>{noteName({ ...scaleKey.tonic, octave: 0 })}</strong>.
              </p>
              <p>
                C’est elle que l’application joue en référence dans le mode d’oreille relatif :
                elle installe un centre auquel comparer tout le reste.
              </p>
            </>
          ),
        },
        {
          id: 'degre',
          name: 'Degré',
          body: (
            <>
              <p>
                La position d’une note dans sa gamme, comptée depuis la tonique. Le 1
                <sup>er</sup> degré est la tonique, le 5<sup>e</sup> la dominante, etc. Parler
                en degrés permet de dire la même chose dans toutes les tonalités : «&nbsp;la
                sensible monte vers la tonique&nbsp;» est vrai partout.
              </p>
              <ul className="lexicon__table">
                {DEGREE_NAMES.map((degreeName, index) => (
                  <li key={degreeName}>
                    <span className="lexicon__term">
                      {index + 1}
                      <sup>{index === 0 ? 'er' : 'e'}</sup> — {degreeName}
                    </span>
                    <span className="lexicon__gap">{DEGREE_NOTES[index] ?? ''}</span>
                    <span className="lexicon__example">
                      {noteName(scale[index] ?? scale[0]!)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="lexicon__caption">
                Colonne de droite : les degrés de {scaleKey.name}, la tonalité que vous
                travaillez dans les autres onglets.
              </p>
            </>
          ),
        },
        {
          id: 'tonalite',
          name: 'Tonalité',
          body: (
            <p>
              La gamme dans laquelle un morceau est écrit — une tonique plus un mode.
              «&nbsp;Ré majeur&nbsp;» est une tonalité ; elle détermine quelles notes sont
              attendues, et donc quelles altérations figurent à l’armure.
            </p>
          ),
        },
        {
          id: 'majeur-mineur',
          name: 'Majeur et mineur',
          body: (
            <>
              <p>
                Deux <strong>modes</strong> : deux motifs d’intervalles différents appliqués à
                la même tonique. Le majeur sonne ouvert, le mineur plus sombre — et cette
                couleur tient à trois degrés seulement, le 3<sup>e</sup>, le 6<sup>e</sup> et le
                7<sup>e</sup>, abaissés d’un demi-ton dans le mineur naturel.
              </p>
              <p className="lexicon__compare">
                <span>
                  <strong>do majeur</strong> — {cMajor.map((note) => noteName(note)).join(' ')}
                </span>
                <span>
                  <strong>do mineur</strong> — {cMinor.map((note) => noteName(note)).join(' ')}
                </span>
              </p>
              <p>
                <Listen notes={cMajor} label="do majeur" interval={0.34} />{' '}
                <Listen notes={cMinor} label="do mineur" interval={0.34} />
              </p>
              <p className="section__note">
                L’application n’enseigne que les gammes majeures ; le mineur est ici pour situer
                le mot.
              </p>
            </>
          ),
        },
      ],
    },
    {
      id: 'ecriture',
      title: 'L’écriture',
      terms: [
        {
          id: 'alteration',
          name: 'Altération',
          body: (
            <>
              <p>Un signe qui déplace une note d’un demi-ton sans changer sa lettre.</p>
              <ul className="lexicon__table">
                <li>
                  <span className="lexicon__term">dièse ♯</span>
                  <span className="lexicon__gap">monte la note d’un demi-ton</span>
                  <span className="lexicon__example">fa → fa♯</span>
                </li>
                <li>
                  <span className="lexicon__term">bémol ♭</span>
                  <span className="lexicon__gap">descend la note d’un demi-ton</span>
                  <span className="lexicon__example">si → si♭</span>
                </li>
                <li>
                  <span className="lexicon__term">bécarre ♮</span>
                  <span className="lexicon__gap">annule une altération</span>
                  <span className="lexicon__example">fa♯ → fa</span>
                </li>
              </ul>
              <p>
                Une gamme n’emploie jamais les deux sens à la fois : elle est soit en dièses,
                soit en bémols. Mélanger reviendrait à réutiliser une lettre.
              </p>
            </>
          ),
        },
        {
          id: 'armure',
          name: 'Armure',
          body: (
            <>
              <p>
                Les altérations groupées juste après la clé, en début de portée, valables pour
                tout le morceau. Ré majeur s’écrit normalement avec deux dièses à l’armure
                plutôt qu’un dièse devant chaque fa et chaque do.
              </p>
              <p>
                L’application écrit volontairement les altérations{' '}
                <strong>devant chaque note</strong> : c’est l’exercice le plus direct, où ce que
                l’on clique est exactement ce qui est corrigé. L’armure suppose déjà de savoir
                ce qu’elle contient.
              </p>
            </>
          ),
        },
        {
          id: 'enharmonie-fonction',
          name: 'Enharmonie : pourquoi l’orthographe n’est pas libre',
          body: (
            <>
              <p>
                Deux notes enharmoniques sonnent pareil. Pourtant, dans une gamme donnée, une
                seule des deux écritures est juste — l’autre est une faute, qui ne s’entend pas
                mais se lit. La règle qui tranche tient en une phrase :
              </p>
              <p className="lexicon__rule">
                Une gamme majeure a sept degrés, et l’alphabet musical sept lettres.{' '}
                <strong>Chaque lettre apparaît une fois, et une seule.</strong>
              </p>
              <p>
                Dès que la tonique est choisie, toutes les lettres sont donc déterminées. Il ne
                reste qu’à décider l’altération de chacune.
              </p>

              <p>
                Prenons <strong>mi majeur</strong>. Son 7<sup>e</sup> degré doit sonner un
                demi-ton sous la tonique : ce son s’écrit <em>ré♯</em> ou <em>mi♭</em>, et c’est
                la même touche du piano.
              </p>
              <ul className="lexicon__table">
                <li>
                  <span className="lexicon__term">avec ré♯</span>
                  <span className="lexicon__gap">mi fa sol la si do ré</span>
                  <span className="lexicon__example lexicon__example--ok">
                    sept lettres distinctes
                  </span>
                </li>
                <li>
                  <span className="lexicon__term">avec mi♭</span>
                  <span className="lexicon__gap">mi fa sol la si do mi</span>
                  <span className="lexicon__example lexicon__example--ko">
                    mi deux fois, ré disparu
                  </span>
                </li>
              </ul>

              <div className="lexicon__staves">
                <figure className="lexicon__staff">
                  <figcaption>Correct — ré♯ au 7ᵉ degré</figcaption>
                  <Staff
                    slots={E_MAJOR}
                    lowDiatonic={STAFF_LOW}
                    highDiatonic={STAFF_HIGH}
                    readOnly
                  />
                </figure>
                <figure className="lexicon__staff">
                  <figcaption className="lexicon__staff-caption--ko">
                    Fautif — mi♭ au 7ᵉ degré
                  </figcaption>
                  <Staff
                    slots={E_MAJOR_MISSPELLED}
                    lowDiatonic={STAFF_LOW}
                    highDiatonic={STAFF_HIGH}
                    readOnly
                  />
                </figure>
              </div>
              <p>
                <Listen notes={E_MAJOR} label="mi majeur" interval={0.34} />{' '}
                <Listen notes={[DSHARP5, E5]} label="ré♯ → mi, la sensible se résout" />
              </p>
              <p>
                Sur la portée, la faute saute aux yeux : une gamme bien écrite est un escalier
                régulier, une marche par degré. Avec mi♭, les deux dernières notes se posent au
                même endroit — l’escalier se casse, et l’œil perd le repère qui lui permet de
                lire vite.
              </p>

              <p>
                Trois raisons se superposent, de la plus pratique à la plus profonde.
              </p>
              <ol className="lexicon__reasons">
                <li>
                  <strong>L’armure deviendrait impossible.</strong> Mi majeur s’écrit avec
                  quatre dièses à la clé — fa, do, sol, ré. Cette armure dit «&nbsp;tous les ré
                  sont dièses&nbsp;». Un mi♭ ne pourrait pas y figurer : il faudrait l’écrire à
                  la main devant chaque occurrence, en contredisant la clé.
                </li>
                <li>
                  <strong>Les intervalles se nomment par les lettres, pas par les sons.</strong>{' '}
                  Ré → fa♯ compte trois lettres (ré, mi, fa) : c’est une <em>tierce</em>. Ré →
                  sol♭ en compte quatre : c’est une <em>quarte</em>. Les deux font pourtant
                  quatre demi-tons et sortent la même touche. Mais la gamme majeure exige que
                  son 3<sup>e</sup> degré soit une tierce au-dessus de la tonique — c’est la
                  définition du degré. Écrire sol♭ produirait une quarte diminuée : le bon son
                  avec la mauvaise fonction.{' '}
                  <Listen notes={[D4, FSHARP4]} label="ré → fa♯ — tierce ou quarte, au choix" />
                </li>
                <li>
                  <strong>L’orthographe encode la fonction.</strong> C’est la raison de fond.
                  Ré♯ est la <em>sensible</em> de mi majeur : elle est attirée vers le haut, elle
                  appelle le mi. Mi♭ est la <em>tonique</em> de mi♭ majeur : un point de repos.
                  Même son, deux objets musicaux qui ne feront jamais la même chose dans un
                  morceau.
                </li>
              </ol>

              <p className="section__note">
                C’est exactement pourquoi, dans le code, une note est une lettre, une altération
                et une octave — jamais un numéro MIDI. 61 désigne aussi bien do♯ que ré♭, et
                confondre les deux rendrait toute correction d’écriture impossible.
              </p>
            </>
          ),
        },
      ],
    },
    {
      id: 'oreille',
      title: 'L’oreille',
      terms: [
        {
          id: 'absolue',
          name: 'Oreille absolue',
          body: (
            <p>
              La capacité de nommer une note entendue seule, sans aucune référence, de façon
              immédiate — comme on dit «&nbsp;c’est rouge&nbsp;». Elle se fixe dans l’enfance et
              ne s’acquiert quasiment jamais à l’âge adulte. Environ une personne sur dix mille
              la possède.
            </p>
          ),
        },
        {
          id: 'relative',
          name: 'Oreille relative',
          body: (
            <>
              <p>
                La capacité de reconnaître une note <em>par rapport</em> à une autre : on entend
                d’abord un mouvement — «&nbsp;ça monte d’une tierce&nbsp;» — avant un nom. Elle
                se travaille à tout âge, elle progresse vite, et c’est elle que les musiciens
                utilisent réellement pour déchiffrer, transposer ou jouer d’oreille.
              </p>
              <p>
                Savoir jouer rapidement ce qu’on entend sur son instrument est un signe
                d’oreille relative excellente, pas d’oreille absolue : aucune étiquette de note
                n’intervient dans ce processus.
              </p>
            </>
          ),
        },
      ],
    },
    {
      id: 'progressions',
      title: 'Pourquoi choisir sa progression ?',
      intro: (
        <p>
          Les douze gammes majeures peuvent se présenter dans deux ordres. Ce ne sont pas deux
          tris d’une même liste : ce sont deux façons d’apprendre, et elles ne servent pas au
          même moment.
        </p>
      ),
      terms: [
        {
          id: 'ordre-degres',
          name: 'Ordre des degrés — do, ré, mi, fa, sol, la, si',
          body: (
            <>
              <p>
                L’ordre alphabétique des notes, celui dans lequel on les a apprises. Son
                avantage est l’<strong>accès direct</strong> : on cherche «&nbsp;la gamme de
                ré&nbsp;» et on la trouve là où on l’attend. C’est l’ordre utile quand on
                travaille un morceau précis, ou qu’on révise une tonalité isolée.
              </p>
              <p>
                Son défaut est que la difficulté n’y est pas graduelle. On passe de{' '}
                <strong>mi majeur</strong> (4 dièses) à <strong>fa majeur</strong> (1 bémol) :
                non seulement le nombre d’altérations chute, mais on change de camp. Rien dans
                une gamme ne prépare à la suivante, et chacune doit donc être mémorisée comme un
                fait isolé.
              </p>
            </>
          ),
        },
        {
          id: 'cycle-quintes',
          name: 'Cycle des quintes — do, sol, ré, la, mi…',
          body: (
            <>
              <p>
                Chaque gamme démarre sur la <strong>quinte</strong> de la précédente : do → sol
                → ré → la… Et à chaque pas, <strong>une seule altération s’ajoute</strong>,
                jamais deux, jamais zéro.
              </p>
              <p className="lexicon__compare lexicon__compare--stacked">
                <span>do — aucune altération</span>
                <span>sol — 1 ♯ &nbsp;(fa♯)</span>
                <span>ré — 2 ♯ &nbsp;(fa♯ do♯)</span>
                <span>la — 3 ♯ &nbsp;(fa♯ do♯ sol♯)</span>
                <span>mi — 4 ♯ &nbsp;(fa♯ do♯ sol♯ ré♯)</span>
              </p>
              <p>
                Ce n’est pas une coïncidence. La gamme construite sur le 5<sup>e</sup> degré
                d’une autre partage six de ses sept notes ; la seule qui change est celle qui
                doit monter d’un demi-ton pour devenir la nouvelle sensible. D’où l’altération
                unique.
              </p>
              <p>
                Cet ordre a deux vertus. D’abord, chaque gamme{' '}
                <strong>s’appuie sur la précédente</strong> : au lieu de mémoriser douze faits,
                on retient un mécanisme. Ensuite, il donne gratuitement l’
                <strong>ordre des dièses à l’armure</strong> — fa, do, sol, ré, la, mi, si — qui
                est lui-même une suite de quintes, et celui des bémols, qui est le même lu à
                l’envers.
              </p>
            </>
          ),
        },
      ],
      outro: (
        <div className="callout callout--hint">
          <p>
            <strong>En pratique.</strong> Le cycle des quintes est le meilleur ordre pour{' '}
            <em>découvrir</em> et comprendre les gammes ; l’ordre des degrés est le meilleur
            pour <em>retrouver</em> une gamme dont on a besoin. D’où le sélecteur : la question
            n’est pas laquelle est correcte, mais ce que l’on est en train de faire.
          </p>
        </div>
      ),
    },
  ]
}

export function LexiconSection({ scaleKey }: LexiconSectionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState<string>('hauteur')

  const goTo = useCallback((id: string) => {
    rootRef.current
      ?.querySelector(`[data-anchor="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const chapters = useMemo(() => buildChapters(scaleKey, goTo), [goTo, scaleKey])

  /**
   * Le conteneur de défilement est la zone de contenu, pas la fenêtre : c'est
   * elle qu'il faut interroger pour savoir quel terme est en haut de l'écran.
   */
  useEffect(() => {
    const root = rootRef.current
    const scroller = root?.closest('.app__main')
    if (root === null || scroller === null || scroller === undefined) return

    const update = () => {
      const limit = scroller.getBoundingClientRect().top + 90
      const anchors = root.querySelectorAll<HTMLElement>('[data-anchor]')
      let current = anchors[0]?.dataset.anchor ?? ''
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= limit) current = anchor.dataset.anchor ?? current
      }
      if (current !== '') setActiveId(current)
    }

    update()
    scroller.addEventListener('scroll', update, { passive: true })
    return () => scroller.removeEventListener('scroll', update)
  }, [chapters])

  return (
    <div className="lexicon" ref={rootRef}>
      <nav className="toc" aria-label="Sommaire">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="toc__group">
            <button
              type="button"
              className="toc__chapter"
              onClick={() => goTo(chapter.id)}
            >
              {chapter.title}
            </button>
            {chapter.terms.map((term) => (
              <button
                key={term.id}
                type="button"
                className={`toc__term${activeId === term.id ? ' toc__term--active' : ''}`}
                onClick={() => goTo(term.id)}
                aria-current={activeId === term.id}
              >
                {term.name}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <article className="lexicon__body">
        <header className="bar">
          <h2>Lexique</h2>
        </header>
        <p className="hint">
          Les mots employés dans l’application, dans l’ordre où ils se construisent : d’abord le
          son, puis la gamme, puis son écriture. Chaque terme qui peut s’entendre a un bouton
          d’écoute — un intervalle se comprend mieux à l’oreille qu’à la lecture.
        </p>

        {chapters.map((chapter) => (
          <section key={chapter.id} className="lexicon__chapter">
            <h3 data-anchor={chapter.id}>{chapter.title}</h3>
            {chapter.intro}
            {chapter.terms.map((term) => (
              <div key={term.id} className="term" data-anchor={term.id}>
                <h4 className="term__name">{term.name}</h4>
                <div className="term__body">{term.body}</div>
              </div>
            ))}
            {chapter.outro}
          </section>
        ))}
      </article>
    </div>
  )
}
