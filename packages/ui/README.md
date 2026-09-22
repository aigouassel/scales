# `@scales/ui`

Les deux composants partagés par les trois sections : le clavier et la portée.
Ils sont volontairement **sans mémoire** — ils reçoivent un état et émettent
des intentions ; c’est l’application qui décide ce qu’un clic signifie.

```ts
import { Piano, Staff } from '@scales/ui'
import '@scales/ui/styles.css'
```

---

## `Piano`

Un clavier d’une octave — do4 à ré5 — jouable à la souris et au clavier de
l’ordinateur.

### Pourquoi `event.code` et non `event.key`

`code` désigne la **position physique** de la touche, indépendamment de la
disposition installée : la touche que l’AZERTY nomme « q » se trouve là où le
QWERTY met « a », et remonte donc comme `KeyA`. Raisonner en position garantit
que la main garde la même forme partout — et c’est une géométrie qu’on apprend,
pas des lettres.

Les libellés affichés viennent de l’API
[Keyboard Map](https://developer.mozilla.org/docs/Web/API/Keyboard/getLayoutMap)
quand le navigateur la propose (Chromium), avec l’AZERTY en repli.

```
  z    e         t    y    u         o
 do♯  ré♯       fa♯  sol♯ la♯       do♯
  q    s    d    f    g    h    j    k    l
 do4  ré4  mi4  fa4  sol4 la4  si4  do5  ré5
           └─┬─┘                └─┬─┘
              r                    i        ← inertes, comme le piano
```

`r` et `i` sont rendues visibles mais inactives : les montrer enseigne pourquoi
il n’y a pas de touche noire entre mi et fa, ni entre si et do.

### Maj élève l’octave, sans la verrouiller

`slotToPitch(slot, preferFlats, octaveShift)` transpose une touche sans
toucher à son orthographe : une octave plus haut, do♯ reste do♯. C’est le même
degré, joué ailleurs — transposer n’est pas réécrire.

L’état ne compte pas les appuis sur `ShiftLeft` et `ShiftRight` : il se lit sur
`event.shiftKey`, qui vaut pour les deux touches et reste juste même si un
`keyup` se perd. Un écouteur sur `blur` complète le filet, car quitter la
fenêtre en tenant une touche ne produit aucun `keyup` — sans lui, on revient
sur une octave haute que plus rien ne justifie.

La classe de hauteur étant préservée, le surlignage de la gamme survit au
décalage : les mêmes touches restent marquées en haut comme en bas.

### L’orthographe des touches noires

Une touche noire n’a pas de nom absolu : la même est do♯ en ré majeur et ré♭ en
la♭ majeur. `preferFlats` tranche, et les notes passées en `highlighted`
imposent leur propre orthographe — en sol♭ majeur, la touche blanche si
s’affiche do♭.

Le surlignage compare les **sons** (`pitchClass`) et non l’écriture, pour cette
raison exacte.

### Props principales

| Prop | Rôle |
| --- | --- |
| `preferFlats` | écrit les noires en bémols |
| `highlighted` | notes de la gamme à mettre en évidence |
| `feedback` | marques correct/faux ; **plusieurs à la fois**, pour montrer la bonne note à côté de l’erreur |
| `captureKeyboard` | écoute du clavier physique |
| `onNote` | remonte la note jouée |

---

## `Staff`

Une portée en clé de sol, avec un nombre fixe d’emplacements que l’on remplit
au clic.

### VexFlow ne sait que graver

Il n’existe pas de « portée cliquable » dans [VexFlow](https://github.com/0xfe/vexflow) :
l’édition est construite par-dessus.

- **Clic → hauteur.** L’ordonnée est convertie en degré diatonique à partir de
  la géométrie réelle du rendu : en clé de sol la ligne du haut porte un fa5,
  et chaque demi-interligne vaut un degré.
- **Emplacements vides.** Ce sont des `GhostNote` : elles occupent la place
  sans rien dessiner, ce qui garde la mise en page **stable** pendant qu’on
  écrit. Sans elles, chaque note posée déplacerait les précédentes.
- **Alignement sur la grille.** Deux pièges de VexFlow se cumulaient ici.

  `getAbsoluteX()` n’ajoute l’origine de la portée que si la note connaît déjà
  sa portée, et `voice.draw()` ne la lui attache qu’au dernier moment
  (`voice.setStave()` ne la propage pas à ses tickables). Mesurer avant donnait
  donc des abscisses amputées de `getNoteStartX()`, et la note se dessinait un
  emplacement trop à droite. La portée est maintenant attachée à chaque note
  avant toute mesure.

  Ensuite, la place réservée à gauche de la tête pour l’altération n’est pas
  prévisible exactement depuis la géométrie pré-dessin. Plutôt que de la
  deviner, la portée **mesure le dessin obtenu** et recale chaque tête sur le
  centre de son emplacement, à la lecture du `getBBox()` du groupe de notehead.

  Le recalage est une **translation SVG du groupe dessiné**, et non un
  `setXShift()` avant rendu. `setXShift()` déplace bien la tête, mais laisse
  ses modificateurs là où le formateur les avait posés : l’altération se
  détachait de sa note, d’autant plus que le décalage était grand. Une
  translation emporte tout — tête, altération, hampe, lignes supplémentaires —
  et préserve la gravure telle que VexFlow l’a calculée.
- **Échelle déduite de la place disponible.** À la taille native, un
  demi-interligne fait 5 px — une cible trop petite pour viser une hauteur à la
  souris. La portée mesure la boîte qu’on lui alloue et agrandit tout
  uniformément (entre 1,15 et 1,8), plutôt que d’écarter les seules lignes, ce
  qui donnerait des têtes de notes trop petites. C’est le parent qui décide de
  la hauteur ; le composant s’y adapte au lieu d’imposer la sienne.

  Le `ResizeObserver` ne remonte un changement que si la boîte arrondie a
  vraiment bougé : un `setState` inconditionnel dans un observateur qui
  influence sa propre cible produit une boucle de redimensionnement.

### Le thème

VexFlow grave en noir, ce qui disparaît sur fond sombre. La couleur d’encre est
lue sur le conteneur (`getComputedStyle(...).color`) et appliquée au contexte
de rendu ; les **lignes supplémentaires** ont leur propre style dans VexFlow et
doivent être traitées à part, sans quoi le do central reste invisible. Un
changement de thème système redéclenche le dessin.
