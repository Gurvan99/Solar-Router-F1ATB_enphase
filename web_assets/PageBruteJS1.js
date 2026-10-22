
// ============================================================================
// Variables globales
// ============================================================================

let InitFait = false;
let IdxMessage = 0;
// LIGHT_EXCLUDE_BEGIN
let MessageLinky = "";
// LIGHT_EXCLUDE_END
const BordsInverse = [".Bbrut"];

// ============================================================================
// Tableaux des mesures UxIx2
// ============================================================================
const M = [
  ["Tension_M", "Tension efficace", "V", "V"],
  ["Intensite_M", "Courant efficace", "A", "A"],
  ["PuissanceS_M", "Puissance <small>(Pw)</small>", "W", "W"],
  ["PowerFactor_M", "Facteur de puissance", "", "phi"],
  ["Energie_M_Soutiree", "Energie active soutirée", "Wh", "Wh"],
  ["Energie_M_Injectee", "Energie active injectée", "Wh", "Wh"],
  ["Tension_T", "Tension efficace", "V", "V"],
  ["Intensite_T", "Courant efficace", "A", "A"],
  ["PuissanceS_T", "Puissance <small>(Pw)</small>", "W", "W"],
  ["PowerFactor_T", "Facteur de puissance", "", "phi"],
  ["Energie_T_Soutiree", "Energie active consommée", "Wh", "Wh"],
  ["Energie_T_Injectee", "Energie active produite", "Wh", "Wh"],
  ["Frequence", "Fréquence", "Hz", "Hz"]
];

// LIGHT_EXCLUDE_BEGIN
// ============================================================================
// Tableaux Enphase
// ============================================================================
const E = [
  ["Tension_M", "Tension efficace", "V", "V"],
  ["Intensite_M", "Courant efficace", "A", "A"],
  ["PuissanceS_M", "Puissance réseau public <small>(Pw)</small>", "W", "W"],
  ["PowerFactor_M", "Facteur de puissance", "", "phi"],
  ["Energie_M_Soutiree", "Energie active soutirée", "Wh", "Wh"],
  ["Energie_M_Injectee", "Energie active injectée", "Wh", "Wh"],
  ["PactProd", "Puissance produite <small>(Pw)</small>", "W", "W"],
  ["PactConso_M", "Puissance consommée <small>(Pw)</small>", "W", "W"],
  ["Token_Enphase", "Enphase Token", "", "Enph"],
  ["EnvoySessionCookie", "Envoy SessionId Cookie", "", "Enph"],

  ["EnvoyDureeDerniereConnexionRenouveleeMs", "(step1) Durée reconnexion TLS Envoy", "ms", "Enph"],
  ["EnvoyDureeDerniereConnexionReutiliseeMs", "(step1) Durée reutilisation de connection TLS Envoy", "ms", "Enph"],
  ["EnvoyDureeDerniereRequeteViaAuthBearerMs", "(step2) Durée Authent via Bearer Token", "ms", "Enph"],
  ["EnvoyDureeDerniereRequeteViaSessionCookieMs", "(step2) Durée Authent via Session Cookie", "ms", "Enph"],
  ["EnvoyDureeDernierJsonParsingMs", "(step3) Durée Parsing Json", "ms", "Enph"],
  ["EnvoyDureeDerniereLectureCompleteMs", "Durée totale Lecture Enphase", "ms", "Enph"],
  ["EnvoyIntervaleDernieresLecturesCompleteslMs", "Délai entre dernieres lectures Enphase", "ms", "Enph"],

  ["EnvoyCompteTentativesConnexionRenouvelee", "# tentatives reconnexions TLS Envoy", "", "Enph"],
  ["EnvoyCompteTentativesRequeteAuthBearer", "# tentatives Auth Bearer Token Envoy", "", "Enph"],
  ["EnvoyCompteTentativesLectureComplete", "# tentatives lectures Envoy", "", "Enph"],
  ["EnvoyCompteSuccesLectureComplete", "# succès lectures Envoy", "", "Enph"],
  ["EnvoyCompteErreurEchecConnect", "# erreurs ouverture connexion Envoy", "", "Enph"],
  ["EnvoyCompteErreurConnectionClosed", "# erreurs connexion closed pendant réception réponse Envoy", "", "Enph"],
  ["EnvoyCompteErreurTimeout", "# erreurs timeout pendant réception réponse Envoy", "", "Enph"],
  ["EnvoyRatioErreurConnectionClosed", "Ratio erreurs connexion closed pendant réception réponse Envoy", "%", "Enph"],
  ["EnvoyRatioErreurTimeout", "Ratio erreurs timeout pendant réception réponse Envoy", "%", "Enph"],
  ["EnvoyRatioReconnexion", "Ratio reconnexions TLS Envoy / total requêtes", "%", "Enph"]

];

// ============================================================================
// Tableau Linky
// ============================================================================
const L = [
  ["EAST", "Energie active soutirée", false, "Wh", 0],
  ["EASF01", "Energie active soutirée Fournisseur,<br>index 01", true, "Wh", 0],
  ["EASF02", "Energie active soutirée Fournisseur,<br>index 02", true, "Wh", 0],
  ["EASF03", "Energie active soutirée Fournisseur,<br>index 03", true, "Wh", 0],
  ["EASF04", "Energie active soutirée Fournisseur,<br>index 04", true, "Wh", 0],
  ["EASF05", "Energie active soutirée Fournisseur,<br>index 05", true, "Wh", 0],
  ["EASF06", "Energie active soutirée Fournisseur,<br>index 06", true, "Wh", 0],
  ["EASF07", "Energie active soutirée Fournisseur,<br>index 07", true, "Wh", 0],
  ["EASF08", "Energie active soutirée Fournisseur,<br>index 08", true, "Wh", 0],
  ["EASF09", "Energie active soutirée Fournisseur,<br>index 09", true, "Wh", 0],
  ["EASF10", "Energie active soutirée Fournisseur,<br>index 10", true, "Wh", 0],
  ["EAIT", "Energie active injectée", false, "Wh", 0],
  ["IRMS1", "Courant efficace, phase 1", true, "A", 0],
  ["IRMS2", "Courant efficace, phase 2", true, "A", 0],
  ["IRMS3", "Courant efficace, phase 3", true, "A", 0],
  ["URMS1", "Tension efficace, phase 1", true, "V", 0],
  ["URMS2", "Tension efficace, phase 2", true, "V", 0],
  ["URMS3", "Tension efficace, phase 3", true, "V", 0],
  ["SINSTS", "Puissance app. instantanée soutirée", false, "VA", 0],
  ["SINSTS1", "Puissance app. instantanée soutirée phase 1", true, "VA", 0],
  ["SINSTS2", "Puissance app. instantanée soutirée phase 2", true, "VA", 0],
  ["SINSTS3", "Puissance app. instantanée soutirée phase 3", true, "VA", 0],
  ["SMAXSN", "Puissance app. max. soutirée n", false, "VA", 1],
  ["SMAXSN1", "Puissance app. max. soutirée n phase 1", true, "VA", 1],
  ["SMAXSN2", "Puissance app. max. soutirée n phase 2", true, "VA", 1],
  ["SMAXSN3", "Puissance app. max. soutirée n phase 3", true, "VA", 1],
  ["SMAXSN-1", "Puissance app. max. soutirée n-1", false, "VA", 1],
  ["SMAXSN1-1", "Puissance app. max. soutirée n-1 phase 1", true, "VA", 1],
  ["SMAXSN2-1", "Puissance app. max. soutirée n-1 phase 2", true, "VA", 1],
  ["SMAXSN3-1", "Puissance app. max. soutirée n-1 phase 3", true, "VA", 1],
  ["SINSTI", "Puissance app. instantanée injectée", false, "VA", 0],
  ["SMAXIN", "Puissance app. max injectée n", false, "VA", 1],
  ["SMAXIN-1", "Puissance app. max injectée n-1", false, "VA", 1],
  ["LTARF", "Option Tarifaire", false, "", 2]
];

// ============================================================================
// Création des tableaux HTML
// ============================================================================

function creerTableauUxIx2() {
  let S = "<table>";
  for (let i = 0; i < M.length; i++) {
    if (i === 0) {
      S += `<tr class="titre"><td id="nomSondeMobile">Maison</td><td></td><td></td></tr>`;
    }
    if (i === 6) {
      S += `<tr class="titre"><td id="nomSondeFixe">Triac</td><td></td><td></td></tr>`;
    }
    S += `<tr class="${M[i][3]}"><td>${M[i][1]}</td><td id="${M[i][0]}" class="ri"></td><td>${M[i][2]}</td></tr>`;
  }
  S += "</table>";
  GH("tableau", S);
}

function creerTableauEnphase() {
  let S = "<table>";
  for (let i = 0; i < E.length; i++) {
    if (i === 0) {
      S += `<tr class="titre"><td id="nomSondeMobile">Maison</td><td></td><td></td></tr>`;
    }
    S += `<tr class="${E[i][3]}"><td>${E[i][1]}</td><td id="${E[i][0]}" class="ri"></td><td>${E[i][2]}</td></tr>`;
  }
  S += "</table>";
  GH("tableauEnphase", S);
}

function creerTableauLinky() {
  let S = "<table>";
  for (let i = 0; i < L.length; i++) {
    S += `<tr id="L${L[i][0]}" style="display:none;" class="${L[i][3]}">
            <td>${L[i][1]}</td>
            <td id="${L[i][0]}" class="ri"></td>
            <td>${L[i][3]}</td>
            <td id="h${L[i][0]}" class="ri"></td>
          </tr>`;
  }
  S += "</table>";
  GH("tableauLinky", S);
}
// LIGHT_EXCLUDE_END

// ============================================================================
// Récupération données ESP32
// ============================================================================

function LoadDataESP32() {
  const xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        const dataESP = this.responseText;
        const Messages = dataESP.split(GS);
        const message = Messages[0].split(RS);

        let S = "<table>";

        let H = parseInt(message[0]);
        H = (H + (message[0] - H) * 0.6).toFixed(2);
        H = H.replace(".", "h ") + "mn";
        let LaSource=F.Source;
        if (LaSource=='Ext') LaSource="Externe ("+V.Source_data+")<br>" +int2ip(F.RMSextIP);

        const typeESP32 = [
          "Non défini",
          "Wroom seul",
          "Carte 1 relais",
          "Carte 4 relais",
          "Ecran ESP32-2432S028R R_ILI9341",
          "Ecran ESP32-2432S028 R_ST7789",
          "Ecran ESP32-2432S024 R_ILI9341",
          "Ecran ESP32-024 R_ST7789",
          "Ecran ESP32-2432S024C C_ILI9341",
          "Ecran JC2432W328 C_ST7789",
          "ESP32-ETH01",
          "Ecran ESP32-2432S032C ST7789"
        ];

       if(message[1]==101) message[1]=11; //Carte graphique au dela de 100

        S+='<tr><td>ESP32 On depuis :</td><td>'+H+'</td></tr>';
        S+='<tr><td>ESP32 modèle :</td><td>'+typeESP32[message[1]]+'</td></tr>';
        S+='<tr><td>Source des mesures :</td><td>'+LaSource+'</td></tr>';
              if (F.ModeReseau<2){
                if (message[1]<10 || message[11]){ //WIFI
                  S+='<tr><td>Niveau WiFi :</td><td>'+message[2]+' dBm</td></tr>';
                  S+="<tr><td>Point d'acc&egrave;s WiFi :</td><td>"+message[3]+'</td></tr>';
                  S+='<tr><td>R&eacute;seau WiFi :</td><td>'+message[6]+'</td></tr>';
                  S+='<tr><td>Canal WiFi :</td><td>'+message[4]+'</td></tr>';
                }
                S+='<tr><td>Adresse MAC ESP32 :</td><td>'+message[5]+'</td></tr>'; 
                let LesIP=message[7].split(US);               
                S+='<tr><td>Adresse IP<small>V4</small> ESP32 :</td><td><a href="http://'+LesIP[0]+'">'+LesIP[0]+'</a></td></tr>';
                S+='<tr><td>Adresse IP .local ESP32 :</td><td><a href="http://'+LesIP[1]+'.local">'+LesIP[1]+'.local</a></td></tr>';
                if (LesIP[2] !=""){
                    S+='<tr><td>Adresse IP<small>V6</small> ESP32 :</td><td><small><a href="http://['+LesIP[2]+']">['+LesIP[2]+']</a></small></td></tr>';
                }
                S+='<tr><td>Adresse passerelle :</td><td>'+message[8]+'</td></tr>';
                S+='<tr><td>Masque du r&eacute;seau :</td><td>'+message[9]+'</td></tr>';
              } else {
                S+="<tr><td>Adresse IP ESP32 (Point d'Accès) :</td><td>192.168.4.1</td></tr>";
              }
              S+='<tr><td>Charge coeur 0 (Lecture Puissance) Min, Moy, Max :</td><td>'+message[10]+' ms</td></tr>';
              S+='<tr><td>Charge coeur 1 (Calcul + Wifi) Min, Moy, Max :</td><td>'+message[11]+' ms</td></tr>';
              S+='<tr><td>Mémoire RAM libre actuellement :</td><td>'+message[13]+' octet</td></tr>';
              S+='<tr><td>Mémoire RAM libre minimum :</td><td>'+message[14]+' octet</td></tr>';
              S+="<tr><td>Nombre d'interruptions en 15ms du Gradateur (signal Zc) : Filtrés/Brutes :</td><td>"+message[15]+'</td></tr>';
              S+='<tr><td>Synchronisation au Secteur ou asynchrone horloge ESP32</td><td>'+message[16]+'</td></tr>';
              let Stemp=message[17];
              if (message[17]>0) Stemp +='<span class="fsize10">' + message[18] +'</span>';
              S+="<tr><td>Nombre de capteurs de température DS18B20 :</td><td>"+Stemp+'</td></tr>';
              S +='<tr><td style="text-align:center;"><strong>Messages</strong></td><td></td></tr>';
              let message1=Messages[1].split(RS);
              for (let i=1;i<=10;i++){
                S +='<tr><td>'+message1[i]+'</td><td></td></tr>';
              }
              let message2=Messages[2].split(RS);
              if(message2.length>1){
                S +='<tr><td style="text-align:center;"><strong>Note échanges entre routeurs</strong></td><td></td></tr>';
                for (let i=0;i<message2.length-1;i++){
                    let Note=message2[i].split(ES);
                    S +='<tr><td>'+Note[0]+'</td><td>' +Note[1] +'</td></tr>';
                }
              }
              S+='</table>';

        GH("DataESP32", S);
      }

      setTimeout(LoadDataESP32, 5000);
    }
  };

  xhttp.open("GET", "/ajax_dataESP32", true);
  xhttp.send();
}

// ============================================================================
// Fin initialisation
// ============================================================================
function SetParaFixe() {
  LoadParaVar();
}
function SetParaVar() {
  Set_Couleurs();
  LoadData();
  LoadDataESP32();
}
