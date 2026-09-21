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
