# Gestion des `Action` (`Actions.h` / `Actions.cpp`)

Ce document explique le fonctionnement de la classe `Action`, qui modélise **une sortie
pilotable** du routeur (Triac, relais/SSR, sortie PWM). Chaque `Action` gère elle-même :
- son état matériel (GPIO, ordres On/Off, PWM),
- sa programmation en jusqu'à **8 périodes horaires** avec seuils de puissance et de
  température,
- ses conditions de dépendance à une autre action (locale ou sur un autre ESP32, "RMS" =
  "Routeur Multi Sources"),
- une sécurité de température forçant l'ouverture en mode Routage.

Le reste du firmware (`Solar_Router_V17_25.ino`, `Server.ino`, `Stockage.ino`, `EnvoiMQTT.ino`,
`RMS_Externes.ino`, `EcranLCD.ino`, `Heure.ino`) manipule un tableau global d'instances :

```cpp
Action LesActions[LES_ACTIONS_LENGTH];   // LES_ACTIONS_LENGTH = 10 (Solar_Router_V17_25.ino)
```

`LesActions[0]` est toujours l'action réservée au **Triac** (découpe de phase). Les indices
`1..NbActions-1` sont les relais/SSR/sorties PWM configurables par l'utilisateur.

## 1. Cycle de vie d'une action

### Construction

- `Action()` : constructeur par défaut (`Gpio = -1`), utilisé pour l'allocation initiale du
  tableau `LesActions`.
- `Action(int aIdx)` : construit l'action d'index `aIdx` avec des valeurs par défaut sûres
  (Actif = 0/Inactif, Kp/Ki/Kd = 10, toutes les périodes à 0, températures de garde à `-1600`
  = "non utilisé"). Appelé pour chaque action dans `setup()` (`LesActions[i] = Action(i);`).

### Configuration (persistance)

Les champs publics de l'objet ne sont **pas** modifiés via les méthodes `Definir()`/`Lire()`
déclarées dans `Actions.h` (ces deux méthodes, ainsi que `Activer()`, sont déclarées mais
**non implémentées/non utilisées** dans le code actuel — vestiges d'une API prévue mais
abandonnée au profit d'un accès direct aux champs publics). En pratique, la configuration
est lue/écrite directement champ par champ :
- **Chargement** depuis `/parametres.json` (LittleFS) dans `DeserializeConfiguration()`
  (`Stockage.ino`, ~ligne 366) : remplit `Actif`, `Titre`, `Host`, `Port`, `OrdreOn/Off`,
  `Repet`, `Tempo`, `Kp/Ki/Kd`, `PID`, `ForceOuvre`, `NbPeriode`, puis chaque période
  `Type/Hdeb/Hfin/Vmin/Vmax/ONouvre/Tinf/Tsup/TinfForce/TsupForce/Hmin/Hmax/CanalTemp/SelAct/
  Ooff/O_on/Tarif`.
- **Sauvegarde** vers JSON dans `RecordFichierParametres()` (`Stockage.ino`, ~ligne 510) :
  réécrit les mêmes champs en sens inverse.
- La page web **Actions** (`PageActions.h` + handlers `handleActions*` dans `Server.ino`)
  permet à l'utilisateur d'éditer ces champs via `/ajax_*`.

### Initialisation matérielle

- `InitGpio(int FreqPWM)` : à partir de la chaîne `OrdreOn` au format `"<gpio>|<niveauOn>"`
  (ex. `"25|1"`), extrait le numéro de GPIO et le niveau logique "On", en déduit `OutOff`
  (l'inverse binaire), puis :
  - configure un canal `ledcAttachChannel` si `Actif == MODE_PWM (4)`,
  - sinon configure la broche en `OUTPUT` et la met à son niveau "Off".
  Appelé pour chaque action (sauf l'action Triac, index 0) dans `InitGPIOs()` du sketch
  principal, après `setup()`.

## 2. Détermination du mode actif à un instant donné

À chaque cycle de régulation (boucle principale, cœur 1), le firmware appelle
`ParaEnCours()` (ou l'équivalent `TypeEnCours()` pour les usages qui n'ont besoin que du
type) pour connaître l'action à effectuer *maintenant* :

```cpp
Action::ParaPeriode P = LesActions[i].ParaEnCours(HeureCouranteDeci, laTemperature, LTARFbin, Retard[i]);
```

`ParaPeriode` est une struct légère `{ int Type; int Vmin; int Vmax; }`.

### 2.1 Recherche de la période active

Chaque action a jusqu'à `NbPeriode` (max 8) tranches horaires définies par `Hdeb[i]`/`Hfin[i]`
(heure décimale ×100, "Ne pas toucher" côté JS). La boucle parcourt les périodes et retient la
**dernière** dont l'intervalle contient `Heure` (donc en cas de chevauchement, la période de
plus haut indice gagne).

Pour la période retenue, `Type[i]` code le mode de sortie :

| Valeur | Signification |
|---|---|
| 0 | NO — non utilisé |
| 1 | OFF |
| 2 | ON |
| 3 | PW — régulation (Routage : Triac en découpe, relais en train/multi de sinus, PWM...) |
| 4 | Triac (usage historique, voir aussi les modes `MODE_*` du sketch principal) |

`P.Type` démarre à `1` (Off) par défaut, et n'est mis à `Type[i]` que si `ConditionsOk` reste
vrai pour cette période (voir ci-dessous). `P.Vmin`/`P.Vmax` reprennent `Vmin[i]`/`Vmax[i]`
(seuils de puissance : seuil d'enclenchement / seuil d'arrêt ou d'ouverture max), sauf en
mode `ON` (`Type==2`) où `Vmax` est remplacé par `ONouvre[i]` (ouverture plafond quand
forcé "On").

### 2.2 Conditions de validité (`ConditionsOk`)

Pour chaque période testée, la période n'est retenue que si **toutes** les conditions
suivantes sont vraies :

1. **Température** (si `Temperature > -100.0`, c.-à-d. sonde valide) :
   - Si `Tinf[i]` et `Tsup[i]` sont tous deux `< 1500` et `Tinf[i] < Tsup[i]` : hystérésis
     classique. La variable membre `Tseuil` (état conservé entre appels) bascule entre
     `Tinf[i]` et `Tsup[i]` suivant que la température est au-dessus des deux ou en-dessous
     des deux ; la période est invalidée si `Tempx10 > Tseuil`.
   - Sinon (pas de vraie plage hystérésis), on applique des seuils simples indépendants :
     `Tinf[i] <= 1000` et température au-dessus → invalide (trop chaud, on coupe) ;
     `Tsup[i] <= 1000` et température en-dessous → invalide (trop froid, on coupe).
2. **Tarif** : si `Ltarfbin > 0` (un bit de tarif Linky/compteur est actif) et que ce bit
   n'est pas présent dans le masque `Tarif[i]`, la période est invalidée.
3. **Dépendance à une autre action** (`SelAct[i] != 255`) : la période peut être conditionnée
   par l'état d'une action de référence (locale ou distante via RMS, voir §4). Si
   `ExtValide == 0` (donnée externe non reçue/périmée) ou si les bornes `Hmin[i]`/`Hmax[i]`
   (durée équivalente déjà ouverte, en heures décimales ×100) ou `Ooff[i]`/`O_on[i]`
   (seuils d'ouverture en %, avec logique différente selon que `Retard` de l'action courante
   vaut déjà 100 ou non) ne sont pas respectées, la période est invalidée.

### 2.3 Sécurité "Routage forcé" par température (`TinfForce`/`TsupForce`)

Indépendamment du résultat ci-dessus, si la période a `Type[i] == 3` (mode Routage/PW) et
que `TinfForce[i]`/`TsupForce[i]` sont configurés (`> -1500` et `TinfForce < TsupForce`),
un second hystérésis (variable membre `TseuilForce`) **force `Type = 2` (On) à 100%
d'ouverture** (`P.Vmax = ForceOuvre`) tant que la température reste sous `TsupForce` après
être descendue sous `TinfForce`. Cela sert à protéger contre le gel (ex. relais chauffage :
si la sonde chute trop bas alors que le routage aurait normalement réduit la puissance,
on force l'ouverture complète jusqu'à ce que la température remonte suffisamment). Ce
mécanisme réutilise volontairement le même chemin de code que le "On forcé" manuel.

### 2.4 Forçage manuel (`tOnOff`)

Après le calcul par période, un forçage manuel utilisateur prioritaire s'applique :
- `tOnOff > 0` → `Type = 2` (Forcé On), `Vmax = ForceOuvre`.
- `tOnOff < 0` → `Type = 1` (Forcé Off).
- `tOnOff == 0` → pas de forçage (résultat des périodes conservé).

`tOnOff` est un minuteur en minutes (positif = forcer On pendant N minutes, négatif = forcer
Off), décrémenté vers zéro ailleurs dans le sketch principal (boucle 1 minute). Il est
piloté par la page Accueil (`/togAction` dans `Server.ino`) ou par MQTT
(`tOnOff` dans `EnvoiMQTT.ino`).

### 2.5 Sécurité globale "Puissance max de soutirage" (`PuissanceMaxSoutirage`)

Ce garde-fou n'est pas un champ de la classe `Action` mais une variable globale du sketch
principal (paramètre commun aux actions, page **Actions**), qui s'applique dans
`GestionOverproduction()` (`Solar_Router_V17_25.ino`) **uniquement quand une action est en
mode `Type == 2` (forcée On)** — qu'elle soit forcée manuellement (`tOnOff`), par une période
programmée en mode "ON", ou par la sécurité anti-gel (`TinfForce`/`TsupForce`, §2.3), tous ces
cas passant par le même `Type == 2`.

Tant que `PuissanceMaxSoutirage > 0` (0 = sécurité désactivée) et que la puissance de soutirage
mesurée (`Puissance = PuissanceS_M - PuissanceI_M`) dépasse ce seuil, un terme intégral dédié
(`IntegrErrorPwSecu[i]`, borné à `[0, MaxTriacPw]`) augmente le retard appliqué à l'action
forcée, réduisant ainsi son ouverture jusqu'à repasser sous le seuil ; il redescend
progressivement vers 0 (donc l'ouverture forcée normale est restaurée) dès que la puissance
repasse sous la limite. Ce terme est remis à 0 dès que l'action n'est plus en mode `Type == 2`
(régulation normale ou Off/Inactif), pour repartir d'une ouverture forcée pleine la prochaine
fois qu'elle sera à nouveau forcée. La réactivité de cette sécurité (`KiSecu`, constante locale
à `GestionOverproduction()`) est volontairement plus rapide que la régulation normale
(`Ki`/`Kp`/`Kd` de l'action) afin de réagir vite à un dépassement.

Cette sécurité ne concerne que les actions forcées "On" : les actions en régulation normale
(`Type == 3`/`4`, mode Routage/PW) ne sont pas affectées, car elles ciblent déjà un seuil de
puissance (`Vmin`/`Vmax`) propre à leur période et ne peuvent pas, par construction, pousser la
puissance de soutirage globale au-delà de ce qu'impose la régulation en cours.

## 3. Pilotage de la sortie physique

- `RelaisOn()` : passe la sortie à l'état "on".
  - Si l'action a un GPIO local (`Gpio > 0`) : écrit `OutOn` sur la broche (`digitalWrite`),
    ou `ledcWrite(Gpio, OutOn*255)` en mode PWM (`Actif == 4`). Un délai anti-rebond `Tempo`
    (secondes) protège contre les commutations trop rapprochées.
  - Sinon (action "externe", pas de GPIO) et si `Actif == 1` (Découpe/OnOff externe) :
    appelle `CallExterne(Host, OrdreOn, Port)` — une requête HTTP GET vers un
    appareil tiers (ex. prise connectée) — avec anti-répétition (`Repet` secondes minimum
    entre deux envois du même ordre, `0` = toujours renvoyer).
- `Arreter()` : symétrique, écrit `OutOff` / envoie `OrdreOff` via `CallExterne`. Ne s'exécute
  que si le délai anti-rebond `Tempo` est écoulé, ou si `Idx == 0` (l'action Triac n'a pas
  cette temporisation), ou si `Actif != 1` (les modes régulés type Routage ne sont pas
  concernés par ce garde-fou, géré différemment par le sketch principal).
- `Prioritaire()` : traduit immédiatement un forçage manuel (`tOnOff`) en sortie physique,
  en contournant temporairement `Tempo` (mis à 0 le temps de l'appel) : appelle `RelaisOn()`
  si `tOnOff > 0`, `Arreter()` si `tOnOff < 0`. Utilisé juste après avoir modifié `tOnOff`
  (ex. bouton Forcer On/Off de la page Accueil, ou réception MQTT) pour réagir sans attendre
  le prochain cycle de régulation.
- `CallExterne(String host, String url, int port)` : implémente l'appel HTTP GET
  `WiFiClient` vers `host:port url`, avec une tentative de reconnexion (retry une fois après
  500 ms), un timeout de connexion (3 s) et de réponse (5 s), et journalisation des échecs via
  `StockMessage()`. Ne fait rien si `url == ""`.

## 4. Accesseurs utilitaires (utilisés par la synchronisation multi-routeurs "RMS")

- `CanalTempEnCours(int Heure)` : renvoie le canal de sonde de température (`CanalTemp[i]`)
  associé à la période active à `Heure`, ou `-1` si aucune période ne correspond.
- `TypeEnCours(...)` : même logique que `ParaEnCours()` mais ne renvoie que le `Type` (byte),
  utilisé quand seul le mode importe.
- `SelActEnCours(int Heure)` : renvoie l'action de référence (`SelAct[i]`) pour la période
  active (255 = aucune dépendance).
- `Valmin(int Heure)` / `Valmax(int Heure)` : renvoient respectivement `Vmin[i]`/`Vmax[i]`
  de la période active (utilisés par `RMS_Externes.ino` pour exposer/partager les seuils
  entre routeurs).

Ces accesseurs sont utilisés par `RMS_Externes.ino` pour construire (côté action "source")
et interpréter (côté action "dépendante", via `SelAct[i]`) l'état partagé entre plusieurs
`Action`, y compris entre ESP32 différents (champs `ExtValide`, `ExtHequiv`, `ExtOuvert`,
`ExtSelAct` — voir champs publics ci-dessous).

## 5. Champs publics principaux (`Actions.h`)

| Champ | Rôle |
|---|---|
| `Actif` | Mode de régulation en cours : `0`=Inactif, `1`=Découpe/OnOff, `2`=Multi-sinus, `3`=Train de sinus, `4`=PWM (les constantes `MODE_*` du sketch principal reprennent ces valeurs, `MODE_DEMISINUS=5` s'y ajoute). |
| `Titre` | Nom affiché (UI, MQTT). |
| `Host`, `Port`, `OrdreOn`, `OrdreOff` | Coordonnées et ordres HTTP pour une action "externe" (pas de GPIO local). |
| `Gpio`, `OutOn`, `OutOff` | GPIO local et niveaux logiques On/Off (déduits par `InitGpio`). |
| `Repet`, `Tempo` | Anti-répétition (s) des ordres externes / anti-rebond (s) des commutations GPIO. |
| `tOnOff` | Minuteur de forçage manuel en minutes (signe = sens du forçage). |
| `Kp`, `Ki`, `Kd`, `PID` | Coefficients et activation d'une régulation PID (sinon régulation intégrale seule). |
| `NbPeriode` | Nombre de tranches horaires configurées (≤ 8). |
| `ForceOuvre` | Ouverture (%) appliquée quand l'action est forcée "On" (manuel ou sécurité température). |
| `ExtSelAct`, `ExtValide`, `ExtHequiv`, `ExtOuvert` | État de la dépendance à une autre action (locale/RMS) : action surveillée, validité (compteur décrémenté), durée équivalente et % d'ouverture reçus. |
| `On`, `H_Ouvre` | État courant (relais fermé ?) et cumul de temps d'ouverture équivalent (heures), remis à zéro chaque jour (`Heure.ino`). |
| `Type[8]`, `Hdeb[8]`, `Hfin[8]` | Mode et plage horaire (heure décimale ×100) de chaque période. |
| `Vmin[8]`, `Vmax[8]`, `ONouvre[8]` | Seuils de puissance (W) On/Off ou de régulation, et plafond d'ouverture (%) en mode forcé On. |
| `Tinf[8]`, `Tsup[8]` | Garde-fous température (°C ×10, `-1600` = non utilisé) pour activer/désactiver la période. |
| `TinfForce[8]`, `TsupForce[8]` | Sécurité anti-gel : force l'ouverture 100% en mode Routage (voir §2.3). |
| `Hmin[8]`, `Hmax[8]`, `Ooff[8]`, `O_on[8]` | Bornes de dépendance à une autre action (durée équivalente / % ouverture). |
| `CanalTemp[8]` | Canal de sonde de température associé à la période. |
| `SelAct[8]` | Action de référence dont dépend la période (255 = aucune). |
| `Tarif[8]` | Masque de bits des tarifs (Linky...) autorisant la période. |

## 6. Points d'attention pour toute évolution

- Les tableaux par période sont de **taille fixe 8** (`Type[8]`, `Hdeb[8]`, etc.) : ne pas
  dépasser cet index sans agrandir tous les tableaux associés et adapter l'UI/JS
  correspondante (voir aussi la constante `LES_ACTIONS_LENGTH`, annotée "Ne pas toucher" côté
  JavaScript).
- Les variables `Tseuil` et `TseuilForce` sont des **états membres** (latch d'hystérésis)
  conservés entre deux appels successifs à `ParaEnCours()`/`TypeEnCours()` — elles ne doivent
  pas être réinitialisées à chaque appel sous peine de casser l'hystérésis anti-oscillation.
- `Definir()`, `Lire()` et `Activer()` sont déclarées dans `Actions.h` mais **non implémentées** :
  ne pas supposer qu'elles font quelque chose ; toute configuration/lecture doit passer par un
  accès direct aux champs publics (voir `Stockage.ino`) et toute activation par les méthodes
  réellement implémentées (`RelaisOn`, `Arreter`, `Prioritaire`) pilotées depuis le sketch
  principal.
- Le code est en français (noms de variables/commentaires) ; conserver cette convention pour
  toute modification.
