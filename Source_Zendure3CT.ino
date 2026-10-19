// ******************************************************
// * Client d'un compteur Zendure 3CT                  *
// * HTTP simple, sans authentification ni TLS :        *
// *   GET http://<IP>/properties/report                *
// * Seule la phase A (a_aprt_power) sert au routage ;    *
// * b_aprt_power/c_aprt_power/total_power sont ignorés   *
// * pour le calcul et ne sont plus affichés. L'appareil *
// * ne fournit pas de tension, fixée arbitrairement à     *
// * 220V.                                                *
// ******************************************************
#include "ZendureReserve.h"

void LectureZendure3CT() {
  static unsigned long LastZendureMillis = 0;  // pour l'intégration logicielle de l'énergie
  // Initialisation des mesures batterie comme invalides
  PowerSecteur = -1;
  PwBattery = 0;
  ZendurePowerValide = false;
  PwBatteryCharge = -1;
  BatteryStatus = -1;

  String Zendure_Data = "";
  WiFiClient clientESP_RMS;
  String host = IP2String(RMSextIP);

  if (!clientESP_RMS.connect(host.c_str(), 80, 3000)) {
    delay(500);
    if (!clientESP_RMS.connect(host.c_str(), 80, 3000)) {
      clientESP_RMS.stop();
      delay(100);
      StockMessage("connection to Zendure 3CT failed : " + host);
      return;
    }
  }

  String url = "/properties/report";
  clientESP_RMS.print(String("GET ") + url + " HTTP/1.1\r\n" + "Host: " + host + "\r\n" + "Connection: close\r\n\r\n");
  unsigned long timeout = millis();
  while (clientESP_RMS.available() == 0) {
    if (millis() - timeout > 5000) {
      StockMessage("client Zendure 3CT Timeout ! : " + host);
      clientESP_RMS.stop();
      delay(100);
      return;
    }
  }
  timeout = millis();
  // Lecture des données brutes distantes
  while (clientESP_RMS.available() && (millis() - timeout < 5000)) {
    Zendure_Data += clientESP_RMS.readStringUntil('\r');
  }
  clientESP_RMS.stop();

  int p = Zendure_Data.indexOf("{");

  if (p < 0 || Zendure_Data.indexOf("a_aprt_power") < 0) {
    StockMessage("Réponse Zendure 3CT invalide : " + host);
    return;
  }
  Zendure_Data = Zendure_Data.substring(p);

  float Pw = PfloatMax(ValJson("a_aprt_power", Zendure_Data));
  PowerSecteur = Pw;
  ZendurePowerValide = true;

  // Lecture de la batterie Zendure (SolarFlow) si son IP est définie
  if (ZendureBatteryIP > 0) {
    String Battery_Data = "";
    String batteryHost = IP2String(ZendureBatteryIP);
    if (!clientESP_RMS.connect(batteryHost.c_str(), 80, 3000)) {
      StockMessage("connection to Zendure batterie failed : " + batteryHost);
    } else {
      clientESP_RMS.print(String("GET ") + url + " HTTP/1.1\r\n" + "Host: " + batteryHost + "\r\n" + "Connection: close\r\n\r\n");
      timeout = millis();
      bool timeoutBatterie = false;
      while (clientESP_RMS.available() == 0) {
        if (millis() - timeout > 5000) {
          timeoutBatterie = true;
          break;
        }
        delay(1);
      }
      if (timeoutBatterie) {
        StockMessage("Timeout batterie Zendure : " + batteryHost);
      } else {
        // Lecture jusqu'à la fermeture par la batterie (Connection: close) : le corps JSON
        // peut arriver après les en-têtes HTTP, le tampon est alors momentanément vide.
        timeout = millis();
        while ((clientESP_RMS.connected() || clientESP_RMS.available()) && (millis() - timeout < 5000)) {
          if (clientESP_RMS.available()) {
            Battery_Data += clientESP_RMS.readStringUntil('\r');
          } else {
            delay(1);
          }
        }
      }
      clientESP_RMS.stop();

      p = Battery_Data.indexOf("{");
      if (!timeoutBatterie && p >= 0 && Battery_Data.indexOf("\"packInputPower\"") > 0) {
        String json = Battery_Data.substring(p);
        PwBattery = PfloatMax(ValJson("packInputPower", json));
        PwBatteryCharge = PfloatMax(ValJson("outputPackPower", json));
        // packInputPower est la puissance délivrée par la batterie ; outputPackPower est la puissance qui la charge.
        int niveauBatterie;
        if (ZendureReserve::LireElectricLevel(json.c_str(), niveauBatterie)) {
          BatteryStatus = niveauBatterie;
        } else {
          StockMessage("electricLevel absent ou invalide (attendu 0-100) : " + batteryHost);
        }
      } else if (!timeoutBatterie) {
        StockMessage("packInputPower non trouvé sur : " + batteryHost + " (" + String(Battery_Data.length()) + " octets reçus)");
      }
    }
  }
  String puissanceCharge = PwBatteryCharge >= 0
      ? String(PwBatteryCharge, 1) + " W"
      : "Indisponible";
  String niveauBatterie = BatteryStatus >= 0
      ? String(BatteryStatus) + " %"
      : "Indisponible";
  Zendure_dataBrute = "<strong>Zendure 3CT</strong><br>PowerSecteur : " + String(PowerSecteur, 1) +
      " W<br>PwBattery : " + String(PwBattery, 1) +
      " W<br>PwBatteryCharge : " + puissanceCharge +
      "<br>BatteryStatus : " + niveauBatterie;
  float voltage = 220;

  // La décharge de la batterie (packInputPower) est comptée comme une consommation : le
  // routeur ne détourne pas vers les actions l'énergie restituée par la batterie.
  float PwRoutage = Pw + PwBattery;
  // static int cptTraceZendure = 0;  // trace de mise au point, limitée aux 100 premières lectures
  // if (cptTraceZendure < 100) {
  //   cptTraceZendure++;
  //   TelnetPrintln("Zendure " + String(cptTraceZendure) + " : PwRoutage=" + String(PwRoutage) + " Pw=" + String(Pw) + " PwBattery=" + String(PwBattery));
  // }
  if (PwRoutage >= 0) {
    PuissanceS_M_inst = PwRoutage;
    PuissanceI_M_inst = 0;
  } else {
    PuissanceS_M_inst = 0;
    PuissanceI_M_inst = -PwRoutage;
  }
  // Pas de facteur de puissance fourni par ce compteur : pas de puissance apparente calculable.
  PVAS_M_inst = 0;
  PVAI_M_inst = 0;
  Tension_M = voltage;
  PowerFactor_M = 0;

  // Intégration logicielle de l'énergie active à partir de la puissance instantanée : ce
  // compteur ne fournit pas de compteur d'énergie cumulée (contrairement à HomeWizard/Shelly),
  // on réutilise donc le mécanisme déjà en place pour UxI (EASfloat/EAIfloat).
  unsigned long tps = millis();
  if (LastZendureMillis > 0) {
    float deltaH = float(tps - LastZendureMillis) / 3600000.0;  // heures écoulées depuis le dernier appel
    if (Pw >= 0) {
      EASfloat += Pw * deltaH;
    } else {
      EAIfloat += -Pw * deltaH;
    }
  }
  LastZendureMillis = tps;
  Energie_M_Soutiree = long(EASfloat);
  Energie_M_Injectee = long(EAIfloat);
  Energie_M_Soutiree_double = EASfloat;  // pour persistance en flash, cf. Stockage.ino
  Energie_M_Injectee_double = EAIfloat;

  filtre_puissance();
  Pva_valide = true;
  PuissanceRecue = true;  // Reset du Watchdog à chaque trame Zendure reçue
  EnergieActiveValide = true;
  if (cptLEDyellow > 30) {
    cptLEDyellow = 4;
  }
}
