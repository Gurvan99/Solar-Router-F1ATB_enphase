
var refTempIP = [];
var BordsInverse = [".Bparametres", ".Bgeneraux"];
/**
 * Initialise les éléments HTML dynamiques pour les sources de température et les routeurs.
 */
function Init() {
    let S = "";

    // --- Génération des sources de température (4 canaux) ---
    const NbCanauxTemp = 4;
    for (let i = 0; i < NbCanauxTemp; i++) {
        // Bloc 1: Sélection du type de capteur
        S += "<div class='form cadre'>";
        S += '<div class="ligne">';
        S += `<label for="srcTemp${i}">Canal : ${i}</label>`;
        S += `<select id="srcTemp${i}" onclick="checkDisabled();">
                  <option value="tempNo" selected>Pas de mesure</option>
                  <option value="tempInt">Capteur DS18B20 Interne</option>
                  <option value="tempExt">Capteur DS18B20 ESP Externe</option>
                  <option value="tempMqtt">MQTT</option>
              </select>`;
        S += '</div>';
        S += "</div>";

        // Bloc 2: Paramètres spécifiques
        S += `<div class='form ligneTemperature' id='ligneTemperature${i}'>`;
        S += "<div class='ligne'>";
        S += `<label for='nomTemperature${i}'>Nom Température : </label>`;
        S += `<input type='text' name='nomTemperature${i}' id='nomTemperature${i}'>`;
        S += "</div>";
        S += `<div class='ligne' id='ligneoffsetTemp${i}'>`;
        S += `<label for='offsetTemp${i}'>Offset mesure température (°C) :</label>`;
        S += `<input type='number' name='offsetTemp${i}' id='offsetTemp${i}'>`;
        S += "</div>";
        S += `<div class='ligne' id='ligneTopicT${i}'>`;
        S += `<label for='TopicT${i}'>MQTT Topic Température :</label>`;
        S += `<input type='text' name='TopicT${i}' id='TopicT${i}'>`;
        S += "</div>";
        S += `<div class='ligne' id='ligneIPtemp${i}'>`;
        S += `<label for='refTempIP${i}'>Adresse IP ESP-RMS externe :</label>`;
        // Reste vide, rempli par LoadParaRouteur
        S += `<select id='refTempIP${i}'></select>`;
        S += "</div>";
        S += `<div class='ligne' id='canalEXTtemp${i}'>`;
        S += `<label for='canalEXT${i}'>Canal Température ESP-RMS externe :</label>`;
        S += `<select id='canalEXT${i}'>
                  <option value="0">Canal 0</option>
                  <option value="1">Canal 1</option>
                  <option value="2">Canal 2</option>
                  <option value="3">Canal 3</option>
              </select>`;
        S += "</div>";
        S += "</div>";
    }

    GH("Sources_Temp", S);

    // --- Génération des routeurs/RMS externes (8 entrées) ---
    S = "<div class='ligne'><div class='nomR'><strong>Nom</strong></div><div class='nomR'><strong>Adresse IP</strong></div></div>";
    const NbRouteurs = 8;
    for (let i = 0; i < NbRouteurs; i++) {
        // La ligne est initialement masquée avec 'display:none;'
        S += `<div class='ligne' id='Routeur_${i}' style='display:none;'>`;
        let bg = (i === 0) ? "style='background-color:#bbb;'" : ""; // Fond gris pour le premier élément
        S += `<div id='RMS_Nom${i}' class='nomR'></div><input type='text' id='RMS_IP${i}' ${bg} title='adresse au format IPv4 :xxx.xxx.xxx.xxx'>`;
        S += "</div>";
    }
    GH("Routeurs", S);

    // Chargement des données initiales
    SetHautBas();
    LoadParaFixe()
    
}

/**
 * Implémente les  paramètres après chargement depuis le serveur via AJAX.
 */
function SetParaFixe() {
    // Lecture du cookie de clé d'accès
    const cookieName = "CleAcces=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = decodeURIComponent(ca[i]).trim();
        if (c.indexOf(cookieName) === 0) {
            GID("CleAcces").value = c.substring(cookieName.length);
            break; // Arrêter après avoir trouvé le cookie
        }
    }

   

    // --- Paramètres Généraux (Para) ---
    GID("dhcp").checked = F.dhcpOn == 1;
    GID("gateway").value =int2ip( F.Gateway);
    GID("masque").value = int2ip(F.masque);
    GID("dns").value = int2ip(F.dns);
    GID("hostname").value = F.hostname;

    // Mode de paramétrage
    GID("ModeP" + F.ModePara).checked = true;
 

    // Autres paramètres
    GID("ModeW").value = F.ModeReseau;
    GID("sources").value = F.Source;
    GID("RMSextIP").value = int2ip(F.RMSextIP);
    GID("RMSextIPauto").checked = F.RMSextIPauto == 1;
    GID("EnphaseUser").value = F.EnphaseUser;
    GID("EnphasePwd").value = F.EnphasePwd;
    GID("EnphaseSerial").value = F.EnphaseSerial;
    GID("ZendureBatteryIP").value = int2ip(F.ZendureBatteryIP);
    GID("TopicP").value = F.TopicP;
    GID("MQTTRepet").value = F.MQTTRepet;
    GID("MQTTIP").value = int2ip(F.MQTTIP);
    GID("MQTTHost").value = F.MQTTHost;
    GID("MQTTTLS").checked = F.MQTTTLS == 1;
    GID("MQTTPort").value = F.MQTTPort;
    GID("MQTTUser").value = F.MQTTUser;
    GID("MQTTPwd").value = F.MQTTPwd;
    GID("MQTTPrefix").value = F.MQTTPrefix;
    GID("MQTTPrefixEtat").value = F.MQTTPrefixEtat;
    GID("MQTTdeviceName").value = F.MQTTdeviceName;
    GID("subMQTT").checked = F.subMQTT == 1;
    GID("nomRouteur").value = F.nomRouteur;
    GID("nomSondeFixe").value = F.nomSondeFixe;
    GID("nomSondeMobile").value = F.nomSondeMobile;
    GID("nomSfixePpos").value=F.nomSfixePpos;
    GID("nomSfixePneg").value=F.nomSfixePneg;
    GID("CalibU").value = F.CalibU;
    GID("CalibI").value = F.CalibI;
    GID("TempoRTEon").checked = F.TempoRTEon == 1;
    GID("WifiSleep").checked = F.WifiSleep == 1;
    GID("ComSurv").value = F.ComSurv;
    GID("Serie").value = F.pSerial;
    GID("Serial2V").value =F.Serial2V;
    GID("pTriac").value = F.pTriac;
    GID("ESP").value = F.ESP32_Type;
    GID("pLED").value = F.LEDgroupe;
    GID("Rot").value = F.rotation;
    GID("DurEcran").value = F.DurEcran;
    GID("clickPresence").value = F.clickPresence;
    GID("NumPageBoot").value = F.NumPageBoot;
    GID("pUxI").value = F.pUxI;
    GID("PTemp").value = F.pTemp;
    GID("EstimCACSI").checked = (F.ReacCACSI == 100)? true:false; 1;

    // --- Paramètres de Température (LesParas[1] à LesParas[4]) ---
    const NbCanauxTemp = 4;
   
    for (let c = 0; c < NbCanauxTemp; c++) {
        GID(`nomTemperature${c}` ).value = F[`nomTemperature${c}`];
        GID(`srcTemp${c}`).value = F[`Source_Temp${c}`];
        GID(`TopicT${c}`).value = F[`TopicT${c}`];
        // Stocke l'IP de référence dans le tableau global pour une utilisation ultérieure
        refTempIP[c] = F[`refTempIP${c}`];
        GID(`canalEXT${c}`).value = F[`canalTempExterne${c}`];
       GID(`offsetTemp${c}`).value = F[`offsetTemp${c}`]/100;
    }
    Set_Couleurs();
    LoadParaVar();
    GID("LesParas").style.display="block";

}

/**
 * Envoie les valeurs des paramètres au serveur via AJAX.
 */
function SendValues() {
  GID("attente").style = "visibility: visible;";
  // --- Récupération des valeurs  ---
  F.dhcpOn = GID("dhcp").checked ? 1 : 0;
  F.TempoRTEon = GID("TempoRTEon").checked ? 1 : 0;
  F.ComSurv = GID("ComSurv").value;
  F.Serial2V = GID("Serial2V").value;
  F.subMQTT = GID("subMQTT").checked ? 1 : 0;
  F.WifiSleep = GID("WifiSleep").checked ? 1 : 0;
  F.hostname =GID("hostname").value;
  F.pSerial = GID("Serie").value;
  F.pTriac = GID("pTriac").value;
  F.ModePara = document.querySelector('input[name="ModeP"]:checked').value;
  F.ModeReseau = GID("ModeW").value;
  F.ESP32_Type = GID("ESP").value;
  F.LEDgroupe = GID("pLED").value;
  F.rotation = GID("Rot").value;
  F.DurEcran = GID("DurEcran").value;
  F.clickPresence = GID("clickPresence").value;
  F.NumPageBoot = GID("NumPageBoot").value;
  F.pUxI = GID("pUxI").value;
  F.pTemp = GID("PTemp").value;
  F.ReacCACSI = GID("EstimCACSI").checked ? 100 : 0; 
  F.Source=GID("sources").value;
  if (F.ModePara == 0) { //Non Expert
    F.subMQTT = 0; F.WifiSleep = 1;
  }
  F.RMSextIP = ip2int(GID("RMSextIP").value);
  F.RMSextIPauto = GID("RMSextIPauto").checked ? 1 : 0;
  F.ZendureBatteryIP = ip2int(GID("ZendureBatteryIP").value);
  F.Gateway = ip2int(GID("gateway").value);
  F.masque = ip2int(GID("masque").value);
  F.dns = ip2int(GID("dns").value);

  F.EnphaseUser = GID("EnphaseUser").value ;
  F.EnphasePwd = GID("EnphasePwd").value ;
  F.EnphaseSerial = GID("EnphaseSerial").value ;

  F.nomRouteur =GID("nomRouteur").value.trim() ;
  F.nomSondeFixe = GID("nomSondeFixe").value.trim();
  F.nomSfixePpos = GID("nomSfixePpos").value.trim();
  F.nomSfixePneg = GID("nomSfixePneg").value.trim();
  F.nomSondeMobile = GID("nomSondeMobile").value.trim();

  F.MQTTRepet = GID("MQTTRepet").value;
  F.MQTTIP = ip2int(GID("MQTTIP").value);
  F.MQTTHost = GID("MQTTHost").value.trim();
  F.MQTTTLS = GID("MQTTTLS").checked ? 1 : 0;
  F.MQTTPort = GID("MQTTPort").value;
  F.MQTTUser = GID("MQTTUser").value.trim();
  F.MQTTPwd = GID("MQTTPwd").value.trim();
  F.MQTTPrefix = GID("MQTTPrefix").value.trim();
  F.MQTTPrefixEtat = GID("MQTTPrefixEtat").value.trim();
  F.MQTTdeviceName = GID("MQTTdeviceName").value.trim();
  F.TopicP= GID("TopicP").value.trim();
  F.nomRouteur = GID("nomRouteur").value.trim();
  F.nomSondeFixe = GID("nomSondeFixe").value.trim();
  F.nomSondeMobile = GID("nomSondeMobile").value.trim();
  F.CalibU = GID("CalibU").value;
  F.CalibI = GID("CalibI").value;
  F.CleAccesRef = GID("CleAcces").value.trim()

  for (var c = 0; c < 4; c++) {
    var QS = GID(`srcTemp${c}`).value;
    F["Source_Temp" +c] = (F.ModePara == 0) ? "tempNo" : QS;
    F["nomTemperature" +c] = GID(`nomTemperature${c}`).value.trim();
    F["TopicT"+c] = GID(`TopicT${c}`).value.trim();
    F["refTempIP"+c] = GID(`refTempIP${c}`).value;
    F["canalTempExterne"+c] = GID(`canalEXT${c}`).value;
    F["offsetTemp"+c] = GID(`offsetTemp${c}`).value * 100;
  }
  F.RMS_IP0 = ip2int(GID("adrIP").value);
  F.IP_Fixe = F.RMS_IP0;
  for (let i = 1; i < 8; i++) {
    let Vip = (F.ModePara == 0) ? 0 : ip2int(GID("RMS_IP" + i).value.trim());
    F["RMS_IP"+i] = Vip;
  }
  
  document.cookie = "CleAcces=" + encodeURIComponent(F.CleAccesRef) + ";max-age=31536000;path=/"; // Ajout de la durée et du chemin
  // Si un nom d'hôte MQTT est renseigné (broker cloud), l'IP MQTT devient facultative (repli legacy).
  if ((GID("dhcp").checked || checkIP("adrIP") && checkIP("gateway")) && (!GID("MQTTRepet").checked || GID("MQTTHost").value.trim().length > 0 || checkIP("MQTTIP"))) {
    fetch("/ParaNew", {
      method: "POST",                     // méthode HTTP
      headers: {
        "Content-Type": "application/json" // indique qu'on envoie du JSON
      },

      body: JSON.stringify(F)          // conversion de l'objet JS en texte JSON

    })
      .then(response => {
        if (!response.ok) throw new Error("Erreur HTTP " + response.status);
        return response.json();             // transforme la réponse JSON en objet JS
      })
      .then(resultat => {
        console.log("Réponse du serveur :", resultat);
        location.reload();
      })
      .catch(error => {
        console.error("Erreur d'envoi :", error);
      });
  }
}
