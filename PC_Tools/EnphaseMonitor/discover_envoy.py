#!/usr/bin/env python3
"""
Découverte de la passerelle Enphase Envoy sur le réseau local.

La passerelle Envoy expose un endpoint /info non authentifié (utilisé par les
outils Enphase officiels et par la bibliothèque pyenphase) qui répond en XML
avec son numéro de série - ça permet de la retrouver sur le réseau sans rien
connaître d'elle, et de récupérer directement le envoy_serial à mettre dans
enphase_config.json.

Étapes :
  1. Essaye d'abord "envoy.local" (résolution mDNS, marche parfois sous Windows).
  2. Sinon, scanne tout le sous-réseau local (ex: 192.168.1.0/24) en parallèle,
     en interrogeant https://<ip>/info (repli http:// si https échoue), et
     retient les hôtes dont la réponse contient un numéro de série Envoy.

Lancement :
    pip install requests
    python discover_envoy.py
"""

import concurrent.futures
import ipaddress
import re
import socket

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TIMEOUT = 0.6  # secondes par hôte testé - le scan reste rapide sur un /24
SERIAL_RE = re.compile(r"<sn>\s*(\d+)\s*</sn>", re.IGNORECASE)
SOFTWARE_RE = re.compile(r"<software>\s*([^<\s]+)\s*</software>", re.IGNORECASE)


def get_local_subnet():
    """Devine l'IP locale du PC et en déduit un sous-réseau /24 à scanner."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Astuce classique : connect() en UDP ne dialogue pas vraiment avec 8.8.8.8,
        # mais force l'OS à choisir l'IP locale de sortie (utile même hors ligne).
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    finally:
        s.close()
    network = ipaddress.ip_network(f"{local_ip}/24", strict=False)
    return local_ip, network


def probe_host(ip):
    """Interroge /info sur un hôte donné. Renvoie un dict si c'est un Envoy, sinon None."""
    for scheme in ("https", "http"):
        url = f"{scheme}://{ip}/info"
        try:
            resp = requests.get(url, timeout=TIMEOUT, verify=False)
        except requests.exceptions.RequestException:
            continue
        if resp.status_code == 200 and "<envoy_info" in resp.text:
            serial_match = SERIAL_RE.search(resp.text)
            software_match = SOFTWARE_RE.search(resp.text)
            return {
                "ip": str(ip),
                "url": url,
                "serial": serial_match.group(1) if serial_match else None,
                "software": software_match.group(1) if software_match else None,
            }
    return None


def try_mdns():
    print("Essai de résolution 'envoy.local' via mDNS...")
    try:
        ip = socket.gethostbyname("envoy.local")
        print(f"  -> résolu en {ip}, vérification...")
        result = probe_host(ip)
        if result:
            return result
        print("  -> répond mais ne semble pas être un Envoy (ou /info inaccessible).")
    except socket.gaierror:
        print("  -> non résolu (normal si mDNS/Bonjour n'est pas installé sur ce PC).")
    return None


def scan_subnet(network):
    hosts = list(network.hosts())
    print(f"Scan de {network} ({len(hosts)} adresses), interrogation de /info sur chacune...")
    found = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=64) as executor:
        futures = {executor.submit(probe_host, ip): ip for ip in hosts}
        done = 0
        for future in concurrent.futures.as_completed(futures):
            done += 1
            if done % 50 == 0:
                print(f"  ... {done}/{len(hosts)} adresses testées")
            result = future.result()
            if result:
                found.append(result)
    return found


def main():
    result = try_mdns()
    if result:
        print_result(result)
        return

    local_ip, network = get_local_subnet()
    print(f"IP locale de ce PC : {local_ip}")
    found = scan_subnet(network)

    if not found:
        print(
            "\nAucune passerelle Envoy trouvée sur ce sous-réseau.\n"
            "Vérifiez que ce PC est sur le même réseau/VLAN Wifi que la passerelle,\n"
            "ou que le pare-feu Windows n'empêche pas les requêtes sortantes."
        )
        return

    print(f"\n{len(found)} passerelle(s) Envoy trouvée(s) :")
    for r in found:
        print_result(r)


def print_result(r):
    print(f"  IP / hostname : {r['ip']}  (accessible via {r['url']})")
    print(f"  Numéro de série (envoy_serial) : {r['serial']}")
    print(f"  Version logicielle : {r['software']}")
    print("  -> à recopier dans enphase_config.json : envoy_host et envoy_serial\n")


if __name__ == "__main__":
    main()
