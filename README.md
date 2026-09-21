# Gammes

> Une gamme, trois portes d’entrée.

Une application web pour apprendre les gammes majeures au piano. Chaque gamme
s’y travaille sous trois angles — l’**écrire** sur une portée, la **jouer** au
clavier, la **reconnaître** à l’oreille — adossés à un seul et même modèle
musical.

Ce n’est pas un assemblage de trois mini-jeux : c’est un objet unique, la
gamme, regardé de trois façons. La progression se suit **par gamme**, pas par
exercice.

```bash
yarn install
yarn dev
```

---

## Les trois sections

### Exercices — écrire la gamme

Une portée vide et huit emplacements. On pose les notes à la souris, on choisit
l’altération avant de cliquer, on valide à la fin. L’application compare
l’écriture note à note et montre la gamme attendue en cas d’erreur.

La correction arrive **à la validation, pas note par note** : il faut s’engager
sur les huit notes avant de savoir. Un retour immédiat permettrait de réussir
par tâtonnement, sans jamais raisonner.

### Jouer — le clavier sous les doigts

Un piano d’une octave joué à la souris ou au clavier de l’ordinateur. Les
touches de la gamme en cours sont surlignées, et chaque note jouée affiche son
degré dans la tonalité.

### Lexique — les mots du solfège

Un petit cours : hauteur, octave, ton et demi-ton, intervalle, quinte juste,
enharmonie, gamme, tonique, degré, tonalité, majeur et mineur, altérations,
armure, oreille absolue et relative.

Chaque terme qui peut s’entendre a un bouton d’écoute — un intervalle se
comprend mieux à l’oreille qu’à la lecture. La page se termine sur ce que les
deux progressions apportent respectivement.

Les exemples suivent la tonalité sélectionnée : les degrés affichés sont ceux
de la gamme en cours d’étude.

### Oreille — reconnaître les notes

Une note est jouée, on la retrouve sur le clavier. Deux modes, un seul moteur :

| Mode | Référence | Tirage |
| --- | --- | --- |
| **Relatif** | la tonique est jouée d’abord | les 7 notes de la gamme étudiée, hors tonique |
| **Absolu** | aucune | les 12 notes chromatiques |

Un **test de calibrage** optionnel — dix notes sans référence, dispersées sur
trois octaves — mesure laquelle des deux oreilles on possède. Il est
informatif : il ne verrouille aucun mode.

---

## Le clavier AZERTY

```
  z    e         t    y    u         o
 do♯  ré♯       fa♯  sol♯ la♯       do♯
  q    s    d    f    g    h    j    k    l
 do4  ré4  mi4  fa4  sol4 la4  si4  do5  ré5
           └─┬─┘                └─┬─┘
       pas de touche noire   pas de touche noire
         entre mi et fa       entre si et do
              (r)                  (i)
```

Les touches `r` et `i` sont **volontairement inertes** : elles tombent là où le
piano n’a pas de touche noire. La rangée du haut reproduit la géométrie réelle
de l’instrument, trous compris.

L’application écoute `event.code` et non `event.key` : `code` désigne la
position *physique* de la touche, indépendamment de la disposition installée.
La main garde ainsi la même forme partout — et c’est une géométrie qu’on
apprend, pas des lettres. Les libellés affichés viennent de l’API
[Keyboard Map](https://developer.mozilla.org/docs/Web/API/Keyboard/getLayoutMap)
quand le navigateur la propose, avec l’AZERTY en repli.

---

## Décisions de conception

### Une note n’est pas un numéro MIDI

Le MIDI 61 désigne aussi bien do♯ que ré♭. Or en ré majeur, écrire ré♭ est une
**faute** : le 7ᵉ degré doit porter la lettre do, puisque chaque lettre
n’apparaît qu’une fois. Une note est donc `{ lettre, altération, octave }` ; le
MIDI n’est calculé qu’au moment de produire un son.

Sans cette distinction, aucune correction d’écriture n’est possible.

### Les gammes sont générées, pas listées

`majorScale()` déduit les huit notes de deux règles :

1. le motif d’intervalles **ton · ton · ½ · ton · ton · ton · ½**, qui fixe le
   *son* de chaque degré ;
2. **une lettre par degré**, qui fixe son *écriture*.

En ré, la règle 1 impose un son à 4 demi-tons de la tonique pour le 3ᵉ degré ;
la règle 2 impose la lettre fa. Il ne reste que fa♯. Une table écrite à la main
aurait été plus rapide, mais le code ne contiendrait alors aucune théorie — et
une coquille y serait invisible.

Les tonalités **théoriques** (sol♯ majeur, qui exige un fa double dièse) sont
détectées et écartées de l’apprentissage, pas interdites.

### Deux progressions, deux pédagogies

| | Ordre | Ce que ça enseigne |
| --- | --- | --- |
| **Ordre des degrés** | do, ré, mi, fa… | L’ordre intuitif. La difficulté saute : mi majeur compte 4 dièses, fa majeur 1 bémol. |
| **Cycle des quintes** | do, sol, ré, la… | Chaque gamme ajoute **une seule** altération à la précédente. La structure devient visible. |

Les deux listes n’emploient pas toujours la même orthographe pour une même
hauteur : sol♭ se lit naturellement entre fa et sol dans l’ordre des degrés,
alors que le cycle des quintes atteint fa♯ par le côté des dièses. C’est
volontaire — l’orthographe d’une tonalité dépend du chemin parcouru.

### Oreille absolue et oreille relative

Reconnaître une note isolée, sans référence, suppose l’**oreille absolue** :
une capacité qui se fixe dans l’enfance et que l’entraînement adulte ne produit
quasiment jamais. Bâtir l’exercice uniquement là-dessus condamnerait la plupart
des utilisateurs à échouer sans progresser.

L’**oreille relative** — reconnaître une note par rapport à une référence — se
travaille à tout âge, et c’est elle que les musiciens utilisent réellement.
Mieux : « reconnaître le 3ᵉ degré de ré » et « savoir que ré majeur contient
fa♯ » sont la même connaissance par deux portes.

D’où le découpage : l’utilisateur **choisit** son mode, et un test séparé
**mesure** son oreille sans rien imposer.

Le test disperse ses notes sur trois octaves et impose au moins une quarte
entre deux notes consécutives. Sans cet écart, on pourrait répondre en
comparant à la note précédente encore en mémoire — c’est-à-dire à l’oreille
relative, précisément ce que le test doit exclure. Il ne donne aucun retour
avant la fin, pour la même raison : corriger note par note apprendrait à
répondre.

### Ce que la palette d’altération fait — et ne fait pas

La palette ♭ / ♮ / ♯ est une **plume** : elle règle ce qui sera écrit au
prochain clic, et ne touche à aucune note déjà posée. La faire agir aussi sur
la note sélectionnée paraissait pratique, mais produisait l’inverse : comme
poser une note la sélectionne, choisir un bémol pour la note *suivante*
altérait silencieusement la *précédente*. Pour corriger, on réécrit.

---

## Architecture

```
packages/
  music-theory/   TypeScript pur, zéro dépendance — hauteurs, gammes,
                  progressions, tirage des exercices d'oreille. 64 tests.
  audio/          Web Audio : échantillons de piano, synthétiseur de repli.
  ui/             Composants partagés : le clavier, la portée cliquable.
apps/
  web/            L'application : les trois sections, la persistance locale.
```

Le noyau `music-theory` ne connaît ni React, ni le DOM, ni l’audio. Trois
bénéfices concrets :

- il se teste au Vitest sans monter de navigateur, et c’est le genre de code où
  un test attrape une faute de théorie musicale que l’œil ne voit pas ;
- les trois sections interrogent la même fonction : impossible que l’une
  accepte fa♯ là où l’autre attend sol♭ ;
- changer de bibliothèque de notation ne toucherait pas à la théorie.

C’est une **couche domaine** au sens DDD, appliquée à un domaine dont les
règles métier sont des règles de solfège.

Les paquets exposent leur source TypeScript directement (`"exports": "./src/index.ts"`),
selon le pattern des *internal packages* : le bundler compile, aucune étape de
build intermédiaire entre les workspaces.

---

## Choix techniques

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Monorepo | Yarn 4 (`nodeLinker: node-modules`) | Workspaces natifs, pas de friction PnP avec Vite |
| Base | Vite + React 19 + TypeScript strict | Aucun serveur nécessaire |
| Notation | [VexFlow 5](https://github.com/0xfe/vexflow) | La référence pour graver une portée en JS |
| Son | Web Audio + [smplr](https://github.com/danigb/smplr) | Échantillons de vrai piano ; le timbre compte pour l’oreille |
| Tests | Vitest, sur `music-theory` uniquement | Le seul endroit où la justesse est vérifiable |
| Persistance | `localStorage` | Progression et calibrage ; pas de serveur |

**VexFlow ne sait que graver.** Il n’existe pas de « portée cliquable » toute
faite : l’édition est construite par-dessus. L’ordonnée du clic est convertie
en degré diatonique à partir de la géométrie réelle du rendu — ligne du haut =
fa5 en clé de sol, un demi-interligne par degré — et les emplacements vides
sont des notes fantômes, pour que la mise en page ne bouge pas quand on écrit.

Le dessin est agrandi 1,6 fois : à l’échelle native de VexFlow, un demi-interligne
fait 5 px, soit une cible trop petite pour viser une hauteur à la souris.

### Compromis assumés

- **Le bundle pèse ~1,4 Mo** (gzip ~770 Ko), presque entièrement VexFlow et ses
  polices musicales. Acceptable pour une application locale ; à découper si
  elle devait être servie publiquement.
- **Les échantillons de piano viennent d’un CDN.** S’ils ne se chargent pas, un
  synthétiseur additif prend le relais : un exercice d’oreille sans son n’est
  pas un exercice. Le pied de page indique quel moteur joue.

---

## Commandes

| Commande | Effet |
| --- | --- |
| `yarn dev` | Serveur de développement |
| `yarn build` | Build de production |
| `yarn preview` | Sert le build |
| `yarn test` | Tests du noyau musical |
| `yarn test:watch` | Idem, en continu |
| `yarn typecheck` | Vérification des types sur tous les workspaces |

---

## Mise en page

Les trois sections de travail — Exercices, Jouer, Oreille — tiennent
**exactement dans la fenêtre** et ne défilent pas : ce sont des instruments,
qu’on veut entiers et au même endroit, comme un pupitre. La portée et le
clavier mesurent la place qu’on leur laisse et s’y adaptent.

Le Lexique fait exception : c’est un texte long, il défile, et un sommaire
collé en marge suit la lecture.

---

## Documentation

- [`docs/v1.md`](docs/v1.md) — ce que permet la première version, les
  décisions qui la définissent, ses limites et les pistes qui suivraient.
- [`docs/v2.md`](docs/v2.md) — la reprise de la mise en page : pleine fenêtre,
  barre de navigation, sommaire du lexique.
- [`packages/music-theory`](packages/music-theory/README.md) — le noyau musical.
- [`packages/audio`](packages/audio/README.md) — la lecture des notes.
- [`packages/ui`](packages/ui/README.md) — le clavier et la portée.
- [`apps/web`](apps/web/README.md) — l’application.

---

## Ce qui n’est pas fait

Par choix de périmètre, pas par oubli :

- **L’armure** — les altérations sont écrites devant chaque note, pas groupées
  à la clé. C’est l’exercice le plus direct ; l’armure est un second niveau.
- **Une seule octave**, en clé de sol. Ni grande portée, ni main gauche.
- **Gammes majeures seulement** — ni mineures naturelles, harmoniques ou
  mélodiques, ni modes.
- **Pas de doigtés**, alors qu’ils sont au cœur de la pratique pianistique des
  gammes.
- **Pas de suivi dans le temps** : la progression retient les gammes écrites
  sans faute, rien de plus.
