# Tests PC — réserve batterie Zendure

Les tests appellent `GestionOverproduction()` avec des globals et des actions
simulés pour le PC. Le corps exécuté est partagé avec le sketch dans
[`GestionOverproductionBody.inc`](../GestionOverproductionBody.inc) ; les tests
vérifient ainsi les décisions calculées par la fonction et les appels
`Arreter()`/`RelaisOn()`. Les fonctions de réserve et le parsing
`electricLevel` sont également testés depuis [`ZendureReserve.h`](../ZendureReserve.h).
Ce n'est pas une compilation complète des bibliothèques ESP32.

## Windows

### Depuis Visual Studio

Ouvrir `TestsReserveBatterie.sln` à la racine du dépôt, sélectionner
`ReserveBatterieTests` comme projet de démarrage, puis lancer avec **Ctrl+F5**
(ou **F5** pour lancer sous le débogueur). Le résultat des tests s'affiche dans
la console intégrée de Visual Studio.

Le projet utilise le compilateur C++ natif fourni avec la charge de travail
**Développement Desktop en C++**. Si Visual Studio propose d'installer les
outils C++, accepter puis recharger la solution.

Les raccourcis pour lancer les tests ouvrent ou compilent uniquement le projet
de test natif ; ils ne compilent pas le firmware ESP32.

### Depuis PowerShell développeur

Depuis PowerShell, à la racine du dépôt :

```powershell
.\Test\executer_tests.bat
```

Le script utilise, dans cet ordre, `g++`, `clang++` ou `cl` (Visual C++). Le
compilateur choisi doit être installé et disponible dans le `PATH` ; pour `cl`,
lancer le script depuis une invite développeur Visual Studio.

Avec `g++` depuis PowerShell :

```powershell
g++ -std=c++11 -Wall -Wextra -pedantic -o Test\test_reserve_batterie.exe Test\test_reserve_batterie.cpp
.\Test\test_reserve_batterie.exe
```

## Linux, macOS ou Git Bash

```sh
cd Test
make run
```

## Ce qui est vérifié

- SOC JSON valide de 0 à 100 et rejet des valeurs manquantes, nulles, non
  entières, négatives ou hors plage ;
- réserve basée sur `outputPackPower` : `min(réglage, puissance mesurée) + puissance d'amorçage`, réglée dans l'interface (10 W par défaut) ;
- désactivation pour les entrées invalides, une autre source, un seuil non
  atteint, une batterie qui ne charge pas ou une batterie pleine ;
- exécution de `GestionOverproduction()` avec deux actions et des seuils de
  température distincts, et vérification de la décision réelle marche/arrêt ;
- réserve appliquée à une seule action, aux deux actions, ou à aucune ;
- réévaluation de la réserve lors du franchissement du seuil et appels de relais
  cohérents avec les décisions.
- évolution temporelle de la charge, de l'injection réseau, de la puissance
  d'action, de la réserve appliquée et du SOC pour une batterie acceptant 700 W,
  seulement 300 W, ou aucune puissance.

La simulation utilise un pas de 200 ms, une action de 1000 W et un modèle de
batterie simplifié. La puissance réellement acceptée pilote la réserve suivante ;
la charge est plafonnée à 90 % de SOC. Les traces sont des résultats de
simulation, pas des mesures sur une batterie physique.
