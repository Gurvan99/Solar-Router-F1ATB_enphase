#include "../ZendureReserve.h"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <limits>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <string>
#include <vector>

using byte = unsigned char;

class String {
 public:
  String() = default;
  String(const char* value) : value_(value == nullptr ? "" : value) {}
  String(int value) : value_(std::to_string(value)) {}

  String& operator+=(const String& other) {
    value_ += other.value_;
    return *this;
  }

  friend bool operator==(const String& left, const char* right) {
    return left.value_ == right;
  }

  friend String operator+(const char* left, const String& right) {
    return String(left) + right;
  }

  friend String operator+(const String& left, const char* right) {
    return left + String(right);
  }

  friend String operator+(const String& left, const String& right) {
    String result = left;
    result.value_ += right.value_;
    return result;
  }

 private:
  std::string value_;
};

float constrain(float value, double minimum, double maximum) {
  return value < minimum ? static_cast<float>(minimum)
                         : (value > maximum ? static_cast<float>(maximum) : value);
}

constexpr int MODE_INACTIF = 0;
constexpr int MODE_DECOUPE_ONOFF = 1;
constexpr int MODE_MULTISINUS = 2;
constexpr int MODE_TRAINSINUS = 3;
constexpr int MODE_PWM = 4;
constexpr int MODE_DEMISINUS = 5;
constexpr int LES_ACTIONS_LENGTH = 10;

class Action {
 public:
  struct ParaPeriode {
    ParaPeriode(int type = 0, int vmin = 0, int vmax = 0)
        : Type(type), Vmin(vmin), Vmax(vmax) {}

    int Type;
    int Vmin;
    int Vmax;
  };

  byte Actif = MODE_INACTIF;
  int TreserveBatt = -1600;
  byte Ki = 100;
  byte Kp = 0;
  byte Kd = 0;
  bool PID = false;
  int canalTemperature = -1;
  ParaPeriode parametres;
  int arrets = 0;
  int marches = 0;

  int CanalTempEnCours(int) const { return canalTemperature; }
  ParaPeriode ParaEnCours(int, float, int, int) const { return parametres; }
  void Arreter() { ++arrets; }
  void RelaisOn() { ++marches; }
};

Action LesActions[LES_ACTIONS_LENGTH];
volatile int NbActions = 0;
byte Actif[LES_ACTIONS_LENGTH] = {};
volatile int Retard[LES_ACTIONS_LENGTH] = {};
float RetardF[LES_ACTIONS_LENGTH] = {};
float IntegrErrorPw[LES_ACTIONS_LENGTH] = {};
float IntegrErrorPwSecu[LES_ACTIONS_LENGTH] = {};
float LastErrorPw[LES_ACTIONS_LENGTH] = {};
float Propor[LES_ACTIONS_LENGTH] = {};
float DeriveF[LES_ACTIONS_LENGTH] = {};
volatile int PulseOn[LES_ACTIONS_LENGTH] = {};
volatile int PulseTotal[LES_ACTIONS_LENGTH] = {};
volatile int PulseComptage[LES_ACTIONS_LENGTH] = {};
volatile int Gpio[LES_ACTIONS_LENGTH] = {};
volatile int OutOn[LES_ACTIONS_LENGTH] = {};
uint8_t tabPulseSinusOn[101] = {};
uint8_t tabPulseSinusTotal[101] = {};
volatile int testPulse = 0;
volatile int testTrame = 0;
int PuissanceS_M = 0;
int PuissanceI_M = 0;
int ReserveBatterieZendure = 0;
int AmorceBatterieZendure = 10;
float PwBatteryCharge = -1;
int BatteryStatus = -1;
String Source = "NotDef";
bool LissageLong = false;
int HeureCouranteDeci = 0;
int LTARFbin = 0;
byte ReacCACSI = 1;
float PuissanceMaxSoutirage = 0;
int16_t ITmode = 0;
byte ModePara = 0;
float temperature[4] = {};
int TemperatureValide[4] = {};
int RetardVx = -1;
bool dispPw = false;
bool dispAct = false;

void TelnetPrintln(const String&) {}
void ledcWrite(int, int) {}

void GestionOverproduction() {
#include "../GestionOverproductionBody.inc"
}

namespace {

int testsReussis = 0;
int testsEchoues = 0;

void verifier(bool condition, const char* nom) {
  if (condition) {
    ++testsReussis;
    std::cout << "[OK]  " << nom << '\n';
  } else {
    ++testsEchoues;
    std::cerr << "[ECHEC] " << nom << '\n';
  }
}

bool proche(float obtenu, float attendu) {
  return std::fabs(obtenu - attendu) < 0.001f;
}

float reserve(int reserveConfig = 500, bool sourceZendure = true,
              int seuil = 250, float temperatureAction = 25.0f,
              float charge = 200.0f, int soc = 80,
              int amorcage = 10) {
  return ZendureReserve::CalculerPuissanceReserve(
      reserveConfig, sourceZendure, seuil, temperatureAction, charge, soc,
      amorcage);
}

void reinitialiser() {
  for (int i = 0; i < LES_ACTIONS_LENGTH; ++i) {
    LesActions[i] = Action{};
    Actif[i] = MODE_INACTIF;
    Retard[i] = 0;
    RetardF[i] = 0;
    IntegrErrorPw[i] = 0;
    IntegrErrorPwSecu[i] = 0;
    LastErrorPw[i] = 0;
    Propor[i] = 0;
    DeriveF[i] = 0;
    PulseOn[i] = 0;
    PulseTotal[i] = 0;
    PulseComptage[i] = 0;
    Gpio[i] = -1;
    OutOn[i] = 0;
  }
  NbActions = 0;
  PuissanceS_M = 0;
  PuissanceI_M = 0;
  ReserveBatterieZendure = 500;
  AmorceBatterieZendure = 10;
  PwBatteryCharge = 200;
  BatteryStatus = 80;
  Source = "Zendure";
  LissageLong = false;
  ReacCACSI = 1;
  PuissanceMaxSoutirage = 0;
  ITmode = 0;
  ModePara = 0;
  temperature[0] = 25.0f;
  TemperatureValide[0] = 1;
  dispPw = false;
  dispAct = false;
}

void configurerActionRelais(int index, int seuilTemperature) {
  LesActions[index].Actif = MODE_DECOUPE_ONOFF;
  LesActions[index].TreserveBatt = seuilTemperature;
  LesActions[index].canalTemperature = 0;
  LesActions[index].parametres = Action::ParaPeriode(3, -50, 50);
  RetardF[index] = 50.0f;
}

void testerParsingElectricLevel() {
  int niveau = -1;
  verifier(ZendureReserve::LireElectricLevel(
               "{\"properties\":{\"electricLevel\":80,\"other\":1}}", niveau)
               && niveau == 80,
           "lit electricLevel dans l'objet properties");
  verifier(ZendureReserve::LireElectricLevel(
               "{\"electricLevel\" \t:\n 0}", niveau)
               && niveau == 0,
           "accepte zero et les espaces JSON");
  verifier(ZendureReserve::LireElectricLevel(
               "{\"electricLevel\":100}", niveau)
               && niveau == 100,
           "accepte 100");

  const char* invalides[] = {
      nullptr,
      "{}",
      "{\"electricLevel\":null}",
      "{\"electricLevel\":\"80\"}",
      "{\"electricLevel\":true}",
      "{\"electricLevel\":-1}",
      "{\"electricLevel\":101}",
      "{\"electricLevel\":1.5}",
      "{\"electricLevel\":80x}",
      "{\"electricLevel\": 999999999999999999999}",
      "{\"electricLevel\":80 \"other\":1}",
  };
  for (unsigned int i = 0; i < sizeof(invalides) / sizeof(invalides[0]); ++i) {
    niveau = -1;
    verifier(!ZendureReserve::LireElectricLevel(invalides[i], niveau) && niveau == -1,
             "rejette une valeur absente ou JSON invalide sans modifier la sortie");
  }
}

void testerCalculReserve() {
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, 80), 210.0f),
           "réserve réduite à la puissance absorbée plus la marge de 10 W");
  verifier(proche(reserve(500, true, 250, 25.0f, 1000.0f, 80), 510.0f),
           "réserve plafonnée au réglage plus la marge de 10 W");
  verifier(proche(reserve(500, true, 250, 25.0f, 0.1f, 80), 10.1f),
           "petite puissance absorbée autorise seulement cette puissance plus 10 W");
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, 80, 25), 225.0f),
           "utilise la puissance d'amorçage configurée quand la batterie charge");
  verifier(proche(reserve(500, true, 250, 25.0f, 0.0f, 80, 25), 25.0f),
           "utilise la puissance d'amorçage configurée avant le début de charge");
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, 80, 0), 200.0f),
           "une amorce configurée à zéro n'ajoute aucune puissance");
  verifier(proche(reserve(500, true, 250, 25.0f, 0.0f, 80, 0), 0.0f),
           "une amorce à zéro ne crée pas de réserve lorsque la batterie ne charge pas");
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, 80, -1), 0.0f),
           "refuse une puissance d'amorçage négative");

  verifier(proche(reserve(0), 0.0f), "désactive la réserve si le réglage vaut zéro");
  verifier(proche(reserve(-1), 0.0f), "désactive la réserve si le réglage est négatif");
  verifier(proche(reserve(500, false), 0.0f), "désactive la réserve pour une autre source");
  verifier(proche(reserve(500, true, -1600), 0.0f), "désactive la réserve sans seuil configuré");
  verifier(proche(reserve(500, true, 250, 24.9f), 0.0f), "attend que le seuil de température soit atteint");
  verifier(proche(reserve(500, true, 250, -120.0f), 0.0f), "refuse une température invalide");
  verifier(proche(reserve(500, true, 250, std::numeric_limits<float>::quiet_NaN()), 0.0f),
           "refuse une température NaN");
  verifier(proche(reserve(500, true, 250, 25.0f, 0.0f), 10.0f),
           "applique une amorce limitée à 10 W si la batterie ne charge pas encore");
  verifier(proche(reserve(5, true, 250, 25.0f, 0.0f), 5.0f),
           "plafonne l'amorce à la réserve configurée");
  verifier(proche(reserve(500, true, 250, 25.0f, -10.0f), 0.0f), "désactive si la batterie se décharge");
  verifier(proche(reserve(500, true, 250, 25.0f,
                          std::numeric_limits<float>::quiet_NaN()), 0.0f),
           "refuse une puissance de charge NaN");
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, -1), 0.0f),
           "désactive si le SOC est invalide");
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, 100), 0.0f),
           "désactive si la batterie est pleine");
  verifier(proche(reserve(500, true, 250, 25.0f, 200.0f, 101), 0.0f),
           "désactive si le SOC est hors plage");
}

void testerGestionOverproductionDeuxActions() {
  reinitialiser();
  NbActions = 3;
  configurerActionRelais(1, 200);
  configurerActionRelais(2, 300);
  PuissanceI_M = 100;

  GestionOverproduction();

  verifier(Retard[1] == 100,
           "GestionOverproduction arrête l'action éligible à la réserve");
  verifier(Retard[2] == 0,
           "GestionOverproduction laisse l'action non éligible fonctionner");
  verifier(LesActions[1].arrets == 1 && LesActions[2].marches == 1,
           "appelle Arreter/RelaisOn en cohérence avec chaque décision");

  reinitialiser();
  NbActions = 3;
  configurerActionRelais(1, 200);
  configurerActionRelais(2, 300);
  PuissanceI_M = 100;
  temperature[0] = 35.0f;

  GestionOverproduction();

  verifier(Retard[1] == 100 && Retard[2] == 100,
           "GestionOverproduction applique la réserve aux deux actions éligibles");

  reinitialiser();
  NbActions = 3;
  configurerActionRelais(1, 200);
  configurerActionRelais(2, 300);
  PuissanceI_M = 100;
  temperature[0] = 15.0f;

  GestionOverproduction();

  verifier(Retard[1] == 0 && Retard[2] == 0,
           "GestionOverproduction n'applique la réserve à aucune action sous les seuils");
}

void testerGestionOverproductionReevalueSeuil() {
  reinitialiser();
  NbActions = 2;
  configurerActionRelais(1, 200);
  PuissanceI_M = 100;

  GestionOverproduction();
  const int retardAuSeuilAtteint = Retard[1];

  temperature[0] = 19.9f;
  GestionOverproduction();

  verifier(retardAuSeuilAtteint == 100 && Retard[1] == 0,
           "GestionOverproduction recalcule la décision au passage sous le seuil");
  verifier(LesActions[1].arrets == 1 && LesActions[1].marches == 1,
           "le relais suit les deux décisions successives");
}

struct MesureSimulation {
  int tempsMs;
  float puissanceCharge;
  float puissanceReseau;
  float puissanceAction;
  float puissanceReserve;
  float niveauBatterie;
  float ouvertureAction;
};

struct ResultatSimulation {
  float puissanceChargeMax;
  float puissanceChargeFinale;
  float puissanceReseauFinale;
  float puissanceActionFinale;
  float puissanceReserveFinale;
  std::vector<MesureSimulation> mesures;
};

ResultatSimulation simulerReserveBatterie(
    int puissanceChargeMax, int puissanceReserve, int dureeSecondes,
    float surplusSolaire = 1000.0f, int puissanceAmorcage = 10) {
  constexpr float pasSecondes = 0.2f;
  constexpr float puissanceActionMax = 1000.0f;
  constexpr float puissanceChargeParSeconde = 1000.0f;
  constexpr float capaciteBatterieWh = 10000.0f;
  constexpr int seuilTemperature = 200;

  reinitialiser();
  NbActions = 2;
  ReserveBatterieZendure = puissanceReserve;
  AmorceBatterieZendure = puissanceAmorcage;
  BatteryStatus = 80;
  PwBatteryCharge = 0;
  configurerActionRelais(1, seuilTemperature);
  LesActions[1].Actif = MODE_PWM;
  LesActions[1].Ki = 100;
  LesActions[1].parametres = Action::ParaPeriode(3, 0, 100);

  temperature[0] = 19.9f;
  GestionOverproduction();
  temperature[0] = 20.1f;

  ResultatSimulation resultat = {};
  float puissanceChargeBatterie = 0;
  float niveauBatterie = 80.0f;
  resultat.mesures.reserve(dureeSecondes * 5);

  const int nombrePas = dureeSecondes * 5;
  for (int pas = 1; pas <= nombrePas; ++pas) {
    PwBatteryCharge = puissanceChargeBatterie;
    BatteryStatus = int(niveauBatterie);
    GestionOverproduction();

    const float ouvertureAction = 100.0f - RetardF[1];
    const float puissanceAction = puissanceActionMax * ouvertureAction / 100.0f;
    const float surplusDisponibleBatterie =
        std::max(0.0f, surplusSolaire - puissanceAction);
    const float puissanceChargeDemandee =
        niveauBatterie < 90.0f
            ? std::min(float(puissanceChargeMax), surplusDisponibleBatterie)
            : 0.0f;
    const float variationChargeMax = puissanceChargeParSeconde * pasSecondes;
    const float variationCharge = puissanceChargeDemandee - puissanceChargeBatterie;
    puissanceChargeBatterie +=
        std::max(-variationChargeMax, std::min(variationChargeMax, variationCharge));

    const float puissanceReseau =
        puissanceAction + puissanceChargeBatterie - surplusSolaire;
    if (puissanceReseau >= 0) {
      PuissanceS_M = int(std::lround(puissanceReseau));
      PuissanceI_M = 0;
    } else {
      PuissanceS_M = 0;
      PuissanceI_M = int(std::lround(-puissanceReseau));
    }

    if (niveauBatterie < 90.0f) {
      niveauBatterie += puissanceChargeBatterie * pasSecondes
                        / (36.0f * capaciteBatterieWh);
      niveauBatterie = std::min(niveauBatterie, 90.0f);
    }

    const float puissanceReserveAppliquee =
        ZendureReserve::CalculerPuissanceReserve(
        ReserveBatterieZendure, Source == "Zendure", seuilTemperature,
        temperature[0], puissanceChargeBatterie, int(niveauBatterie),
        AmorceBatterieZendure);
    resultat.puissanceChargeMax =
        std::max(resultat.puissanceChargeMax, puissanceChargeBatterie);
    resultat.puissanceChargeFinale = puissanceChargeBatterie;
    resultat.puissanceReseauFinale = puissanceReseau;
    resultat.puissanceActionFinale = puissanceAction;
    resultat.puissanceReserveFinale = puissanceReserveAppliquee;

    resultat.mesures.push_back({
        pas * 200,
        puissanceChargeBatterie,
        puissanceReseau,
        puissanceAction,
        puissanceReserveAppliquee,
        niveauBatterie,
        ouvertureAction,
    });
  }
  return resultat;
}

void afficherTraceSimulation(
    const char* nom, int puissanceChargeMax, int puissanceReserve,
    const ResultatSimulation& resultat) {
  std::cout << "\nTRACE " << nom << " : surplus=1000 W, réserve configurée="
            << puissanceReserve << " W, capacité batterie="
            << puissanceChargeMax << " W\n";
  std::cout << "temps_s,charge_batterie_W,injection_reseau_W,action_W,reserve_appliquee_W,SOC_pct,ouverture_action_pct\n";
  std::cout << std::fixed << std::setprecision(1);
  for (const MesureSimulation& mesure : resultat.mesures) {
    if (mesure.tempsMs == 200 || mesure.tempsMs % 2000 == 0
        || mesure.tempsMs == int(resultat.mesures.size()) * 200) {
      std::cout << mesure.tempsMs / 1000.0f << ','
                << mesure.puissanceCharge << ','
                << -mesure.puissanceReseau << ','
                << mesure.puissanceAction << ','
                << mesure.puissanceReserve << ','
                << mesure.niveauBatterie << ','
                << mesure.ouvertureAction << '\n';
    }
  }
  std::cout << std::defaultfloat;
}

void testerSimulationTemporelleReserveBatterie() {
  const ResultatSimulation pleineCapacite =
      simulerReserveBatterie(700, 700, 20);
  afficherTraceSimulation("charge atteignant la réserve demandée",
                          700, 700, pleineCapacite);
  verifier(pleineCapacite.mesures.front().puissanceCharge > 0.0f,
           "la batterie commence à zéro et sa charge augmente dès l'amorce");
  verifier(pleineCapacite.puissanceChargeMax >= 690.0f,
           "la simulation atteint la cible de charge batterie de 700 W");
  verifier(proche(pleineCapacite.puissanceChargeFinale, 700.0f),
           "la batterie maintient les 700 W demandés en fin de simulation");
  verifier(proche(pleineCapacite.puissanceReserveFinale, 710.0f),
           "la réserve suit les 700 W acceptés, plus la marge de 10 W");
  verifier(std::fabs(pleineCapacite.puissanceReseauFinale + 300.0f) <= 15.0f,
           "l'injection réseau reflète la charge de 700 W et la réserve");

  const ResultatSimulation capacitePartielle =
      simulerReserveBatterie(300, 700, 20);
  afficherTraceSimulation("batterie n'acceptant qu'une partie de la réserve",
                          300, 700, capacitePartielle);
  verifier(proche(capacitePartielle.puissanceChargeFinale, 300.0f),
           "la batterie plafonnée accepte seulement 300 W sur les 700 W demandés");
  verifier(capacitePartielle.puissanceChargeMax <= 300.0f,
           "la charge simulée ne dépasse jamais la capacité réelle de la batterie");
  verifier(proche(capacitePartielle.puissanceReserveFinale, 310.0f),
           "la réserve suit les 300 W acceptés, plus la marge de 10 W");
  verifier(std::fabs(capacitePartielle.puissanceReseauFinale + 310.0f) <= 15.0f,
           "l'injection réseau reflète la charge partielle et la marge réservée");

  const ResultatSimulation aucuneAcceptation =
      simulerReserveBatterie(0, 700, 20);
  afficherTraceSimulation("batterie n'acceptant aucune charge",
                          0, 700, aucuneAcceptation);
  verifier(proche(aucuneAcceptation.puissanceChargeMax, 0.0f),
           "la simulation ne crée pas de puissance de charge si la batterie refuse");
  verifier(proche(aucuneAcceptation.puissanceReserveFinale, 10.0f),
           "sans acceptation, seule l'amorce minimale de 10 W reste réservée");
}

}  // namespace

int main() {
  std::cout << "Tests natifs de GestionOverproduction et de la réserve Zendure\n";
  testerParsingElectricLevel();
  testerCalculReserve();
  testerGestionOverproductionDeuxActions();
  testerGestionOverproductionReevalueSeuil();
  testerSimulationTemporelleReserveBatterie();
  std::cout << "\n" << testsReussis << " réussis, " << testsEchoues << " échoués\n";
  return testsEchoues == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
