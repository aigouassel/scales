import type { ReactNode } from 'react'
import {
  DEGREE_NAMES,
  majorScale,
  naturalMinorScale,
  noteName,
  pitch,
  type Pitch,
  type ScaleKey,
} from '@scales/music-theory'
import { notePlayer } from '@scales/audio'

export interface LexiconSectionProps {
  scaleKey: ScaleKey
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

function Term({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="term">
      <h4 className="term__name">{name}</h4>
      <div className="term__body">{children}</div>
    </div>
  )
}

const C4 = pitch('C', 0, 4)
const C5 = pitch('C', 0, 5)
const D4 = pitch('D', 0, 4)
const E4 = pitch('E', 0, 4)
const EFLAT4 = pitch('E', -1, 4)
const F4 = pitch('F', 0, 4)
const G4 = pitch('G', 0, 4)
const CSHARP4 = pitch('C', 1, 4)
const DFLAT4 = pitch('D', -1, 4)

const INTERVAL_NAMES = [
  ['seconde', '1 lettre d’écart', 'do → ré'],
  ['tierce', '2 lettres', 'do → mi'],
  ['quarte', '3 lettres', 'do → fa'],
  ['quinte', '4 lettres', 'do → sol'],
  ['sixte', '5 lettres', 'do → la'],
  ['septième', '6 lettres', 'do → si'],
  ['octave', '7 lettres — la même note plus haut', 'do → do'],
] as const

export function LexiconSection({ scaleKey }: LexiconSectionProps) {
  const scale = majorScale({ ...scaleKey.tonic, octave: 4 })
  const cMajor = majorScale(C4)
  const cMinor = naturalMinorScale(C4)

  return (
    <section className="section lexicon">
      <header className="section__header">
        <div>
          <h2>Lexique</h2>
          <p className="section__lead">
            Les mots employés dans l’application, dans l’ordre où ils se construisent :
            d’abord le son, puis la gamme, puis son écriture. Chaque terme qui peut
            s’entendre a un bouton d’écoute — un intervalle se comprend mieux à l’oreille
            qu’à la lecture.
          </p>
        </div>
      </header>

      <h3>Les briques du son</h3>

      <Term name="Hauteur, et note">
        <p>
          La <strong>hauteur</strong> est la position d’un son dans l’aigu ou le grave —
          une fréquence. La <strong>note</strong> est son nom écrit : une lettre (do, ré,
          mi…), une éventuelle altération, et une octave.
        </p>
        <p>
          Les deux ne se confondent pas, et c’est ce que l’application prend au sérieux :{' '}
          <em>do♯</em> et <em>ré♭</em> sont la même hauteur mais deux notes différentes.
        </p>
      </Term>

      <Term name="Octave">
        <p>
          L’intervalle entre une note et la note du même nom immédiatement au-dessus. Sa
          fréquence est exactement doublée, et l’oreille les perçoit comme « la même
          note ». C’est pourquoi les lettres ne vont que de do à si avant de recommencer.
        </p>
        <p>
          Le chiffre d’une note indique son octave : <em>do4</em> est le do central du
          piano. <Listen notes={[C4, C5]} label="do4 puis do5" />
        </p>
      </Term>

      <Term name="Demi-ton">
        <p>
          Le plus petit écart du système occidental : d’une touche du piano à sa voisine
          immédiate, noire ou blanche. Il y en a douze dans une octave.
        </p>
        <p>
          Attention au piège visuel : <strong>mi–fa</strong> et <strong>si–do</strong> sont
          des demi-tons alors qu’aucune touche noire ne les sépare. C’est exactement pour
          cette raison que deux touches du clavier de l’ordinateur restent inertes dans
          l’application.
        </p>
        <p>
          <Listen notes={[E4, F4]} label="mi → fa, un demi-ton" />
        </p>
      </Term>

      <Term name="Ton">
        <p>
          Deux demi-tons. Do → ré est un ton, parce que do♯ se trouve entre les deux.
        </p>
        <p>
          <Listen notes={[C4, D4]} label="do → ré, un ton" />{' '}
          <Listen notes={[C4, CSHARP4]} label="do → do♯, un demi-ton" />
        </p>
      </Term>

      <Term name="Intervalle">
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
          Chaque intervalle porte ensuite une <em>qualité</em> qui précise sa taille exacte :
          une tierce est <strong>majeure</strong> (4 demi-tons) ou <strong>mineure</strong>{' '}
          (3 demi-tons) ; quartes, quintes et octaves sont dites <strong>justes</strong>.
        </p>
        <p>
          <Listen notes={[C4, E4]} label="tierce majeure" />{' '}
          <Listen notes={[C4, EFLAT4]} label="tierce mineure" />
        </p>
      </Term>

      <Term name="Quinte juste">
        <p>
          Sept demi-tons : do → sol. C’est, après l’octave, l’intervalle le plus consonant —
          les deux sons se fondent presque l’un dans l’autre. Cette proximité acoustique est
          la raison pour laquelle la quinte organise toute la théorie tonale, et donne son
          nom au <em>cycle des quintes</em> plus bas.
        </p>
        <p>
          <Listen notes={[C4, G4]} label="do → sol, quinte juste" />
        </p>
      </Term>

      <Term name="Enharmonie">
        <p>
          Deux notes <strong>enharmoniques</strong> sonnent identiques mais s’écrivent
          différemment : do♯ et ré♭, fa♯ et sol♭. Au piano, c’est la même touche.
        </p>
        <p>
          L’écriture n’est pourtant pas arbitraire : elle dépend de la gamme. En ré majeur,
          le 3<sup>e</sup> degré doit porter la lettre fa — donc fa♯, jamais sol♭, qui
          réutiliserait une lettre déjà prise.
        </p>
        <p>
          <Listen notes={[CSHARP4, DFLAT4]} label="do♯ puis ré♭ — même son" />
        </p>
      </Term>

      <h3>La gamme</h3>

      <Term name="Gamme">
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
      </Term>

      <Term name="Tonique">
        <p>
          La note de départ d’une gamme, celle qui lui donne son nom, et celle sur laquelle
          l’oreille a envie de se reposer. En {scaleKey.name}, la tonique est{' '}
          <strong>{noteName({ ...scaleKey.tonic, octave: 0 })}</strong>.
        </p>
        <p>
          C’est elle que l’application joue en référence dans le mode d’oreille relatif :
          elle installe un centre auquel comparer tout le reste.
        </p>
      </Term>

      <Term name="Degré">
        <p>
          La position d’une note dans sa gamme, comptée depuis la tonique. Le 1
          <sup>er</sup> degré est la tonique, le 5<sup>e</sup> la dominante, etc. Parler en
          degrés permet de dire la même chose dans toutes les tonalités : « la sensible
          monte vers la tonique » est vrai partout.
        </p>
        <ul className="lexicon__table">
          {DEGREE_NAMES.map((degreeName, index) => (
            <li key={degreeName}>
              <span className="lexicon__term">
                {index + 1}
                <sup>{index === 0 ? 're' : 'e'}</sup> — {degreeName}
              </span>
              <span className="lexicon__gap">
                {index === 4
                  ? 'le pôle d’attraction, à la quinte de la tonique'
                  : index === 6
                    ? 'à un demi-ton sous la tonique : elle « appelle » sa résolution'
                    : index === 2
                      ? 'c’est elle qui décide si la gamme est majeure ou mineure'
                      : ''}
              </span>
              <span className="lexicon__example">{noteName(scale[index] ?? scale[0]!)}</span>
            </li>
          ))}
        </ul>
        <p className="lexicon__caption">
          Colonne de droite : les degrés de {scaleKey.name}, la tonalité actuellement
          sélectionnée.
        </p>
      </Term>

      <Term name="Tonalité">
        <p>
          La gamme dans laquelle un morceau est écrit — une tonique plus un mode. « Ré
          majeur » est une tonalité ; elle détermine quelles notes sont attendues, et donc
          quelles altérations figurent à l’armure.
        </p>
      </Term>

      <Term name="Majeur et mineur">
        <p>
          Deux <strong>modes</strong> : deux motifs d’intervalles différents appliqués à la
          même tonique. Le majeur sonne ouvert, le mineur plus sombre — et cette couleur
          tient à trois degrés seulement, le 3<sup>e</sup>, le 6<sup>e</sup> et le 7
          <sup>e</sup>, abaissés d’un demi-ton dans le mineur naturel.
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
      </Term>

      <h3>L’écriture</h3>

      <Term name="Altération">
        <p>
          Un signe qui déplace une note d’un demi-ton sans changer sa lettre.
        </p>
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
          Une gamme n’emploie jamais les deux sens à la fois : elle est soit en dièses, soit
          en bémols. Mélanger reviendrait à réutiliser une lettre.
        </p>
      </Term>

      <Term name="Armure">
        <p>
          Les altérations groupées juste après la clé, en début de portée, valables pour
          tout le morceau. Ré majeur s’écrit normalement avec deux dièses à l’armure plutôt
          qu’un dièse devant chaque fa et chaque do.
        </p>
        <p>
          L’application écrit volontairement les altérations <strong>devant chaque note</strong> :
          c’est l’exercice le plus direct, où ce que l’on clique est exactement ce qui est
          corrigé. L’armure suppose déjà de savoir ce qu’elle contient.
        </p>
      </Term>

      <h3>L’oreille</h3>

      <Term name="Oreille absolue">
        <p>
          La capacité de nommer une note entendue seule, sans aucune référence, de façon
          immédiate — comme on dit « c’est rouge ». Elle se fixe dans l’enfance et ne
          s’acquiert quasiment jamais à l’âge adulte. Environ une personne sur dix mille la
          possède.
        </p>
      </Term>

      <Term name="Oreille relative">
        <p>
          La capacité de reconnaître une note <em>par rapport</em> à une autre : on entend
          d’abord un mouvement — « ça monte d’une tierce » — avant un nom. Elle se travaille
          à tout âge, elle progresse vite, et c’est elle que les musiciens utilisent
          réellement pour déchiffrer, transposer ou jouer d’oreille.
        </p>
        <p>
          Savoir jouer rapidement ce qu’on entend sur son instrument est un signe d’oreille
          relative excellente, pas d’oreille absolue : aucune étiquette de note n’intervient
          dans ce processus.
        </p>
      </Term>

      <h3>Pourquoi choisir sa progression&nbsp;?</h3>

      <p>
        Les douze gammes majeures peuvent se présenter dans deux ordres. Ce ne sont pas deux
        tris d’une même liste : ce sont deux façons d’apprendre, et elles ne servent pas au
        même moment.
      </p>

      <Term name="Ordre des degrés — do, ré, mi, fa, sol, la, si">
        <p>
          L’ordre alphabétique des notes, celui dans lequel on les a apprises. Son avantage
          est l’<strong>accès direct</strong> : on cherche « la gamme de ré » et on la trouve
          là où on l’attend. C’est l’ordre utile quand on travaille un morceau précis, ou
          qu’on révise une tonalité isolée.
        </p>
        <p>
          Son défaut est que la difficulté n’y est pas graduelle. On passe de{' '}
          <strong>mi majeur</strong> (4 dièses) à <strong>fa majeur</strong> (1 bémol) : non
          seulement le nombre d’altérations chute, mais on change de camp. Rien dans une
          gamme ne prépare à la suivante, et chacune doit donc être mémorisée comme un fait
          isolé.
        </p>
      </Term>

      <Term name="Cycle des quintes — do, sol, ré, la, mi…">
        <p>
          Chaque gamme démarre sur la <strong>quinte</strong> de la précédente : do → sol →
          ré → la… Et à chaque pas, <strong>une seule altération s’ajoute</strong>, jamais
          deux, jamais zéro.
        </p>
        <p className="lexicon__compare lexicon__compare--stacked">
          <span>do — aucune altération</span>
          <span>sol — 1 ♯ &nbsp;(fa♯)</span>
          <span>ré — 2 ♯ &nbsp;(fa♯ do♯)</span>
          <span>la — 3 ♯ &nbsp;(fa♯ do♯ sol♯)</span>
          <span>mi — 4 ♯ &nbsp;(fa♯ do♯ sol♯ ré♯)</span>
        </p>
        <p>
          Ce n’est pas une coïncidence. La gamme construite sur le 5<sup>e</sup> degré d’une
          autre partage six de ses sept notes ; la seule qui change est celle qui doit monter
          d’un demi-ton pour devenir la nouvelle sensible. D’où l’altération unique.
        </p>
        <p>
          Cet ordre a deux vertus. D’abord, chaque gamme <strong>s’appuie sur la
          précédente</strong> : au lieu de mémoriser douze faits, on retient un mécanisme.
          Ensuite, il donne gratuitement l’<strong>ordre des dièses à l’armure</strong> — fa,
          do, sol, ré, la, mi, si — qui est lui-même une suite de quintes, et celui des
          bémols, qui est le même lu à l’envers.
        </p>
      </Term>

      {/* Un .callout dispose ses enfants en colonne : le texte courant doit
          passer par un paragraphe, sinon chaque <strong> et <em> devient une
          ligne à lui seul. */}
      <div className="callout callout--hint">
        <p>
          <strong>En pratique.</strong> Le cycle des quintes est le meilleur ordre pour{' '}
          <em>découvrir</em> et comprendre les gammes ; l’ordre des degrés est le meilleur
          pour <em>retrouver</em> une gamme dont on a besoin. D’où le sélecteur : la question
          n’est pas laquelle est correcte, mais ce que l’on est en train de faire.
        </p>
      </div>
    </section>
  )
}
