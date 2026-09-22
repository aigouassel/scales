# Gammes

> Une gamme, trois portes d’entrée.

Une application web pour apprendre les gammes majeures au piano. Chaque gamme
s’y travaille sous trois angles — l’**écrire** sur une portée, la **jouer** au
clavier, la **reconnaître** à l’oreille — adossés à un seul et même modèle
musical.

Ce n’est pas un assemblage de trois mini-jeux : c’est un objet unique, la
gamme, regardé de trois façons. La progression se suit **par gamme**, pas par
exercice.

**→ [aigouassel.github.io/scales](https://aigouassel.github.io/scales/)**

```bash
yarn install
yarn dev
```

Chaque poussée sur `main` relance les tests, la vérification des types, la
construction, puis publie le résultat sur GitHub Pages.

---

## Les trois sections

### Exercices — écrire la gamme

Une portée vide et huit emplacements. On pose les notes à la souris, on choisit
l’altération avant de cliquer, on valide à la fin. L’application compare
l’écriture note à note et montre la gamme attendue en cas d’erreur.

La correction arrive **à la validation, pas note par note** : il faut s’engager
sur les huit notes avant de savoir. Un retour immédiat permettrait de réussir
par tâtonnement, sans jamais raisonner.

Elle distingue trois cas, et non deux. Une note peut être juste, fausse, ou
**enharmonique** — le bon son avec la mauvaise lettre. Écrire sol♭ au 3ᵉ degré
de ré majeur sonne parfaitement juste : c’est une faute de grammaire, pas
d’oreille. L’application la signale dans sa propre couleur et l’explique : « la
lettre sol est celle du 4ᵉ degré ». Les traiter comme de simples fausses notes
priverait de la seule occasion de comprendre pourquoi l’orthographe n’est pas
libre.

### Jouer — le clavier sous les doigts

Un piano d’une octave joué à la souris ou au clavier de l’ordinateur. Les
touches de la gamme en cours sont surlignées, et chaque note jouée affiche son
degré dans la tonalité.

### Lexique — les mots du solfège

Un petit cours : hauteur, octave, ton et demi-ton, intervalle, quinte juste,
enharmonie, gamme, tonique, degré, tonalité, majeur et mineur, altérations,
armure, oreille absolue et relative.

Chaque terme qui peut s’entendre a un bouton d’écoute — un intervalle se
comprend mieux à l’oreille qu’à la lecture. Un développement sur l’**enharmonie**
montre, deux portées côte à côte, pourquoi écrire mi♭ au 7ᵉ degré de mi majeur
est une faute qui ne s’entend pas mais se lit. La page se termine sur ce que les
deux progressions apportent respectivement.

Les exemples suivent la tonalité sélectionnée : les degrés affichés sont ceux
de la gamme en cours d’étude.

### Oreille — reconnaître les notes

Une note est jouée, on la retrouve sur le clavier. Deux modes, un seul moteur :

| Mode | Référence | Tirage |
| --- | --- | --- |
| **Relatif** | la tonique est jouée d’abord | les 7 notes de la gamme étudiée, hors tonique |
| **Absolu** | aucune | les 12 notes chromatiques |

Le mode absolu est un **terrain d'entraînement, pas un instrument de mesure**,
et l'interface le dit : on y entend la note qu'on joue et on lit la réponse
après chaque essai, ce qui laisse un repère pour la question suivante.

Une case **« Masquer entre les notes »** referme ce repère quand on le
souhaite : un agrégat chromatique de deux secondes s'intercale avant chaque
note et efface de la mémoire à la fois la note précédente **et** celle qu'on
vient de jouer soi-même.

Une **analyse des réponses** accompagne les deux modes. Elle ne compte pas les
bonnes réponses : elle regarde la forme des erreurs et la régularité des
latences — c'est-à-dire *comment* la réponse a été trouvée, et non *combien*
de fois.
---

## Le clavier AZERTY

```
  z    e         t    y    u         o
 do♯  ré♯       fa♯  sol♯ la♯       do♯
  q    s    d    f    g    h    j    k    l
 do4  ré4  mi4  fa4  sol4 la4  si4  do5  ré5
           └─┬─┘                └─┬─┘
       pas de touche noire   pas de touche noire

  Maj (gauche ou droite, maintenue)  →  tout monte d'une octave
```

Deux rangées, do4 à ré5. **Maintenir `Maj` élève le clavier d'une octave**, ce
qui porte l'étendue jouable à un peu plus de deux octaves sans ajouter une
seule touche à mémoriser. Relâcher redescend.

Les deux touches `Maj` font la même chose, et ce n'est pas une redondance : la
main qui tient `Maj` ne joue pas. Selon qu'on travaille la main droite ou la
main gauche, ce n'est pas la même qui est libre.

Le décalage est **maintenu, non verrouillé**. Une bascule obligerait à se
souvenir de l'état courant ; maintenir le rend visible dans la main, et le
relâchement ramène toujours au même point de départ. L'étendue courante
s'affiche au-dessus du clavier, parce qu'une classe de hauteur porte le même
nom à toutes les octaves — rien à l'écran ne distingue autrement un do4 d'un
do5.

```
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
qu’à l’état partiel et fragile. Bâtir l’exercice uniquement là-dessus condamnerait la plupart
des utilisateurs à échouer sans progresser.

L’**oreille relative** — reconnaître une note par rapport à une référence — se
travaille à tout âge, et c’est elle que les musiciens utilisent réellement.
Mieux : « reconnaître le 3ᵉ degré de ré » et « savoir que ré majeur contient
fa♯ » sont la même connaissance par deux portes.

D’où le découpage : l’utilisateur **choisit** son mode, et un test séparé
**mesure** son oreille sans rien imposer.

### Un exercice d’oreille fuit de partout

Croire qu’il suffit de jouer une note au hasard est une erreur. Cinq chemins
permettent de répondre juste **sans nommer la note**, et chacun a demandé sa
propre parade.

| Fuite | Ce qu’elle permettait | Parade |
| --- | --- | --- |
| Octave figée | le registre ne variait jamais | tirage sur trois octaves |
| Notes voisines | comparer de proche en proche | écart d’au moins une quarte |
| Note précédente en tête | s’en servir comme diapason | agrégat chromatique, en option |
| **Sa propre réponse** | on entend une note dont on connaît le nom | le même agrégat |
| Corrigé immédiat | il nomme la note qu’on vient d’entendre | idem |

Les trois dernières tiennent au même fait : après avoir répondu, on dispose
d’un son *nommé* à deux secondes de la question suivante. Un masque de deux
secondes les ferme toutes les trois d’un coup — c’est pour cela qu’il est une
case à cocher unique et non trois réglages.

Le masque reste optionnel parce qu’il coûte cher : il est désagréable, et il
allonge chaque question. L’exercice doit rester praticable ; c’est à
l’utilisateur de décider quand il veut se serrer la vis.

### Un score ne dit pas comment on a répondu

Le nombre de bonnes réponses ne distingue pas « nommer » de « calculer depuis
un repère ». Trois mesures le font :

- **L’effet d’ancrage.** Si l’on s’appuie sur la note précédente, la réussite
  doit chuter quand l’intervalle grandit. Une oreille absolue est indifférente
  à la distance. L’écart entre les deux taux teste directement l’hypothèse,
  sans rien demander d’introspectif.
- **L’erreur en miroir.** Répondre une note située à la même distance de la
  précédente que la bonne, mais de l’autre côté — la confusion quarte/quinte.
  C’est un intervalle bien dimensionné et mal orienté : un geste que seule une
  stratégie par intervalle peut produire.
- **La régularité des latences.** L’oreille absolue est un accès lexical :
  rapide, et surtout *constant*. C’est la variance qui trahit le calcul, pas
  la moyenne.

Chacune de ces formes survient aussi par hasard — sur onze réponses fausses,
deux sont à un demi-ton et une est le miroir. Seule leur **part**, comparée à
cette base, est interprétable.

### Compter juste

`chanceProbability` calcule la queue d’une loi binomiale de paramètre 1/12 :
la probabilité d’obtenir ce score, ou mieux, par pur hasard.

L’intuition se trompe lourdement ici, et dans les deux sens. Avec douze
alternatives, 3 bonnes réponses sur 10 ont une probabilité de 0,044 d’être dues
au hasard — déjà significatif — tandis que 2 sur 2 font 100 % sans rien
prouver du tout. Un chiffre calculé vaut mieux qu’un palier écrit à la main.

Le calcul se fait en logarithmes : sur 84 essais, les coefficients binomiaux
dépassent ce qu’un `double` représente, pas leurs logarithmes.

### L’écriture est muette

Poser une note sur la portée ne produit aucun son, et ce n’est pas un oubli.

Entendre chaque note en l’écrivant change la nature de l’exercice : on cesse de
**dériver** la gamme de ses règles pour la **chercher** à l’oreille. C’est un
travail légitime — c’est même exactement celui de la page « Oreille », qui le
fait mieux, avec un tirage et une correction faits pour ça.

L’argument est plus fort encore pour les altérations. Le son ne distingue pas
do♯ de ré♭ : il ne dit donc rien de la seule chose qu’on décide en appuyant sur
les flèches. Sonner ici, ce serait donner un retour qui ne porte pas sur la
question posée.

On entend sa gamme quand on le demande — « Écouter ma gamme » — et la lecture
qui récompense une réponse juste reste. Le premier clic sur la portée
déverrouille tout de même l’audio en silence : les navigateurs exigent un geste
utilisateur, et charger les échantillons de piano prend quelques secondes.
Sans cette amorce, la récompense arriverait en retard.

### Poser d’abord, altérer ensuite

Un clic pose toujours une note **naturelle** ; <kbd>↑</kbd> et <kbd>↓</kbd>
l’altèrent ensuite d’un demi-ton.

Une palette ♭ / ♮ / ♯ jouait ce rôle au départ. Elle imposait de décider avant
d’écrire, et surtout, quand elle agissait aussi sur la note sélectionnée, elle
produisait l’inverse de ce qu’on attendait : comme poser une note la
sélectionne, régler le bémol de la note *suivante* altérait silencieusement la
*précédente*. Poser puis ajuster supprime la question de l’ordre — et les trois
boutons avec elle.

---

## Architecture

```
packages/
  music-theory/   TypeScript pur, zéro dépendance — hauteurs, gammes,
                  progressions, tirage et diagnostic des exercices d'oreille. 98 tests.
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
| Persistance | `localStorage` | Progression et préférences ; pas de serveur |

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
  pas un exercice. Le basculement est silencieux : seul le timbre change.

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
