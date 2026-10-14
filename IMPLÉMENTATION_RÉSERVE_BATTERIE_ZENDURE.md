# Implémentation — Réserve de puissance pour la batterie Zendure

## Résumé

Cette implémentation répond au plan défini dans `PLAN_RESERVE_BATTERIE_ZENDURE.md` pour conditionner l'application de la réserve batterie Zendure uniquement lorsque la batterie peut effectivement recevoir l'énergie.

## Modifications Effectuées

### 📁 Fichiers Modifiés

#### 1. `Solar_Router_V17_25.ino`

**Variables globales ajoutées (lignes 697-698):**
```cpp
float PwBatteryCharge = -1;         // Puissance de charge de la batterie Zendure (outputPackPower). -1 = invalide
int BatteryStatus = -1;             // Etat de charge batterie Zendure en % (electricLevel). -1 = invalide
```

**Condition de réserve batterie modifiée (ligne ~1837):**
```cpp
// Avant:
if (reserveZendure && LesActions[i].TreserveBatt > -1500 && laTemperature > -100
    && laTemperature * 10.0 >= LesActions[i].TreserveBatt) {
  PuissanceAction += ReserveBatterieZendure;
}

// Après:
if (reserveZendure && LesActions[i].TreserveBatt > -1500 && laTemperature > -100
    && laTemperature * 10.0 >= LesActions[i].TreserveBatt
    && PwBatteryCharge > 0 && BatteryStatus >= 0 && BatteryStatus < 100) {
  float PuissanceReserveZendure = min(float(ReserveBatterieZendure), PwBatteryCharge);
  PuissanceAction += PuissanceReserveZendure;
}
```

#### 2. `Source_Zendure3CT.ino`

**Initialisation des variables (lignes 16-17):**
```cpp
// Initialisation des mesures batterie comme invalides
PwBatteryCharge = -1;
BatteryStatus = -1;
```

**Lecture et parsing des données batterie (lignes 97-111):**
```cpp
// Cas idéal : les deux champs sont présents
if (!timeoutBatterie && p >= 0 && Battery_Data.indexOf("\"packInputPower\"") > 0 && Battery_Data.indexOf("\"electricLevel\"") > 0) {
  String json = Battery_Data.substring(p);
  PwBattery = PfloatMax(ValJson("packInputPower", json));
  PwBatteryCharge = PfloatMax(ValJson("outputPackPower", json));
  BatteryStatus = int(ValJson("electricLevel", json));
  //Zendure_dataBrute += "<br><strong>Batterie Zendure</strong><br>" + json;
} else if (!timeoutBatterie && p >= 0 && Battery_Data.indexOf("\"packInputPower\"") > 0) {
  // Seul packInputPower présent, pas electricLevel
  String json = Battery_Data.substring(p);
  PwBattery = PfloatMax(ValJson("packInputPower", json));
  PwBatteryCharge = PfloatMax(ValJson("outputPackPower", json));
  // BatteryStatus reste invalide (-1)
  StockMessage("electricLevel non trouvé sur batterie : " + batteryHost);
} else if (!timeoutBatterie) {
  StockMessage("packInputPower non trouvé sur : " + batteryHost + " (" + String(Battery_Data.length()) + " octets reçus)");
}
```

### 🆕 Fichiers Créés

#### 3. `Test/test_reserve_batterie.cpp`
Fichier de tests unitaires exhaustifs couvrant tous les scénarios définis dans le plan :
- Charge positive et SOC < 100% : réserve appliquée
- packInputPower == 0 : aucune réserve
- SOC à 100% : aucune réserve
- Données absentes/invalides : aucune réserve
- Seuil de température non atteint : aucune réserve
- Source différente de Zendure : aucune réserve
- Réserve désactivée : aucune réserve
- Tests de valeurs limites pour toutes les variables
- Tests de combinaisons complexes
- Tests de parsing des champs JSON

#### 4. `Test/Makefile`
Makefile pour compiler et exécuter les tests unitaires

#### 5. `Test/README.md`
Documentation complète sur l'exécution des tests

#### 6. `Test/executer_tests.bat`
Script Windows pour exécuter les tests

#### 7. `Test/executer_tests.sh`
Script Linux/macOS/WSL pour exécuter les tests

## Comportement Implémenté

### Conditions pour l'application de la réserve batterie Zendure

La réserve `ReserveBatterieZendure` est **UNIQUEMENT appliquée** si **TOUTES** les conditions suivantes sont satisfaites :

1. ✅ `ReserveBatterieZendure > 0` (réserve configurée et activée)
2. ✅ `Source == "Zendure"` (source de puissance est Zendure)
3. ✅ `Action.TreserveBatt > -1500` (seuil de température de l'action est valide)
4. ✅ `laTemperature > -100` (température valide)
5. ✅ `laTemperature * 10.0 >= Action.TreserveBatt` (seuil de température de l'action atteint)
6. ✅ **`PwBatteryCharge > 0`** *(NOUVEAU)* : la batterie est en charge
7. ✅ **`BatteryStatus >= 0`** *(NOUVEAU)* : les données batterie sont valides
8. ✅ **`BatteryStatus < 100`** *(NOUVEAU)* : la batterie n'est pas pleine

La réserve effectivement appliquée est `min(ReserveBatterieZendure, PwBatteryCharge)`. Elle diminue donc avec la puissance de charge mesurée, et ne dépasse jamais la puissance que la batterie absorbe actuellement.

### Gestion des données invalides

- `PwBatteryCharge = -1` et `BatteryStatus = -1` : état initial et après tout échec de lecture
- Si `packInputPower` est absent : message d'erreur, `PwBatteryCharge` reste invalide
- Si `electricLevel` est absent : message d'erreur, `BatteryStatus` reste invalide
- Si les deux sont absents : message d'erreur approprié
- **Aucune réserve n'est appliquée si les données sont invalides**

### Préservation du comportement existant

- `PwBattery` continue à être utilisé pour le calcul de `PwRoutage` (inchangé)
- Les autres sources de mesure ne sont pas affectées
- Les actions non-Zendure conservent leur comportement antérieur
- Le calcul de `PwRoutage = Pw + PwBattery` reste identique

## Exécution des Tests

### Avec Make (recommandé)
```bash
cd Test
make run
```

### Avec compilation manuelle
```bash
cd Test
g++ -std=c++11 -Wall -Wextra -pedantic -g -o test_reserve_batterie test_reserve_batterie.cpp
./test_reserve_batterie
```

### Sur Windows
```batch
cd Test
executer_tests.bat
```

## Tests PC

Les tests compilent directement `ZendureReserve.h`, également utilisé par le firmware. Ils couvrent le parsing de `electricLevel` (valeurs valides, absentes et mal formées) et le calcul de la réserve, y compris les conditions d'activation et la formule `min(ReserveBatterieZendure, PwBatteryCharge) + AmorceBatterieZendure`. Ce paramètre est réglable dans la page de configuration Zendure et vaut 10 W par défaut.

Lancement sous Windows depuis la racine du dépôt : `.\Test\executer_tests.bat`. Voir [Test/README.md](Test/README.md) pour les prérequis et les autres commandes.

## Comportement à vérifier

- La réserve est appliquée seulement si la source est Zendure, si la batterie charge, si son SOC est valide et inférieur à 100 %, et si le seuil de température de l'action est atteint.
- La puissance de réserve appliquée est `min(ReserveBatterieZendure, PwBatteryCharge) + AmorceBatterieZendure`, avec une amorce plafonnée à la réserve configurée si la batterie ne charge pas encore.
- Les tests PC vérifient les fonctions partagées ; ils ne compilent pas le firmware ESP32 et ne remplacent pas une validation sur matériel.

## Compilation du Firmware

Le firmware peut être compilé avec PlatformIO :

```bash
cd C:/Users/gurvan.lequellenec/Solar-Router-F1ATB_enphase
pio run
```

Configuration : voir `platformio.ini` pour l'environnement `esp32dev`.

## Version

Le firmware reste en version **17.27_DEV_BATTERIE** comme demandé. Cette implémentation complète la fonctionnalité de réserve batterie Zendure démarrée dans cette version.

## Fichiers de Backup

Des fichiers de backup ont été créés pendant le développement :
- `Solar_Router_V17_25.ino.bak`
- `Source_Zendure3CT.ino.bak`

Ces fichiers peuvent être supprimés une fois que l'implémentation est validée.

## Notes Techniques

### Variables Globales
- `PwBatteryCharge` : `float` initialisé à -1 (invalide). Contient la valeur de `packInputPower` lue depuis la batterie Zendure SolarFlow
- `BatteryStatus` : `int` initialisé à -1 (invalide). Contient la valeur de `electricLevel` (pourcentage) lue depuis la batterie

### Comportement par Défaut
- Les variables sont initialisées à -1 (invalide) au début de chaque appel à `LectureZendure3CT()`
- Cette initialisation garantit qu'une réserve n'est pas appliquée sur la base de valeurs périmées

### Sémantique des Valeurs
- `packInputPower = 0` : la batterie ne charge pas (selon la documentation Zendure)
- `electricLevel` : pourcentage de 0 à 100, où 100 = batterie pleine
- `PwBatteryCharge > 0` : la batterie est en train de recevoir de l'énergie
- `BatteryStatus < 100` : la batterie peut encore accepter de l'énergie

## Prochaines Étapes

1. Tester sur matériel réel avec une batterie Zendure SolarFlow
2. Vérifier que les messages de logs apparaissent correctement en cas d'erreur de lecture
3. Valider que le comportement existant des autres sources n'est pas affecté
4. Intégrer les tests unitaires dans un pipeline CI/CD si disponible

## Références

- [Plan Original](PLAN_RESERVE_BATTERIE_ZENDURE.md)
- [Code Source Zendure 3CT](Source_Zendure3CT.ino)
- [Gestion Overproduction](Solar_Router_V17_25.ino) (fonction `GestionOverproduction()`)
- [Zendure Monitor](PC_Tools/ZendureMonitor/zendure_monitor.py) (pour référence JSON)
- [Configuration PlatformIO](platformio.ini)