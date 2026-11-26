#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <math.h>
#include <time.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

const char *PURECONTROL_URL = "https://connect.purecontrol.com/api/v1/time-series";
const uint32_t PURECONTROL_TAILLE_PILE = 8000;

struct DonneesPureControl {
  String token;
  String identifiants[4];
  float temperatures[4];
  bool aEnvoyer[4] = { false, false, false, false };
  time_t horodatage = 0;
};

DonneesPureControl donneesPureControl;
volatile bool tachePureControlActive = false;
unsigned long dernierEnvoiPureControlMillis = 0;

bool IdentifiantPureControlValide(const String &identifiant) {
  if (identifiant.length() == 0 || identifiant.length() > 10) return false;
  bool nonNul = false;
  for (size_t i = 0; i < identifiant.length(); i++) {
    if (identifiant[i] < '0' || identifiant[i] > '9') return false;
    if (identifiant[i] != '0') nonNul = true;
  }
  return nonNul;
}

bool TokenPureControlValide(const String &token) {
  if (token.length() != 32) return false;
  for (size_t i = 0; i < token.length(); i++) {
    if (token[i] < 0x21 || token[i] > 0x7e) return false;
  }
  return true;
}
void EnvoyerRequetePureControl(const String &corps) {
  NetworkClientSecure client;
  client.setInsecure();
  HTTPClient requete;
  requete.setConnectTimeout(5000);
  requete.setTimeout(5000);
  if (!requete.begin(client, PURECONTROL_URL)) {
    Serial.println("PureControl : initialisation HTTPS impossible");
  } else {
    requete.addHeader("Authorization", String("Bearer ") +donneesPureControl.token);
    requete.addHeader("Content-Type", "application/json");
    requete.addHeader("Connection", "close");
    const int codeHTTP = requete.POST(corps);
    String detailReponse;
    if (codeHTTP >= 0) {
      detailReponse = requete.getString();
      detailReponse.replace('\r', ' ');
      detailReponse.replace('\n', ' ');
      if (detailReponse.length() > 120) detailReponse.remove(120);
    }
    if (codeHTTP == 200 || codeHTTP == 201) {
      Serial.println("Mesures PureControl envoyées.");
    } else {
      const String erreur = codeHTTP < 0 ? requete.errorToString(codeHTTP) : "HTTP " + String(codeHTTP);
      char detailTLS[128] = {};
      client.lastError(detailTLS, sizeof(detailTLS));
      Serial.println("Echec envoi PureControl : " + erreur +
                     (detailTLS[0] != '\0' ? " (TLS/réseau : " + String(detailTLS) + ")" : "") +
                     (detailReponse.length() > 0 ? " — " + detailReponse : ""));
    }
    requete.end();
  }
  client.stop();
}

void EnvoyerPureControl() {
  JsonDocument document;
  JsonObject valeurs = document["values"].to<JsonObject>();
  valeurs["time"].to<JsonArray>().add(static_cast<unsigned long>(donneesPureControl.horodatage));
  for (int i = 0; i < 4; i++) {
    if (donneesPureControl.aEnvoyer[i]) {
      valeurs[donneesPureControl.identifiants[i]].to<JsonArray>().add(donneesPureControl.temperatures[i]);
    }
  }

  String corps;
  serializeJson(document, corps);
  EnvoyerRequetePureControl(corps);
}

void TacheEnvoiPureControl(void *) {
  EnvoyerPureControl();
  tachePureControlActive = false;
  vTaskDelete(nullptr);
}

void GestionPureControl(unsigned long maintenant) {
  if (PureControlPeriodeMinutes == 0) {
    return;
  }
  if (!TokenPureControlValide(PureControlApiToken)) {
    return;
  }
  if (ModeReseau != 0) {
    return;
  }
  if (!HeureValide) {
    return;
  }
  if (tachePureControlActive) {
    return;
  }

  const unsigned long periodeMillis = static_cast<unsigned long>(PureControlPeriodeMinutes) * 60000UL;
  if (maintenant - dernierEnvoiPureControlMillis < periodeMillis) {
    return;
  }

  const time_t horodatage = time(nullptr);
  if (horodatage < 1600000000) {
    return;
  }

  donneesPureControl.token = PureControlApiToken;
  donneesPureControl.horodatage = horodatage;
  uint8_t nombreValeurs = 0;
  for (int i = 0; i < 4; i++) {
    donneesPureControl.aEnvoyer[i] = false;
    const int canal = PureControlCanal[i];
    const String &identifiant = PureControlId[i];
    if (canal < 0 || canal >= 4) {
      continue;
    }
    if (!IdentifiantPureControlValide(identifiant)) {
      continue;
    }
    if (Source_Temp[canal] == "tempNo" || TemperatureValide[canal] <= 0 ||
        !isfinite(temperature[canal]) || temperature[canal] < -50 || temperature[canal] > 150) {
      continue;
    }

    bool identifiantDejaUtilise = false;
    for (int precedent = 0; precedent < i; precedent++) {
      if (donneesPureControl.aEnvoyer[precedent] &&
          donneesPureControl.identifiants[precedent] == identifiant) {
        identifiantDejaUtilise = true;
        break;
      }
    }
    if (identifiantDejaUtilise) {
      continue;
    }

    donneesPureControl.identifiants[i] = identifiant;
    donneesPureControl.temperatures[i] = temperature[canal];
    donneesPureControl.aEnvoyer[i] = true;
    nombreValeurs++;
  }
  if (nombreValeurs == 0) return;

  dernierEnvoiPureControlMillis = maintenant;
  tachePureControlActive = true;
  const BaseType_t resultatTache = xTaskCreatePinnedToCore(
    TacheEnvoiPureControl,
    "PureControl",
    PURECONTROL_TAILLE_PILE,
    nullptr,
    1,
    nullptr,
    0);
  if (resultatTache != pdPASS) {
    tachePureControlActive = false;
    Serial.println("Echec : impossible de créer la tâche d'envoi PureControl.");
  }
}
