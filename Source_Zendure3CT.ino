// ******************************************************
// * Client d'un compteur Zendure 3CT                  *
// * HTTP simple, sans authentification ni TLS :        *
// *   GET http://<IP>/properties/report                *
// * Seule la phase A (a_aprt_power) sert au routage ;    *
// * b_aprt_power/c_aprt_power/total_power sont ignorés   *
// * pour le calcul (visibles uniquement dans le JSON     *
// * brut affiché en page "Données brutes"). L'appareil   *
// * ne fournit pas de tension, fixée arbitrairement à     *
// * 220V.                                                *
// ******************************************************

void LectureZendure3CT() {
  static unsigned long LastZendureMillis = 0;  // pour l'intégration logicielle de l'énergie

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
  Zendure_dataBrute = "<strong>Zendure 3CT</strong><br>" + Zendure_Data;  // pour la page "Données brutes"

  float Pw = PfloatMax(ValJson("a_aprt_power", Zendure_Data));
  float PwBattery = 0;

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
      } else if (!timeoutBatterie) {
        StockMessage("packInputPower non trouvé sur : " + batteryHost + " (" + String(Battery_Data.length()) + " octets reçus)");
      }
    }
  }

  float voltage = 220;

  // La décharge de la batterie est comptée comme une consommation pour ne pas la détourner vers les actions.
  float PwRoutage = Pw + PwBattery;
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
