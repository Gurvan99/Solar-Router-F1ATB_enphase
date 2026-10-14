

/**
 * Envoie une requête au serveur pour réinitialiser les historiques.
 */
function SendRAZ() {
    if (confirm("Confirmez la remise à zéro des historiques")) {
        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                // var retour = this.responseText; // Le retour n'est pas utilisé ici
            }
        };
        xhttp.open('GET', '/ajaxRAZhisto', true);
        xhttp.send();
    }
}

/**
 * Active ou désactive les champs de paramétrage en fonction du mode et de l'état du réseau.
 */
function checkDisabled() {
    // Rend le premier champ d'IP de routeur en lecture seule
    GID("RMS_IP0").style.backgroundColor = "#888";
    GID("RMS_IP0").readOnly = true;

    F.ModeReseau = GID("ModeW").value;
    const selectedMode = document.querySelector('input[name="ModeP"]:checked');
    F.ModePara = selectedMode ? selectedMode.value : '0'; 
 
    const pESP = GID("ESP").value;

    if (GID("sources").value =="Linky") GID("Serial2V").value=9600; //vitesse Linky en mode standard 
    GID("Vport_serie").style.display = (GID("Serie").value>0) ? "table-row": "none";

    // Mise à jour de l'affichage des boutons/lignes
    GID("Bwifi").style.display = (F.ESP32_Type != 10) ? "inline-block" : "none";
    
    // Affichage des paramètres IP statiques
    const ipSettingsVisible = !(GID("dhcp").checked || F.ModeReseau == 2);
    GID("infoIP").style.display = ipSettingsVisible ? "table" : "none";
    
    // Visibilité DHCP
    GID("dhcp").style.visibility = (F.ModeReseau == 2) ? "hidden" : "visible";
    GID("ipreset").style.display = (F.ModeReseau == 2) ? "none" : "inherit";
    
    const isESPTypeEcran = ((pESP >= 4 && pESP<=9 ) || pESP==101);
    GID("rotation").style.display = isESPTypeEcran ? "table-row" : "none";
    GID("dureeOn").style.display = isESPTypeEcran ? "table-row" : "none";
    GID("Click35").style.display = isESPTypeEcran && GID("DurEcran").value>0  ? "table-row" : "none";
    GID("L_NumPageBoot").style.display = isESPTypeEcran  ? "table-row" : "none";

    
    
    // Lignes de WiFi (visibilité)
    GID("l_wifi_0").style.display = (F.ModeReseau == 2) ? "none" : "table-row";
    GID("l_wifi_1").style.display = (F.ModeReseau == 2 || F.ModePara == 0) ? "none" : "table-row";
    GID("l_wifi_2").style.display = (F.ModeReseau == 2 || F.ModePara == 0 || F.ESP32_Type == 10) ? "none" : "table-row";

    // Visibilité de la liste des routeurs
    GID("listerouteurs").style.display = (F.ModeReseau == 2 || F.ModePara == 0) ? "none" : "block";
    
    // Désactivation des options de source si F.ModeReseau == 2 (AP mode) ou F.ModePara == 0 (Non Expert)
    const isDisabledAP = (F.ModeReseau == 2);
    const isDisabledExpert = (F.ModePara == 0 || F.ModeReseau == 2);

    for (let i = 5; i < 11; i++) {
        if (GID("sources").options[i]) {
            GID("sources").options[i].disabled = isDisabledAP;
        }
    }
    if (GID("sources").options[11]) {
        GID("sources").options[11].disabled = isDisabledExpert;
    }

    // Désactivation des options de température par canal
    for (let i = 0; i < 4; i++) {
        const srcTemp = GID('srcTemp' + i);
        if (srcTemp) {
            // Désactive tempExt si en mode AP
            const optExt = srcTemp.querySelector('option[value="tempExt"]');
            if (optExt) optExt.disabled = isDisabledAP;
            
            // Désactive tempMqtt si en mode AP
            const optMqtt = srcTemp.querySelector('option[value="tempMqtt"]');
            if (optMqtt) optMqtt.disabled = isDisabledAP;
        }
    }
    
    // Visibilité de l'envoi de données
    GID("donEnv").style.display = isDisabledAP ? "none" : "inline-block";
    
    // Mise à jour de l'IP affichée
    if (F.ModeReseau == 2) {
        GH("localIP", " : 192.168.4.1");
    } else {
        GH("localIP", "auto (DHCP) : " + V.localIP);
    }

    
    
    // Correction de l'horloge si le mode réseau n'est pas internet et Horloge est à 0
    if (F.ModeReseau ==2 && F.Horloge == 0) { 
        F.Horloge = 2; 
    }

    // Visibilité du bloc MQTT
    const isMqttVisible = (GID("MQTTRepet").value != 0 || GID("sources").value == "Pmqtt" || GID("subMQTT").checked) && F.ModePara > 0;
    GID("Zmqtt").style.display = isMqttVisible ? "block" : "none";
    
    // Visibilité des paramètres de température et de la surveillance
    const isExpertMode = (F.ModePara > 0);
    GID("LesSourcesTemp").style.display = isExpertMode ? "block" : "none";
    GID("pTemp").style.display = isExpertMode ? "table-row" : "none";
    GID("SurvCom").style.display = isExpertMode ? "block" : "none";
    
    // Gestion de l'affichage des lignes de paramètres de température
    for (let c = 0; c < 4; c++) {
        const srcValue = GID(`srcTemp${c}`).value;
        const isMqtt = srcValue === "tempMqtt";
        const isExt = srcValue === "tempExt";
        const isInt = srcValue === "tempInt";
        const isNo = srcValue === "tempNo";

        GID('ligneTemperature' + c).style.display = isNo ? "none" : "table";
        GID('ligneTopicT' + c).style.display = isMqtt ? "table-row" : "none";
        GID('ligneIPtemp' + c).style.display = isExt ? "table-row" : "none";
        GID('canalEXTtemp' + c).style.display = isExt ? "table-row" : "none";
        GID('ligneoffsetTemp' + c).style.display = isInt ? "table-row" : "none";
        
        // Si une source est MQTT, force l'affichage du bloc MQTT
        if (isMqtt) {
             GID("Zmqtt").style.display = "block"; // Utilisation de "block" pour écraser le "none" potentiel
        }
    }
    
    // Visibilité du Topic de Puissance (pour source 11/MQTT)
    GID('ligneTopicP').style.display = (GID("sources").value == "Pmqtt") ? "table-row" : "none";
    
    // Mise à jour et appel final
    F.Source = GID("sources").value;
    if (F.Source != 'Ext') V.Source_data = F.Source;
    AdaptationSource();
}

/**
 * Valide le format d'une adresse IP dans un champ donné.
 * @param {string} id - L'ID de l'élément input contenant l'IP.
 * @returns {boolean} Vrai si l'IP est valide, faux sinon.
 */
function checkIP(id) {
    const S = GID(id).value;
    const Table = S.split(".");
    let valide = true;
    
    if (Table.length !== 4) {
        valide = false;
    } else {
        for (const part of Table) {
            // Convertit en nombre et vérifie la plage
            const num = parseInt(part, 10);
            if (isNaN(num) || num > 255 || num < 0) {
                valide = false;
                break;
            }
        }
    }
    
    // Mise à jour du style pour feedback visuel
    GID(id).style.color = valide ? "black" : "red";
    
    return valide;
}

/**
 * Adapte l'affichage des champs de source de données en fonction de la source sélectionnée.
 */
function AdaptationSource() {
    // Visibilité des options de nom (Fixe)
    const isSourceDual = (V.Source_data === 'UxIx2' || ((V.Source_data === 'ShellyEm' || V.Source_data === 'ShellyPro') && GID("EnphaseSerial").value != 3));
    GID('ligneFixe').style.display = isSourceDual ? "table-row" : "none";
    GID('ligneFixe1').style.display = isSourceDual ? "table-row" : "none";
    GID('ligneFixe2').style.display = isSourceDual ? "table-row" : "none";
    
    // Visibilité de la calibration (seulement si UxI est la source et la source de données)
    const isSourceUxI = (V.Source_data === 'UxI' && F.Source === 'UxI');
    GID('Zcalib').style.display = isSourceUxI ? "table" : "none";
    GID('Analog').style.display = isSourceUxI ? "table-row" : "none";
    
    // Visibilité des options Linky/CACSI
    GID('CACSI').style.display = (F.Source === 'Linky') ? "table" : "none";
    
    // Détermination des libellés d'IP externe
    let txtExt = "ESP-RMS";
    let lab_enphaseShelly = "Numéro série passerelle IQ Enphase : <span class='fsize10'><br>Pour firmvare Envoy-S V7 seulement</span>";
    
    switch (F.Source) {
        case 'Enphase':
            txtExt = "Enphase-Envoy";
            break;
        case 'SmartG':
            txtExt = "SmartGateways";
            break;
        case 'HomeW':
            txtExt = "HomeWizard";
            break;
        case 'ShellyEm':
        case 'ShellyPro':
            txtExt = "Shelly (Pro) Em ";
            lab_enphaseShelly = `<div class='shem'><strong>Shelly (Pro) Em , Shelly 3EM-63 Gen3</strong><br>
                                 Monophasé : Puissance maison sur voie 0,1 ou 2<br>
                                 Triphasé : voie 3</div>
                                 <div class='shem'><Strong>Shelly Em Gen3</strong><br>
                                 Puissance maison sur voie 0 = 30, voie 1 = 31<br>
                                 Triphasé 3EM-63 : voie = 63</div>`;
                                 
            break;
        case 'Zendure':
            txtExt = "Zendure 3CT";
            break;
    }
    
    // Mise à jour des libellés
    GH('labExtIp', txtExt);
    GH('label_enphase_shelly', lab_enphaseShelly);

    // Visibilité de la ligne d'IP externe/Référence
    const isExternalSource = ['Ext', 'Enphase', 'SmartG', 'HomeW', 'ShellyEm', 'ShellyPro', 'Zendure'].includes(F.Source);
    GID('ligneExt').style.display = isExternalSource ? "table-row" : "none";
    GID('ligneExtIPauto').style.display = F.Source === 'Enphase' ? "table-row" : "none";

    // Visibilité des options d'authentification/série Enphase/Shelly
    GID('ligneEnphaseUser').style.display = (F.Source === 'Enphase') ? "table-row" : "none";
    GID('ligneEnphasePwd').style.display = (F.Source === 'Enphase') ? "table-row" : "none";
    GID('ligneEnphaseSerial').style.display = (F.Source === 'Enphase' || F.Source === 'ShellyEm' || F.Source === 'ShellyPro') ? "table-row" : "none";
    // Visibilité de l'IP de la batterie Zendure
    GID('ligneZendureBatteryIP').style.display = (F.Source === 'Zendure') ? "table-row" : "none";
    GID('ligneZendureReserve').style.display = (F.Source === 'Zendure') ? "table-row" : "none";
    GID('ligneZendureAmorce').style.display = (F.Source === 'Zendure') ? "table-row" : "none";
}

/**
 * Termine le chargement des paramètres des routeurs et met à jour les sélecteurs de température externe.
 */
function SetParaVar() {
     GID("adrIP").value = int2ip(V.IP_Fixe); //Valeur actuelle et non enregistré en fichier F.IP_Fixe
    let Soptions = "";
    
    // Boucle pour remplir les IP/Noms des routeurs et construire les options de sélection
    for (let c = 0; c < nb_ESP; c++) {
        GID(`RMS_IP${c}`).value = V.IP_RMS[c];
        GH(`RMS_Nom${c}`, nomRMS[c]);
        GID(`Routeur_${c}`).style.display = "table-row"; 
        
        // Ajout des options pour les sélecteurs de température (exclut RMS_IP0, qui est l'IP locale)
        if (c > 0) {
            Soptions += `<option value=${c}>${V.IP_RMS[c]} ${nomRMS[c]}</option>`;
        }
        
        // Affichage de la ligne suivante (avec indication) pour permettre l'ajout d'une nouvelle IP
        const d = c + 1;
        if (c < 7) {
            GH("RMS_Nom" + d, "<small>Ajoutez une adresse IP de routeur ----></small>");
            // Correction: Utiliser style.display
            GID("Routeur_" + d).style.display = "table-row";
        }
    }

    // Mise à jour des sélecteurs de température externe
    for (let i = 0; i < 4; i++) {
        GH("refTempIP" + i, Soptions);
        GID("refTempIP" + i).value = refTempIP[i];
    }
    
    
    // Mettre à jour l'état des champs désactivés
    checkDisabled();
}
