#!/usr/bin/env python3
"""
Zendure Monitor - récupère les données d'un compteur Zendure 3CT sur le réseau
local et les affiche via une petite page web locale.

Contrairement à la passerelle Enphase Envoy (voir ../EnphaseMonitor), le
compteur Zendure 3CT expose ses mesures en HTTP simple, sans authentification
ni TLS : une seule requête périodique suffit :

    GET http://<zendure_host>/properties/report

qui répond en JSON, par exemple :
{
"timestamp":1788012401,
"messageId":8,
"deviceId":"xxxxxxox",
"a_aprt_power":145,
"b_aprt_power":0,
"c_aprt_power":0,
"total_power":145
}


Configuration : voir zendure_config.example.json (à copier en
zendure_config.json et à compléter avec l'IP du compteur).

Lancement :
    pip install requests
    python zendure_monitor.py
Puis ouvrir http://localhost:8081 (port configurable) dans un navigateur.
"""

import json
import logging
import os
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "zendure_config.json")
CONFIG_EXAMPLE_PATH = os.path.join(SCRIPT_DIR, "zendure_config.example.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("zendure_monitor")


class ConfigError(Exception):
    pass


def load_config():
    """Charge zendure_config.json. Crée un gabarit et explique quoi faire s'il est absent."""
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
            "Merci de le compléter (zendure_host) puis de relancer le script."
        )

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    required = ["zendure_host"]
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
    config.setdefault("web_port", 8081)
    return config


def read_zendure_report(config):
    """GET http://<zendure_host>/properties/report, équivalent d'une LectureZendure()."""
    url = f"http://{config['zendure_host']}/properties/report"
    try:
        resp = requests.get(url, timeout=5)
    except requests.exceptions.RequestException as exc:
        raise ConfigError(f"Impossible de joindre le compteur Zendure ({url}) : {exc}") from exc

    if resp.status_code != 200:
        text = resp.text.strip()
        if len(text) > 500:
            text = text[:500] + "..."
        raise ConfigError(f"Lecture Zendure a échoué : HTTP {resp.status_code} - {text!r}")

    try:
        payload = resp.json()
    except ValueError as exc:
        raise ConfigError(f"Réponse Zendure non-JSON : {resp.text[:200]!r}") from exc

    #props = payload.get("properties", {})
    phase_a = payload.get("a_aprt_power") or 0
    phase_b = payload.get("b_aprt_power") or 0
    phase_c = payload.get("c_aprt_power") or 0
    total_power = payload.get("total_power") or 0

    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "sn": payload.get("deviceId"),
        "phaseA_power": phase_a,
        "phaseB_power": phase_b,
        "phaseC_power": phase_c,
        "total_power": total_power,
    }


class ZendurePoller:
    """Interroge le compteur Zendure en tâche de fond et garde la dernière lecture en mémoire."""

    def __init__(self, config):
        self.config = config
        self.lock = threading.Lock()
        self.last_reading = None
        self.last_error = None
        self._stop = threading.Event()

    def start(self):
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()
        return thread

    def _run(self):
        interval = self.config["poll_interval_seconds"]
        while not self._stop.is_set():
            try:
                reading = read_zendure_report(self.config)
                with self.lock:
                    self.last_reading = reading
                    self.last_error = None
            except Exception as exc:  # noqa: BLE001 - on veut afficher toute erreur
                with self.lock:
                    self.last_error = str(exc)
                log.error("Erreur de lecture Zendure : %s", exc)
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
        r = reading or {}
        ts = r.get("timestamp", "-")
        err_html = f'<p class="err">Dernière erreur : {error}</p>' if error else ""
        body = f"""
        <p>Dernière lecture : {ts} (n° série : {r.get('sn', '-')})</p>
        {err_html}
        <table>
          <tr><th></th><th>Puissance (W)</th></tr>
          <tr><td>Phase A</td><td>{r.get('phaseA_power', '-')}</td></tr>
          <tr><td>Phase B</td><td>{r.get('phaseB_power', '-')}</td></tr>
          <tr><td>Phase C</td><td>{r.get('phaseC_power', '-')}</td></tr>
          <tr><td><b>Total 3 phases</b></td><td colspan="2"><b>{r.get('total_power', '-')}</b></td></tr>
        </table>
        """
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="{poll_interval}">
  <title>Zendure Monitor</title>
  <style>
    body {{ font-family: sans-serif; margin: 2em; }}
    table {{ border-collapse: collapse; margin-top: 1em; }}
    th, td {{ border: 1px solid #ccc; padding: 6px 12px; text-align: right; }}
    th:first-child, td:first-child {{ text-align: left; }}
    .err {{ color: #b00020; font-weight: bold; }}
  </style>
</head>
<body>
  <h1>Données compteur Zendure 3CT</h1>
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

    poller = ZendurePoller(config)
    poller.start()

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
