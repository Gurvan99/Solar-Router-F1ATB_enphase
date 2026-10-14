
// Structure de données 
var mouseClick = false;
var blockEvent = false;
var draggedHandle = null; 
var ListeActions = [];
var SelectActions = "";
var PlotIdx = -1;
var TabIdx = 0;
var MesuresPwAct = [];
var Ecart = [];
var Ouvert = [];
var Retard = [];
var Prop = [];
var Integ = [];
var Deriv = [];
var Pause = false;
var IS = "|"; // Input Separator
var BordsInverse = [".Bactions"];

/**
 * Fonction d'initialisation appelée au chargement.
 */
function Init() {
    SetHautBas();
    LoadParaFixe();   
}

/**
 * Crée un objet représentant une action.
 */

function CreerAction(NumAction, Titre) {
    let type=3; //Pw pour les relais
    if (NumAction==0) type=4; //Pw pour le Triac
    const S = {
        Action: NumAction,
        Actif: 0,
        Titre: Titre,
        Host: "",
        Port: 80,
        OrdreOn: "",
        OrdreOff: "",
        Repet: 240,
        Tempo: 0,
        Kp: 10,
        Ki: 10,
        Kd: 10,
        PID: 0,
        ForceOuvre:100,
        TreserveBatt: -1600,
        Periodes: [{
                    Hfin: 2400,
                    Type: type,
                    Vmin: 0,
                    Vmax: 100,
                    ONouvre :100,
                    Tinf: 1600,
                    Tsup: 1600,
                    TinfForce: 1600,
                    TsupForce: 1600,
                    Hmin: 0,
                    Hmax: 0,
                    CanalTemp: -1,
                    SelAct: 255,
                    Ooff: 0,
                    O_on: 0,
                    Tarif: 31
                }]
    };
    return S;
}

/**
 * Trace le panneau de configuration pour une action donnée.
 * @param {number} iAct - Index de l'action.
 */
function TracePlanning(iAct) {
    // Modes d'activation
    let Radio0 = "<div><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-0' onclick='checkDisabled();'>Inactif</div>";
    let Radio1 = "<div><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-1' onclick='checkDisabled();'>Découpe sinus</div>";
    if (iAct > 0) { Radio1 = "<div><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-1' onclick='checkDisabled();'>On/Off</div>"; }
    Radio1 += "<div><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-5' onclick='checkDisabled();'>Demi-sinus</div>";
    Radio1 += "<div><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-2' onclick='checkDisabled();'>Multi-sinus</div>";
    Radio1 += "<div><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-3' onclick='checkDisabled();'>Train de sinus</div>";
    Radio1 += "<div id='Pwm" + iAct + "'><input type='radio' name='modeactif" + iAct + "' id='radio" + iAct + "-4' onclick='checkDisabled();'>PWM</div>";
    
    // Sélecteur de pin GPIO
    let SelectPin = "<div id='SelectPin" + iAct + "'>Gpio <select id='selectPin" + iAct + "' onchange='checkDisabled();' title='Choix broche (GPIO) de commande'>";
    for (let i = 0; i < Pins.length; i++) {
        let v = "gpio:" + Pins[i];
        if (Pins[i] == 0) v = "pas choisi ou supprimer";
        if (Pins[i] == -1) v = "Externe";
        SelectPin += "<option value=" + Pins[i]  + ">" + v + "</option>";
    }
    SelectPin += "</select></div>";
    
    // Sélecteur de sortie (niveau logique)
    let SelectOut = "<div id='SelectOut" + iAct + "'>Sortie 'On' <select id='selectOut" + iAct + "' title='Dépend du relais. En général +3.3V'><option value=0>0V</option><option value=1 selected>3.3V</option></select></div>";

    let S = "<div class='titre'><span id ='titre" + iAct + "' onclick='editTitre(" + iAct + ")' title='Donnez un nom ou effacez pour supprimer l'action'>Titre</span></div>";
    S += "<div class='visu' onclick='Plot(" + iAct + ")' id='visu" + iAct + "' title='Zoom sur la régulation en temps réel. Les réglages peuvent être modifiés. Ne pas oublier de sauvegarder'>&#128200;</div>";
    S += "<div class='mode'><div class='TitZone' title='Choix du mode de découpe du secteur'>Mode</div>" + Radio0 + Radio1 + "</div>";
    S += "<div id='blocPlanning" + iAct + "'>";
    S += "<div class='les_select' id='sortie" + iAct + "'>";
    S += "<div class='TitZone' title='Définir la broche (GPIO) ou commande'>Sortie</div>" + SelectPin + SelectOut;
    S += "<div><span id='Tempo" + iAct + "'>Temporisation(s) <input type='number' class='tm' id='tempo" + iAct + "' title='Temporisation entre chaque changement d&apos;état pour éviter des oscillations quand un appareil dans la maison consomme en dents de scie (Ex: un four).'></span></div>";
    S += "<div><span id='forceOuvre" + iAct + "'>Ouverture si forcée<input type='number' class='tm' id='ForceOuvre" + iAct + "' min='0' max='100' step='1' title='Ouverture prioritaire maximum en % si action forcée'>%</span> </div>";
    if (F.Source === 'Zendure') {
        S += "<div><span id='reserveBatt" + iAct + "'>Réserve batterie si T &ge;<input type='number' class='tm' id='TreserveBatt" + iAct + "' step='0.1' title='Au-dessus de cette température (canal de la période en cours), l&apos;action laisse la puissance réservée (page Paramètres) à la batterie. Vide = désactivé.'>°</span></div>";
    }
    S += "</div><div class='les_select' id='ligne_bas" + iAct + "'><div class='TitZone'>Externe</div>";
    S += "<div><span id='Host" + iAct + "'>Host<br><input type='text' id='host" + iAct + "' onchange='checkDisabled();' title='Adresse IP machine sur réseau LAN, nom de domaine ou rien.'></span></div>";
    S += "<div><span id='Port" + iAct + "'>Port<br><input type='number' class='tm' id='port" + iAct + "' title='Port d&apos;acc&egrave;s via le protocole http , uniquement pour machine distante. En g&eacute;n&eacute;ral <b>80</b>.'></span></div>";
    S += "<div><span id='ordreon" + iAct + "'>Ordre On<br><input type='text' id='ordreOn" + iAct + "' title='Ordre à passer à la machine distante.'></span></div>";
    S += "<div><span id='ordreoff" + iAct + "'>Ordre Off<br><input type='text' id='ordreOff" + iAct + "' ></span></div>";
    S += "<div><span id='Repet" + iAct + "'>Répétition(s)<br><input type='number' id='repet" + iAct + "' class='tm' title='P&eacute;riode en s de r&eacute;p&eacute;tition/rafra&icirc;chissement de la commande. Uniquement pour les commandes vers l&apos;extérieur. 0= pas de répétition.'></span></div>";
    S += "</div>";

    // Curseurs PID
    S += "<div class='bouton_curseur'><div class='boutons'><input  type='button' value='-' class='tbut' onclick='AddSub(-1," + iAct + ")' title='Retrait d&apos;une p&eacute;riode horaire.'>";
    S += "<input  type='button' value='+' class='tbut' onclick='AddSub(1," + iAct + ")' title='Ajout d&apos;une p&eacute;riode horaire.'></div>";
    S += "<div class='slideTriac' id='fen_slide" + iAct + "'>";
    S += "<div class='slideTriacIn' id='Propor" + iAct + "'>";
    S += "<div class='Tcell1'>Coef. Proportionnel</div>";
    S += "<div class='Tcell2'><input type='range' min='0' max='100' value='50' title='Correction proportionnelle à l&apos;écart en W' id='sliderKp" + iAct + "' style='width:100%;max-width:none;' oninput=\"GH('sensiKp" + iAct + "',Math.floor(this.value));UpdateK(" + iAct + ");\"></div>";
    S += "<div class='Tcell3'><strong id='sensiKp" + iAct + "'></strong></div>";
    S += "</div>";
    S += "<div class='slideTriacIn'>";
    S += "<div class='Tcell1'>Coef. Intégral ou R&eacute;activit&eacute;</div>";
    S += "<div class='Tcell2'><input type='range' min='0' max='100' value='50' title='Correction suivant l&apos;intégrale de l&apos;écart en W' id='sliderKi" + iAct + "' style='width:100%;max-width:none;' oninput=\"GH('sensiKi" + iAct + "',Math.floor(this.value));UpdateK(" + iAct + ");\"></div>";
    S += "<div class='Tcell3'><strong id='sensiKi" + iAct + "'></strong></div>";
    S += "</div>";
    S += "<div class='slideTriacIn' title='Correction suivant la derivée de l&apos;écart en W' id='Derive" + iAct + "'>";
    S += "<div class='Tcell1'>Coef. Dérivé</div>";
    S += "<div class='Tcell2'><input type='range' min='0' max='100' value='50' id='sliderKd" + iAct + "' style='width:100%;max-width:none;' oninput=\"GH('sensiKd" + iAct + "',Math.floor(this.value));UpdateK(" + iAct + ");\"></div>";
    S += "<div class='Tcell3'><strong id='sensiKd" + iAct + "'></strong></div>";
    S += "</div>";
    S += "</div>";
    S += "<div id='PIDbox" + iAct + "'><label for='PID" + iAct + "'> PID On</label><input type='checkbox' id='PID" + iAct + "' onclick='checkDisabled();'></div>";
    S += "</div>";
    
   
    S += "<div id='graphAction" + iAct + "' class='graphAction'><div id='graphSVG" + iAct + "' class='graphSVG'></div><div class='GraphSVG' onclick='Pause=!Pause;'>&#x23EF;</div></div>";
    
    // Conteneur des curseurs de période (avec correction onmouseup)
    S += "<div style='margin:4px;'>";
    S += "<div id='infoAction" + iAct + "' class='infoAction'></div>";
    S += "<div id='curseurs" + iAct + "' class='curseur' onmousemove='dragHandle(event," + iAct + ");' onmouseup='stopDrag();' ontouchmove='dragHandle(event," + iAct + ");' ontouchend='stopDrag();'></div>";
    S += "</div>";
    S += "</div>"; // Ferme le bloc principal

    // Remplissage des valeurs depuis F.Actions
    GH("planning" + iAct, S);
    const action = F.Actions[iAct];
    
    if (action) {
        // Mode Actif
        const radioActive = GID("radio" + iAct + "-" + action.Actif);
        if (radioActive) radioActive.checked = true;
        action.Action=iAct ;
        if (iAct==0 && action.Titre =="") action.Titre="Triac";
        GH("titre" + iAct, action.Titre);
        GV("host" + iAct, action.Host);
        GV("port" + iAct, action.Port);
        GV("ordreOn" + iAct, action.OrdreOn);
        GV("ordreOff" + iAct, action.OrdreOff);
        GV("repet" + iAct, action.Repet);
        GV("tempo" + iAct, action.Tempo);
        GV("ForceOuvre" + iAct, action.ForceOuvre);
        if (GID("TreserveBatt" + iAct)) {
            const TR = (action.TreserveBatt !== undefined) ? action.TreserveBatt : -1600;
            GV("TreserveBatt" + iAct, (TR >= -500 && TR <= 1500) ? TR / 10 : "");
        }
        
        // PID (avec mise à jour des valeurs affichées)
        GV("sliderKp" + iAct, action.Kp);
        GH("sensiKp" + iAct, action.Kp);
        GV("sliderKi" + iAct, action.Ki);
        GH("sensiKi" + iAct, action.Ki);
        GV("sliderKd" + iAct, action.Kd);
        GH("sensiKd" + iAct, action.Kd);
        
        GID("PID" + iAct).checked = action.PID == 1;   

        // Configuration Pin/Sortie (OrdreOn)
        const selectPin = GID("selectPin" + iAct);
        const selectOut = GID("selectOut" + iAct);

        if (action.OrdreOn.indexOf(IS) > 0) {
            const vals = action.OrdreOn.split(IS);
            if (selectPin) selectPin.value = vals[0];
            if (selectOut) selectOut.value = vals[1];
        } else {
            // Configuration externe ou par défaut
            if (selectPin) selectPin.value = (action.OrdreOn === "") ? 0 : -1;
            if (selectOut) selectOut.value = 1;
        }

        TracePeriodes(iAct);
    }
}

/**
 * Trace les périodes horaires pour une action donnée.
 * @param {number} iAct - Index de l'action.
 */
function TracePeriodes(iAct) {
    let S = "";
    let Sinfo = "";
    let SinfoClick = "";
    let H0 = 0;
    const colors = ["#666", "#66f", "#f66", "#6f6", "#cc4"]; // NO, OFF, ON, PW, Triac
    blockEvent = false;
    
    const action = F.Actions[iAct];
    if (!action || !action.Periodes) return;

    for (let i = 0; i < action.Periodes.length; i++) {
        const periode = action.Periodes[i];
        
        // Calcul des dimensions de la période
        const w = (periode.Hfin - H0) / 24 ; // Largeur en %
        const left = H0 / 24 ; // Position en %
        H0 = periode.Hfin;
        
        const Type = periode.Type;
        const color = colors[Type];
        
        let temperature = "";
        
        // Conditions de température
        if (periode.CanalTemp >= 0) {
            if (V.temperature[periode.CanalTemp] > -100) { // La sonde de température fonctionne
                const Tsup = periode.Tsup;
                if (Tsup >= 0 && Tsup <= 1000) temperature += `<div>T &ge;${Tsup / 10}°</div>`;
                const Tinf = periode.Tinf;
                if (Tinf >= 0 && Tinf <= 1000) temperature += `<div>T &le;${Tinf / 10}°</div>`;
            }
        }
        
        // Conditions horaires d'ouverture (pour action 255/autre action)
        let H_Ouvert = "";
        if (periode.SelAct != 255) {
            if (periode.Hmin > 0) H_Ouvert += `<div>H<span class='fsize8'>ouverture</span> &ge;${Hdeci2Hmn(periode.Hmin)}</div>`;
            if (periode.Hmax > 0) H_Ouvert += `<div>H<span class='fsize8'>ouverture</span> &le;${Hdeci2Hmn(periode.Hmax)}</div>`;
            if (periode.Ooff > 0) H_Ouvert += `<div>On à Off si &le;${periode.Ooff}%</div>`;
            if (periode.O_on > 0) H_Ouvert += `<div>Off à On si &ge;${periode.O_on}%</div>`;
        }
        
        // Conditions tarifaires (Tempo, HP/HC)
        let TxtTarif = "";
        if (V.LTARFbin > 0) {
            let Tarif_ = periode.Tarif;
            let tarifText = "Tarif : ";
            if (V.LTARFbin <= 3) {
                tarifText += (Tarif_ & 1) ? "<span style='color:red;'>H. Pleine</span>" : "";
                tarifText += (Tarif_ & 2) ? "<span style='color:green;'> H. Creuse</span>" : "";
            } else {
                tarifText += (Tarif_ & 4) ? "Tempo<span style='color:blue;'>Bleu</span>" : "";
                tarifText += (Tarif_ & 8) ? "<span style='color:white;'> Blanc</span>" : "";
                tarifText += (Tarif_ & 16) ? "<span style='color:red;'> Rouge</span>" : "";
            }
            TxtTarif = `<div>${tarifText}</div>`;
        }
        
        // Sécurité température (forçage 100% en mode Routage relais)
        let secuTemp = "";
        if (iAct > 0 && Type === 3) {
            const TinfForce = periode.TinfForce;
            const TsupForce = periode.TsupForce;
            if (TinfForce >= -500 && TinfForce <= 1500 && TsupForce >= -500 && TsupForce <= 1500) {
                secuTemp = `<div>Force 100% si T&le;${TinfForce / 10}° (retour T&ge;${TsupForce / 10}°)</div>`;
            }
        }

        const condition = (temperature !== "" || H_Ouvert !== "" || TxtTarif !== "" || secuTemp !== "") ? "<div>Condition(s) :</div>" + temperature + H_Ouvert + TxtTarif + secuTemp : "";
        let TexteMinMax = "";

        // Détermination du contenu de la zone d'info en fonction du type d'action/période
        if (action.Actif <= 1 && iAct > 0) {
            // Action On/Off (index > 0)
            periode.Vmax = Math.max(periode.Vmin, periode.Vmax);
            TexteMinMax = `<div>Off si Pw&gt;${periode.Vmax}W</div><div>On si Pw&lt;${periode.Vmin}W</div>${condition}`;
        } else {
            // Action de découpe sinus (Triac/PWM/Actif=0)
            periode.Vmax = Math.max(0, periode.Vmax);
            periode.Vmax = Math.min(100, periode.Vmax);
            TexteMinMax = `<div>Seuil Pw : ${periode.Vmin}W</div><div>Ouvre Max : ${periode.Vmax}%</div>${condition}`;
        }
        
        // Texte spécifique pour la découpe Triac 
        const TexteTriac = `<div>Seuil Pw : ${periode.Vmin}W</div><div>Ouvre Max : ${periode.Vmax}%</div>${condition}`;
        
        const paras = [`Pas de contr&ocirc;le`, `OFF`, `<div>ON</div><div>Ouverture : ${periode.ONouvre}%</div>` + condition, TexteMinMax, TexteTriac];
        const para = paras[Type];
        
        // Remplissage du div de la période (curseur visuel)
          // Créer la période
        S += "<div id='zone" + iAct + "_" + i + "' class='periode' data-idx='" + i + "' style='width:" + w + "%;left:" + left + "%;background-color:" + color + ";'>";
       
        // Ajouter une poignée de déplacement uniquement si ce n'est pas la dernière période
        if (i < action.Periodes.length - 1) {
            
           
            S += "<div class='handleStyle' ' data-action='" + iAct + "' data-periode='" + i + "' ";
            S += "onmousedown='startDrag(this,event," + iAct + "," + i + ");' ";
            S += "ontouchstart='startDrag(this,event," + iAct + "," + i + ");'>|||</div>";
        }
       
        S += "</div>";
        
        // Remplissage du div d'information
        const Hmn = Hdeci2Hmn(H0);
        const fs = Math.max(8, Math.min(16, w / 2)) + "px";
        Sinfo += `<div class='infoZone' style='width:${w}%;border-color:${color};font-size:${fs}' onclick='infoZclicK(${i},${iAct})'>`;
        Sinfo += `<div class='Hfin'>${Hmn}</div>${para}</div>`;
        
        SinfoClick += `<div id='info${iAct}Z${i}' class='infoZ'></div>`;
    }
    
    GH("curseurs" + iAct, S);
    // Combine les zones d'info cliquables (SinfoClick) et le contenu (Sinfo)
    GH("infoAction" + iAct, SinfoClick + Sinfo);
}

