#ifndef ZENDURE_RESERVE_H
#define ZENDURE_RESERVE_H

#include <cstring>

namespace ZendureReserve {

inline bool LireElectricLevel(const char* json, int& niveau) {
  if (json == nullptr) return false;

  const char* p = json;
  const char cle[] = "\"electricLevel\"";
  while ((p = std::strstr(p, cle)) != nullptr) {
    p += sizeof(cle) - 1;
    while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
    if (*p == ':') break;
  }
  if (p == nullptr) return false;

  p++;
  while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
  if (*p < '0' || *p > '9') return false;

  int valeur = 0;
  do {
    valeur = valeur * 10 + (*p - '0');
    if (valeur > 100) return false;
    p++;
  } while (*p >= '0' && *p <= '9');

  while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
  if (*p != ',' && *p != '}' && *p != ']') return false;

  niveau = valeur;
  return true;
}

inline float CalculerPuissanceReserve(
    int reserveConfiguree, bool sourceZendure, int seuilTemperature,
    float temperature, float puissanceCharge, int niveauBatterie,
    int puissanceAmorcage) {
  if (reserveConfiguree <= 0 || !sourceZendure || seuilTemperature <= -1500
      || !(temperature > -100) || temperature * 10.0f < seuilTemperature
      || !(puissanceCharge >= 0) || niveauBatterie < 0 || niveauBatterie >= 90
      || puissanceAmorcage < 0) {
    return 0.0f;
  }

  if (puissanceCharge == 0) {
    return reserveConfiguree < puissanceAmorcage
               ? float(reserveConfiguree)
               : float(puissanceAmorcage);
  }

  const float reservePlafonnee =
      reserveConfiguree < puissanceCharge ? float(reserveConfiguree) : puissanceCharge;
  return reservePlafonnee + float(puissanceAmorcage);
}

inline float CalculerPuissanceAction(
    float puissanceMesuree, int reserveConfiguree, bool sourceZendure,
    int seuilTemperature, float temperature, float puissanceCharge,
    int niveauBatterie, int puissanceAmorcage) {
  return puissanceMesuree + CalculerPuissanceReserve(
      reserveConfiguree, sourceZendure, seuilTemperature, temperature,
      puissanceCharge, niveauBatterie, puissanceAmorcage);
}

inline float ActualiserRetardMarcheArret(
    float puissanceAction, float seuilMarche, float seuilArret,
    float retardActuel) {
  if (puissanceAction > seuilArret) retardActuel = 100.0f;
  if (puissanceAction < seuilMarche) retardActuel = 0.0f;
  return retardActuel;
}

}  // namespace ZendureReserve

#endif
