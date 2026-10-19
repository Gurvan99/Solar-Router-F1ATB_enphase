# ⚡ Routeur Photovoltaïque F1ATB

Routeur photovoltaïque basé sur **ESP32**, permettant d’optimiser l’autoconsommation d’une installation solaire en redirigeant les surplus de production vers des charges (chauffe-eau, chauffage, pompe, etc.) au lieu de les injecter sur le réseau.

[**Détails Routeur F1ATB**](https://f1atb.fr/fr)

---

## 🚀 Fonctionnalités principales

- 🔋 **Optimisation automatique de l’autoconsommation**
  - Mesure en temps réel de la puissance active importée/exportée.
  - Répartition intelligente des surplus photovoltaïques vers une ou plusieurs charges.
  - Réduction de l’énergie injectée sur le réseau à 0 W.

- ⚙️ **Mesures de puissance multi-sources**
  - Lecture directe du **compteur Linky** via **prise TIC**.
  - Mesure par méthode **UxI**, **UxIx2**, ou **UxIx3** à l’aide de sondes de courant.
  - Support des capteurs externes via **MQTT**, **Shelly EM**, etc.

- 🔌 **Pilotage des charges**
  - Sorties pour  **relais statiques (SSR)**.
  - Pilotage par **Triac** avec découpe sinusoïdale (suivi de phase secteur).
  - Modes d’actionnement configurables : tout ou rien, proportionnel, sinusoïdal, multi-sinus.

- 🌐 **Interface Web intégrée**
  - Visualisation en temps réel de la puissance, de la tension, du courant, de l’état des sorties.
  - Configuration des seuils, horaires, priorités, et paramètres réseau.
  - Historique et graphiques accessibles via navigateur.
  - Page de résumé rapide sans graphiques ni navigation : ouvrir `/rapide` pour consulter les énergies du jour, les températures, l’état et l’ouverture équivalente des actions, et, avec la source Zendure, les puissances secteur/batterie et le niveau de batterie. Les actions peuvent aussi être forcées On/Off depuis cette page.

- 🖥️ **Affichage local (selon version)**
  - Écran couleur 320×240  en option affichant les mesures instantanées et l’état des charges.
  - Navigation par boutons tactiles.

- 💬 **Communication et intégration domotique**
  - Serveur Web HTTP intégré.
  - Serveur Telnet (port 23 ) intégré.
  - **MQTT** pour l’intégration dans Home Assistant, Domoticz, Jeedom, etc.
  - **OTA (Over-The-Air)** : mise à jour logicielle à distance via WiFi ou Ethernet.
  - Configuration via  page Web embarquée.

- 🔒 **Sécurité et fiabilité**
  - **Watchdog** matériel/logiciel pour redémarrage automatique en cas de blocage.


- 🧩 **Compatibilité matérielle**
  - ESP32 Wroom,  WT32-ETH01, ESP32-ETH01, etc.
  - Connexion **WiFi** ou **Ethernet (PHY_LAN8720)**.
  - Alimentation possible via PoE (selon module).

---

## 📊 Exemple d’interface Web

![Interface Web](https://f1atb.fr/wp-content/uploads/2024/06/Capture-decran-2024-06-01-081356.png)

---

## ⚙️ Configuration typique

| Élément | Fonction | Interface |
|----------|-----------|------------|
| ESP32 | Microcontrôleur principal | WiFi / Ethernet |
| Linky TIC | Mesure puissance réseau | UART |
| Capteur UxI | Mesure courant + tension | ADC |
| Chauffe-eau | Charge 1 | Triac 1 |
| Chauffage | Charge 2 | Relais 2 |
| Capteur DS18B20 | Température | 1-Wire |
| Serveur MQTT | Communication domotique | TCP/IP |

---

## 🔧 Installation

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/Gurvan99/Solar-Router-F1ATB_enphase.git
   cd Solar-Router-F1ATB_enphase
   git checkout optimise-enphase-envoy
   ```

---

## 🛠️ Compiler le firmware

Le dépôt est un sketch Arduino classique (fichiers `.ino`/`.h`/`.cpp` à la racine). Deux méthodes de compilation sont possibles.

### Assets web statiques (JS compressés en gzip)

Les gros fichiers Javascript statiques (page Accueil, Actions, Paramètres, Données brutes,
couleurs...) sont servis **pré-compressés en gzip** pour accélérer le premier chargement de la
page web (moins de données à transférer sur le WiFi). Leur source lisible est dans `web_assets/*.js`
(pas compilée directement), et un script Python génère à partir de là les en-têtes C réellement
inclus dans le sketch (`web_assets/generated/*_gz.h`, tableaux d'octets `PROGMEM`).

**Si vous modifiez un fichier sous `web_assets/*.js`**, il faut régénérer les en-têtes avant de
compiler :
```powershell
python tools/build_gzip_assets.py
```
Ce script ne nécessite que la bibliothèque standard Python (pas de dépendance à installer). Les
fichiers `web_assets/generated/*_gz.h` sont auto-générés (ne pas les éditer à la main) — pensez à
les committer après régénération, ils sont compilés tels quels par PlatformIO/Arduino IDE.

### Option recommandée : PlatformIO (VS Code ou ligne de commande)

Un projet PlatformIO (`platformio.ini`) est fourni à la racine du dépôt, il compile directement les fichiers existants sans rien déplacer.

**Pré-requis (à faire une seule fois par PC) :**
1. **Python ≥ 3.10** (3.10, 3.11, 3.12, 3.13 ou 3.14). PlatformIO ne fonctionne pas avec Python 3.8/3.9.
2. Installer PlatformIO :
   ```powershell
   python -m pip install -U platformio
   ```
   (sous Windows, si plusieurs versions de Python sont installées, utiliser explicitement la bonne, ex. `py -3.13 -m pip install -U platformio`)
3. (Optionnel mais recommandé) Installer l'extension **PlatformIO IDE** dans VS Code, pour avoir la compilation/upload/monitor série intégrés à l'éditeur.

**Compiler :**
```powershell
cd Solar-Router-F1ATB_enphase
pio run              # compile le firmware (.pio/build/esp32dev/firmware.bin)
pio run -t upload    # compile + flashe l'ESP32 connecté en USB
pio device monitor    # ouvre le moniteur série
```

**⚠️ Si plusieurs versions de Python sont installées sur le PC** (ex. un ancien Python 3.8 à côté
d'un Python ≥3.10) : la commande `pio` du PATH peut être un raccourci généré par la mauvaise
version de Python et échouer avec `ERROR: Python version must be 3.10, 3.11, 3.12, 3.13, 3.14.` —
même si PlatformIO est bien installé par ailleurs pour une version compatible. Dans ce cas,
invoquer PlatformIO explicitement via la bonne version de Python :
```powershell
py -3.13 -m platformio run
py -3.13 -m platformio run -t upload
py -3.13 -m platformio device monitor
```

**Points d'attention repris dans `platformio.ini` :**
- Le projet utilise le fork **pioarduino** de la plateforme `espressif32` (et non celle officielle de PlatformIO), car celle-ci est bloquée sur un ancien core Arduino-ESP32 (2.0.17) incompatible avec ce projet, qui nécessite un core **≥ 3.0.1**. Le premier `pio run` télécharge ce fork ainsi que tout le toolchain ESP32 (~plusieurs centaines de Mo, connexion internet nécessaire, peut prendre plusieurs minutes).
- La table de partitions personnalisée (`partitions.csv`, déjà dans le dépôt) est utilisée via `board_build.partitions` — ne pas la remplacer par un schéma standard, sous peine de casser le Watchdog.
- Le fichier `OneWire.cpp`/`OneWire.h` du dépôt est une version **modifiée** (pas la bibliothèque officielle) : `lib_ignore = OneWire` + `-I.` dans `build_flags` garantissent que c'est bien cette version qui est utilisée, pas celle installée automatiquement par PlatformIO pour `DallasTemperature`.
- `board = esp32dev` est le réglage par défaut. À adapter si la carte cible est différente (ex. carte avec Ethernet type WT32-ETH01).

### Alternative : Arduino IDE

1. Installer l'[Arduino IDE](https://www.arduino.cc/en/software) (2.x recommandé).
2. Ajouter l'URL du gestionnaire de cartes ESP32 : `Fichier > Préférences > URL de gestionnaire de cartes` → `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Installer le core **esp32 (Espressif Systems) ≥ 3.0.1** via le gestionnaire de cartes.
4. Installer les bibliothèques manquantes via le gestionnaire de bibliothèques : `PubSubClient`, `DallasTemperature`, `ArduinoJson`, `UrlEncode`, `EthernetESP32`, `LovyanGFX`. (`OneWire` est fourni dans le dépôt, ne pas installer la version officielle en plus pour éviter un conflit de symboles.)
5. Ouvrir `Solar_Router_V17_25.ino`.
6. Sélectionner la carte ESP32 correspondant au matériel, puis dans `Outils > Partition Scheme`, sélectionner le schéma personnalisé issu de `partitions.csv` (**pas** un schéma standard, sinon le Watchdog est cassé).
7. Vérifier/Compiler (`Ctrl+R`), puis Téléverser (`Ctrl+U`).

### Ce qu'il faut refaire sur un nouveau PC

- Installer Git, un Python ≥ 3.10 (pour PlatformIO) ou l'Arduino IDE.
- Cloner le dépôt (voir ci-dessus).
- Reconfigurer l'identité Git locale si besoin (`git config user.name`/`user.email`) — non versionnée, propre à chaque poste.
- Le premier build PlatformIO retéléchargera toutes les dépendances (plateforme, toolchain, bibliothèques) : rien n'est committé dans `.pio/` (ignoré via `.gitignore`).
- Les fichiers de configuration Enphase (`PC_Tools/EnphaseMonitor/enphase_config.json`, `enphase_token_cache.json`) contiennent des secrets et **ne sont pas versionnés** : à recréer localement à partir de `enphase_config.example.json` si l'outil PC est utilisé sur ce nouveau poste.
- La configuration WiFi/MQTT/etc. du routeur lui-même n'est pas stockée dans le code : elle se fait depuis l'interface Web de l'ESP32 après le premier démarrage (ou via import/export JSON, voir menu Paramètres du routeur).
