  // chaque 200ms (adaptation 5 fois par seconde)
  float SeuilPw, ErrorPw = 0, Derive = 0;
  float MaxTriacPw;
  float Kp, Ki, Kd;
  float GainCACSI = float(ReacCACSI);
  const float KiSecu = 0.004;  //Réactivité (volontairement plus rapide que la régulation normale) de la sécurité PuissanceMaxSoutirage
  int LeCanalTemp;
  bool forceOff;
  bool lissage = false;
  int Vout;
  int pos = 0;
  //Puissance est la puissance en entrée de maison. >0 si soutire. <0 si injecte
  //Cas du Triac. Action 0


  float Puissance = float(PuissanceS_M - PuissanceI_M);
  bool reserveZendure = (ReserveBatterieZendure > 0 && Source == "Zendure");
  if (NbActions == 0) LissageLong = true;  //Cas d'un capteur seul et actions déporté sur autre ESP
  for (int i = 0; i < NbActions; i++) {
    Actif[i] = LesActions[i].Actif;                                                                                //0=Inactif,1=Decoupe ou On/Off, 2=Multi, 3= Train , 4=PWM, 5=Demi-Sinus
    if (Actif[i] == MODE_MULTISINUS || Actif[i] == MODE_TRAINSINUS || Actif[i] == MODE_DEMISINUS) lissage = true;  //En RAM
    forceOff = false;

    LeCanalTemp = LesActions[i].CanalTempEnCours(HeureCouranteDeci);
    float laTemperature = -120;
    if (LeCanalTemp >= 0) {
      if (TemperatureValide[LeCanalTemp] > 0) {  //La température de ce canal est valide
        laTemperature = temperature[LeCanalTemp];
      } else {
        forceOff = true;
      }
    }
    float PuissanceAction = ZendureReserve::CalculerPuissanceAction(
        Puissance, ReserveBatterieZendure, reserveZendure,
        LesActions[i].TreserveBatt, laTemperature, PwBatteryCharge,
        BatteryStatus, AmorceBatterieZendure);
    Action::ParaPeriode P = LesActions[i].ParaEnCours(HeureCouranteDeci, laTemperature, LTARFbin, Retard[i]);  //Type: 0=NO,1=OFF,2=ON,3=PW,4=Triac
    if (forceOff) {
      P.Type = 1;  //  on arrete
    }
    LesActions[i].EnRoutage = (P.Type == 3 || P.Type == 4);
    if (Actif[i] != MODE_INACTIF && P.Type > 1) {  // On ne traite plus le NO
      SeuilPw = float(P.Vmin);
      MaxTriacPw = float(P.Vmax);
      if (P.Type == 2) {                          //ON
        float RetardForce = 100.0 - MaxTriacPw;  //On avec ouverture limitée en forcé prioritaire ou suivant la période
        if (PuissanceMaxSoutirage > 0) {
          //Sécurité globale : même forcée, une action ne doit jamais faire dépasser la puissance
          //max de soutirage configurée (protection abonnement/disjoncteur). On ferme davantage
          //(retard croissant) tant que la puissance mesurée dépasse ce seuil, et on relâche
          //progressivement dès qu'elle repasse en-dessous, sans jamais ouvrir plus que RetardForce.
          IntegrErrorPwSecu[i] += (Puissance - PuissanceMaxSoutirage) * KiSecu;
          IntegrErrorPwSecu[i] = constrain(IntegrErrorPwSecu[i], 0.0, MaxTriacPw);
          RetardF[i] = RetardForce + IntegrErrorPwSecu[i];
        } else {
          IntegrErrorPwSecu[i] = 0;  //Sécurité désactivée : RAZ pour repartir propre si réactivée
          RetardF[i] = RetardForce;
        }
      } else {  // régulation 3 (PW) ou 4 (Triac)
        IntegrErrorPwSecu[i] = 0;  //Pas de forçage : RAZ de la sécurité dédiée au forçage manuel

        //Coef Integral ou réactivité
        Ki = float(LesActions[i].Ki) / 10000.0;
        if (PuissanceAction < SeuilPw && ReacCACSI > 1 && ReacCACSI < 100) Ki = Ki * GainCACSI;  //On boost si besoin l'écart (*2, 4 ou 8)
        if (Actif[i] == MODE_DECOUPE_ONOFF && i > 0) {                                           //Les relais en On/Off
          RetardF[i] = ZendureReserve::ActualiserRetardMarcheArret(
              PuissanceAction, SeuilPw, MaxTriacPw, RetardF[i]);
        } else {
          ErrorPw = PuissanceAction - SeuilPw;
          //Integration de l'erreur
          IntegrErrorPw[i] += 0.0001;  //On ferme très légèrement si pas de message reçu. Sécurité
          IntegrErrorPw[i] += ErrorPw * Ki;
          IntegrErrorPw[i] = constrain(IntegrErrorPw[i], 0.0, 100.0);  //Ne pas accumuler des valeurs enormes
          if (LesActions[i].PID && ModePara == 1) {
            Kp = float(LesActions[i].Kp) / 1000.0;  //Coef proportionnel
            Kd = float(LesActions[i].Kd) / 1000.0;  //Coef/derivé
            Propor[i] = Kp * ErrorPw;
            if (LesActions[i].Ki == 0 && LesActions[i].Kp > 0) IntegrErrorPw[i] = 50.0;  //Cas particulier avec régulation uniquement de P
            Derive = Kd * (ErrorPw - LastErrorPw[i]);
            DeriveF[i] = 0.2 * Derive + 0.8 * DeriveF[i];            // Filtrage car manque de mesure donne Derive=0
            RetardF[i] = Propor[i] + IntegrErrorPw[i] + DeriveF[i];  //Mode PID
          } else {
            // le Triac ou les relais en sinus
            RetardF[i] = IntegrErrorPw[i];  // Gain de boucle de l'asservissement en mode Integral only
            Propor[i] = 0;
            DeriveF[i] = 0;
          }
          LastErrorPw[i] = ErrorPw;
          if (RetardF[i] < 100 - MaxTriacPw) { RetardF[i] = 100 - MaxTriacPw; }
          if (ITmode < 0 && i == 0) RetardF[i] = 100;  //Triac pas possible sur synchro interne
        }

        RetardF[i] = constrain(RetardF[i], 0.0, 100.0);
      }
    } else {
      RetardF[i] = 100.0;
      IntegrErrorPw[i] = 100.0;
      IntegrErrorPwSecu[i] = 0;
    }
    Retard[i] = round(RetardF[i]);         //Valeure entiere pour piloter le Triac et les relais
    if (RetardVx == i && Actif[i] != 0) {  //Affiche calcul retards port série ou Telnet
      char buffer[50];
      snprintf(buffer, sizeof(buffer), "Ecart= %4.0fW Retard= %3u P= %4.1f I= %4.1f D= %4.1f", ErrorPw, Retard[i], Propor[i], IntegrErrorPw[i], DeriveF[i]);
      TelnetPrintln(String(buffer));
    }
    if (Retard[i] == 100) {  // Force en cas d'arret des IT
      LesActions[i].Arreter();
      PulseOn[i] = 0;  //Stop Triac ou relais
    } else {

      switch (Actif[i]) {         //valeur en RAM du Mode de regulation
        case MODE_DECOUPE_ONOFF:  //Decoupe Sinus pour Triac ou On/Off pour relais
          if (i > 0) LesActions[i].RelaisOn();
          break;
        case MODE_MULTISINUS:  // Multi Sinus
          PulseOn[i] = tabPulseSinusOn[100 - Retard[i]];
          PulseTotal[i] = tabPulseSinusTotal[100 - Retard[i]];
          pos = PulseComptage[i];
          if (pos >= PulseTotal[i]) {
            PulseComptage[i] = 0;
          }
          break;
        case MODE_TRAINSINUS:  // Train de Sinus
          PulseOn[i] = 100 - Retard[i];
          PulseTotal[i] = 99;  //Nombre impair pour éviter courant continu
          if (testTrame > 0) {
            PulseOn[i] = testPulse;     //mode Test mesure de Puissance
            PulseTotal[i] = testTrame;  //
          }
          break;
        case MODE_PWM:  //PWM
          Vout = int(RetardF[i] * 2.55);
          if (OutOn[i] == 1) Vout = 255 - Vout;
          ledcWrite(Gpio[i], Vout);
          break;
        case MODE_DEMISINUS:                         // Demi-Sinus
          PulseOn[i] = 100 - Retard[i];              //Avance de phase
          if (PulseTotal[i] > 1) PulseTotal[i] = 0;  //0 ou 1 pour mémoriser phase230V dernier pulse
          break;
      }
    }
  }
  LissageLong = lissage;
  //Sortie vers port Série ou Telnet
  if (dispPw || dispAct) {
    String dispOut = "";
    if (dispPw) {
      dispOut += "Pw : " + String(PuissanceS_M - PuissanceI_M) + "W";
    }
    if (dispAct) {
      dispOut += " | ";
      for (int i = 0; i < NbActions; i++) {
        if (Actif[i] != MODE_INACTIF) dispOut += String(100 - Retard[i]) + "% | ";
      }
    }
    TelnetPrintln(dispOut);
  }