# Zendure Monitor (outil PC, indépendant du firmware ESP32)

Petit script Python autonome qui récupère les données d'un compteur **Zendure 3CT** sur le réseau
local (puissances par phase, puissance réseau, tensions) et les affiche via une page web locale.
Il ne dépend pas d'Arduino/ESP32 et peut tourner directement sur ce PC (Windows, macOS, Linux).

Contrairement à `../EnphaseMonitor` (passerelle Enphase Envoy), le compteur Zendure 3CT expose ses
mesures en **HTTP simple, sans authentification ni TLS** : une seule requête périodique suffit :

```
GET http://<zendure_host>/properties/report
```

qui répond en JSON, par exemple :

```json
{
"timestamp":1788012401,
"messageId":8,
"deviceId":"xxxxxxox",
"a_aprt_power":145,
"b_aprt_power":0,
"c_aprt_power":0,
"total_power":145
}
```

## Installation

```powershell
pip install requests
```

## Configuration

1. Copier `zendure_config.example.json` en `zendure_config.json` (ce dernier est ignoré par git,
   ne le partagez/committez jamais).
2. Compléter les champs :
   - `zendure_host` : IP (ou nom local) du compteur Zendure sur votre réseau, ex. `192.168.1.42`.
   - `poll_interval_seconds` (optionnel, défaut 5) : fréquence de lecture du compteur.
   - `web_port` (optionnel, défaut 8081) : port de la page web locale.

Si `zendure_config.json` est absent au lancement, le script en crée un gabarit automatiquement et
vous demande de le compléter avant de relancer.

## Lancement

```powershell
python zendure_monitor.py
```

Puis ouvrir http://localhost:8081 dans un navigateur (page auto-rafraîchie). Le JSON brut de la
dernière lecture est disponible sur http://localhost:8081/data.

Arrêter avec `Ctrl+C`.

## Dépannage

- **Impossible de joindre le compteur Zendure** : vérifiez que `zendure_host` est correct et que ce
  PC est sur le même réseau/VLAN que le compteur (essayez `ping <zendure_host>` ou ouvrez
  `http://<zendure_host>/properties/report` directement dans un navigateur).
- **Réponse Zendure non-JSON / champs manquants** : le firmware du compteur a peut-être changé de
  format ; le script affiche un extrait du corps de la réponse pour diagnostiquer.
- **Le total 3 phases calculé diffère de `grid_power`** : c'est normal, `grid_power` représente
  l'échange réel avec le réseau (import/export, signé) alors que la somme des 3 phases est une
  valeur indicative calculée côté script ; les conventions de signe peuvent différer selon le
  firmware du compteur.
