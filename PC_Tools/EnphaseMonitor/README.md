# Enphase Monitor (outil PC, indépendant du firmware ESP32)

Petit script Python autonome qui récupère les données d'une passerelle Enphase Envoy locale
(production, réseau, consommation maison estimée) et les affiche via une page web locale.
Il ne dépend pas d'Arduino/ESP32 et peut tourner directement sur ce PC (Windows, macOS, Linux).

Il reproduit la logique déjà implémentée dans le firmware
(`../../Source_EnphaseEnvoy.ino` : `Setup_Enphase()` / `LectureEnphase()`) :

1. Login sur `enlighten.enphaseenergy.com` avec votre email/mot de passe Enlighten → `session_id`.
2. Échange du `session_id` contre un token Bearer sur `entrez.enphaseenergy.com`.
3. Requêtes périodiques `GET https://<envoy_host>/ivp/meters/readings` avec le token, auprès de
   la passerelle Envoy sur votre réseau local (certificat auto-signé, vérification TLS désactivée
   volontairement pour cette requête locale, comme dans le firmware).

## Installation

```powershell
pip install requests
```

## Retrouver l'IP locale et le numéro de série de l'Envoy

Si vous ne connaissez pas l'IP locale de la passerelle Envoy (ou son numéro de série), utilisez le
script de découverte fourni :

```powershell
python discover_envoy.py
```

Il essaie d'abord `envoy.local` (mDNS), puis si besoin scanne votre sous-réseau local (ex.
`192.168.1.0/24`) en interrogeant l'endpoint public `/info` de chaque appareil (aucune
authentification requise pour cet endpoint). Il affiche l'IP et le `envoy_serial` à recopier dans
`enphase_config.json`.

## Configuration

1. Copier `enphase_config.example.json` en `enphase_config.json` (ce dernier est ignoré par git,
   ne le partagez/committez jamais).
2. Compléter les champs :
   - `envoy_host` : IP ou nom local de la passerelle (`envoy.local` fonctionne souvent si mDNS
     est disponible sur le PC, sinon utilisez l'IP directement, ex. `192.168.1.50`).
   - `envoy_serial` : numéro de série de la passerelle Envoy (visible sur l'étiquette de
     l'appareil ou dans votre compte Enlighten).
   - `enlighten_user` / `enlighten_password` : identifiants de votre compte
     https://enlighten.enphaseenergy.com/.
   - `poll_interval_seconds` (optionnel, défaut 5) : fréquence de lecture de la passerelle.
   - `web_port` (optionnel, défaut 8080) : port de la page web locale.

Si `enphase_config.json` est absent au lancement, le script en crée un gabarit automatiquement et
vous demande de le compléter avant de relancer.

Le token obtenu après authentification est mis en cache dans `enphase_token_cache.json` (généré
automatiquement, également ignoré par git) pour éviter de se reconnecter à chaque lancement ; il
est renouvelé automatiquement tous les 30 jours ou en cas de rejet (401) par la passerelle.

## Lancement

```powershell
python enphase_monitor.py
```

Puis ouvrir http://localhost:8080 dans un navigateur (page auto-rafraîchie). Le JSON brut de la
dernière lecture est disponible sur http://localhost:8080/data.

Arrêter avec `Ctrl+C`.

## Dépannage

- **`403 Forbidden` sur `https://entrez.enphaseenergy.com/tokens`** : le login Enlighten a
  fonctionné (session_id obtenu) mais l'échange contre le token est refusé. Causes les plus
  fréquentes :
  - `envoy_serial` incorrect ou ne correspondant pas au compte Enlighten utilisé — vérifiez le
    numéro de série sur l'étiquette de la passerelle Envoy (uniquement les chiffres, sans espace)
    ou dans https://enlighten.enphaseenergy.com/ > vos systèmes > informations sur la passerelle.
  - Le compte Enlighten utilisé n'est pas propriétaire/installateur de cet Envoy.
  - Message d'erreur : le script affiche désormais le corps de la réponse Enphase pour ce cas
    (`Obtention du token ... a échoué : HTTP 403 - ...`), qui donne souvent la vraie raison.
- **Pas de `session_id` retourné par le login** : vérifiez `enlighten_user`/`enlighten_password`.
  Si l'authentification à deux facteurs (MFA) est activée sur le compte Enlighten, ce mode de
  connexion par email/mot de passe ne fonctionne pas — il faut désactiver la MFA sur le compte
  utilisé pour cet outil, ou obtenir un token autrement.
- **`401` lors de la lecture de la passerelle (`/ivp/meters/readings`)** : le token est
  probablement expiré ou invalide ; le script tente automatiquement de s'en procurer un nouveau au
  prochain cycle.
