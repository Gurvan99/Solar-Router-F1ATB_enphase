#!/usr/bin/env python3
"""
Enphase Monitor - récupère les données d'une passerelle Enphase Envoy locale
et les affiche via une petite page web locale.

Reproduit en Python la logique du firmware ESP32 (Source_EnphaseEnvoy.ino) :
  1. Login sur enlighten.enphaseenergy.com (user/password) -> session_id
  2. Echange du session_id contre un token Bearer sur entrez.enphaseenergy.com
  3. Requêtes périodiques GET https://<envoy_host>/ivp/meters/readings
     avec le header "Authorization: Bearer <token>" (certificat auto-signé
     de la passerelle -> vérification TLS désactivée, comme dans le firmware).

Configuration : voir enphase_config.example.json (à copier en
enphase_config.json et à compléter). Le token obtenu est mis en cache dans
enphase_token_cache.json pour éviter de se reconnecter à chaque lancement.

Lancement :
    pip install requests
    python enphase_monitor.py
Puis ouvrir http://localhost:8080 (port configurable) dans un navigateur.
"""

import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import requests
import urllib3

# La passerelle Envoy locale utilise un certificat auto-signé : on
# désactive la vérification TLS uniquement pour cette communication locale,
# et on masque l'avertissement correspondant (comportement volontaire,
# identique à clientSecu.setInsecure() dans le firmware ESP32).
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "enphase_config.json")
CONFIG_EXAMPLE_PATH = os.path.join(SCRIPT_DIR, "enphase_config.example.json")
TOKEN_CACHE_PATH = os.path.join(SCRIPT_DIR, "enphase_token_cache.json")

TOKEN_REFRESH_INTERVAL = timedelta(days=30)  # comme TOKEN_REFRESH_MS dans le firmware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("enphase_monitor")


class ConfigError(Exception):
    pass


def load_config():
    """Charge enphase_config.json. Crée un gabarit et explique quoi faire s'il est absent."""
    if not os.path.exists(CONFIG_PATH):
        if os.path.exists(CONFIG_EXAMPLE_PATH):
            with open(CONFIG_EXAMPLE_PATH, "r", encoding="utf-8") as example:
                template = example.read()
        else:
            template = "{}"
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            f.write(template)
        raise ConfigError(
            f"Fichier de configuration créé : {CONFIG_PATH}\n"
            "Merci de le compléter (envoy_host, envoy_serial, enlighten_user, "
            "enlighten_password) puis de relancer le script."
        )

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    required = ["envoy_host", "envoy_serial", "enlighten_user", "enlighten_password"]
    missing_or_placeholder = [
        key for key in required
        if not config.get(key) or str(config[key]).startswith("REMPLACER_PAR_")
    ]
    if missing_or_placeholder:
        raise ConfigError(
            f"Le fichier {CONFIG_PATH} doit être complété pour les champs : "
            f"{', '.join(missing_or_placeholder)}"
        )

    config.setdefault("poll_interval_seconds", 5)
    config.setdefault("web_port", 8080)
    return config


def load_cached_token():
    if not os.path.exists(TOKEN_CACHE_PATH):
        return None
    try:
        with open(TOKEN_CACHE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        obtained_at = datetime.fromisoformat(data["obtained_at"])
        if datetime.now(timezone.utc) - obtained_at < TOKEN_REFRESH_INTERVAL:
            return data["token"]
    except (json.JSONDecodeError, KeyError, ValueError, OSError):
        pass
    return None


def save_cached_token(token):
    with open(TOKEN_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {"token": token, "obtained_at": datetime.now(timezone.utc).isoformat()},
            f,
        )


def _raise_with_body(resp, action):
    """Lève une ConfigError incluant le corps de la réponse Enphase pour diagnostiquer."""
    body = resp.text.strip()
    if len(body) > 500:
        body = body[:500] + "..."
    raise ConfigError(f"{action} a échoué : HTTP {resp.status_code} - {body!r}")


def fetch_new_token(config):
    """Rejoue le login Enlighten (login.json) puis l'échange session_id -> token."""
    session = requests.Session()
    session.verify = False
    # Certaines requêtes Enphase sont filtrées (WAF) si aucun User-Agent "navigateur"
    # n'est présent - on en fournit un par précaution.
    session.headers.update({"User-Agent": "Mozilla/5.0 (EnphaseMonitorPC)"})

    log.info("Connexion à enlighten.enphaseenergy.com pour obtenir un session_id...")
    login_resp = session.post(
        "https://enlighten.enphaseenergy.com/login/login.json",
        data={
            "user[email]": config["enlighten_user"],
            "user[password]": config["enlighten_password"],
        },
        timeout=10,
    )
    if login_resp.status_code != 200:
        _raise_with_body(login_resp, "Login Enlighten")
    session_id = login_resp.json().get("session_id")
    if not session_id:
        raise ConfigError(
            "Impossible d'obtenir un session_id Enlighten - vérifiez "
            "enlighten_user / enlighten_password dans enphase_config.json. "
            "Si l'authentification à deux facteurs (MFA) est activée sur le compte "
            "Enlighten, ce mode de connexion ne fonctionnera pas : désactivez la MFA "
            "ou utilisez un token obtenu autrement."
        )
    log.info("session_id obtenu.")

    serial = str(config["envoy_serial"]).strip()
    log.info("Échange du session_id contre un token sur entrez.enphaseenergy.com (serial=%s)...", serial)
    token_resp = session.post(
        "https://entrez.enphaseenergy.com/tokens",
        json={
            "session_id": session_id,
            "serial_num": serial,
            "username": config["enlighten_user"],
        },
        timeout=10,
    )
    if token_resp.status_code != 200:
        # Un 403 ici vient quasi toujours d'un envoy_serial incorrect ou qui n'est pas
        # associé au compte Enlighten utilisé (vérifiez le numéro de série sur
        # l'étiquette de la passerelle ou dans enlighten.enphaseenergy.com > vos systèmes).
        _raise_with_body(
            token_resp,
            f"Obtention du token (serial_num={serial!r} vérifié sur l'étiquette Envoy "
            "ou dans votre compte Enlighten)",
        )
    token = token_resp.text.strip()
    if len(token) < 50:
        raise ConfigError(f"Réponse token inattendue de la part d'Enphase : {token!r}")
    log.info("Token Enphase obtenu.")
    save_cached_token(token)
    return token


def get_token(config, force_refresh=False):
    if not force_refresh:
        cached = load_cached_token()
        if cached:
            return cached
    return fetch_new_token(config)


def read_envoy_meters(config, token):
    """GET https://<envoy_host>/ivp/meters/readings, équivalent à LectureEnphase()."""
    url = f"https://{config['envoy_host']}/ivp/meters/readings"
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        verify=False,
        timeout=5,
    )
    if resp.status_code == 401:
        raise PermissionError("Token refusé (401) par la passerelle Envoy.")
    resp.raise_for_status()
    meters = resp.json()  # liste de 2 objets : [production, consommation_nette]

    def meter_view(meter):
        if not meter:
            return None
        return {
            "activePower_W": meter.get("activePower"),
            "apparentPower_VA": meter.get("apparentPower"),
            "voltage_V": meter.get("voltage"),
            "current_A": meter.get("current"),
            "freq_Hz": meter.get("freq"),
            "energyDelivered_Wh": meter.get("actEnergyDlvd"),
            "energyReceived_Wh": meter.get("actEnergyRcvd"),
            "phases": [
                {
                    "voltage_V": ch.get("voltage"),
                    "current_A": ch.get("current"),
                    "activePower_W": ch.get("activePower"),
                }
                for ch in meter.get("channels", [])
            ],
        }

    production = meter_view(meters[0]) if len(meters) > 0 else None
    net_consumption = meter_view(meters[1]) if len(meters) > 1 else None

    production_power = (production or {}).get("activePower_W") or 0.0
    grid_power = (net_consumption or {}).get("activePower_W") or 0.0
    # Consommation maison = énergie du réseau + production locale (pas de batterie supposée),
    # comme PactConso_M = PactReseau + PactProd dans le firmware.
    home_consumption = grid_power + production_power

    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "production": production,
        "grid": net_consumption,
        "home_consumption_W": home_consumption,
    }


class EnphasePoller:
    """Interroge la passerelle Envoy en tâche de fond et garde la dernière lecture en mémoire."""

    def __init__(self, config):
        self.config = config
        self.token = None
        self.lock = threading.Lock()
        self.last_reading = None
        self.last_error = None
        self._stop = threading.Event()

    def start(self):
        self.token = get_token(self.config)
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()
        return thread

    def _run(self):
        interval = self.config["poll_interval_seconds"]
        while not self._stop.is_set():
            try:
                reading = read_envoy_meters(self.config, self.token)
                with self.lock:
                    self.last_reading = reading
                    self.last_error = None
            except PermissionError:
                log.warning("Token expiré/refusé, nouvelle authentification...")
                try:
                    self.token = get_token(self.config, force_refresh=True)
                except Exception as exc:  # noqa: BLE001 - on veut afficher toute erreur
                    with self.lock:
                        self.last_error = str(exc)
                    log.error("Ré-authentification échouée : %s", exc)
            except Exception as exc:  # noqa: BLE001
                with self.lock:
                    self.last_error = str(exc)
                log.error("Erreur de lecture Envoy : %s", exc)
            time.sleep(interval)

    def snapshot(self):
        with self.lock:
            return self.last_reading, self.last_error

    def stop(self):
        self._stop.set()


def render_html(reading, error, poll_interval):
    if error and not reading:
        body = f'<p class="err">Erreur : {error}</p>'
    else:
        prod = (reading or {}).get("production") or {}
        grid = (reading or {}).get("grid") or {}
        home_w = (reading or {}).get("home_consumption_W")
        ts = (reading or {}).get("timestamp", "-")
        err_html = f'<p class="err">Dernière erreur : {error}</p>' if error else ""
        body = f"""
        <p>Dernière lecture : {ts}</p>
        {err_html}
        <table>
          <tr><th></th><th>Puissance active (W)</th><th>Tension (V)</th><th>Courant (A)</th><th>Fréquence (Hz)</th></tr>
          <tr><td>Production PV</td><td>{prod.get('activePower_W', '-')}</td><td>{prod.get('voltage_V', '-')}</td>
              <td>{prod.get('current_A', '-')}</td><td>{prod.get('freq_Hz', '-')}</td></tr>
          <tr><td>Réseau (import/export)</td><td>{grid.get('activePower_W', '-')}</td><td>{grid.get('voltage_V', '-')}</td>
              <td>{grid.get('current_A', '-')}</td><td>{grid.get('freq_Hz', '-')}</td></tr>
          <tr><td><b>Consommation maison (estimée)</b></td><td colspan="3"><b>{home_w if home_w is not None else '-'}</b></td></tr>
        </table>
        """
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="{poll_interval}">
  <title>Enphase Monitor</title>
  <style>
    body {{ font-family: sans-serif; margin: 2em; }}
    table {{ border-collapse: collapse; margin-top: 1em; }}
    th, td {{ border: 1px solid #ccc; padding: 6px 12px; text-align: right; }}
    th:first-child, td:first-child {{ text-align: left; }}
    .err {{ color: #b00020; font-weight: bold; }}
  </style>
</head>
<body>
  <h1>Données Enphase Envoy</h1>
  {body}
  <p><small>Rafraîchissement automatique toutes les {poll_interval}s. JSON brut : <a href="/data">/data</a></small></p>
</body>
</html>"""


def make_handler(poller, poll_interval):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):  # silence les logs HTTP par défaut
            pass

        def do_GET(self):
            reading, error = poller.snapshot()
            if self.path == "/data":
                payload = json.dumps({"reading": reading, "error": error}, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(payload.encode("utf-8"))
            else:
                html = render_html(reading, error, poll_interval)
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(html.encode("utf-8"))

    return Handler


def main():
    try:
        config = load_config()
    except ConfigError as exc:
        log.error(str(exc))
        return

    poller = EnphasePoller(config)
    try:
        poller.start()
    except Exception as exc:  # noqa: BLE001
        log.error("Impossible de démarrer : %s", exc)
        return

    port = config["web_port"]
    server = ThreadingHTTPServer(("0.0.0.0", port), make_handler(poller, config["poll_interval_seconds"]))
    log.info("Serveur démarré : http://localhost:%d (Ctrl+C pour arrêter)", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        poller.stop()
        server.shutdown()


if __name__ == "__main__":
    main()
