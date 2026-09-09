
/**
 * Ferme le panneau d'information de la zone cliquée.
 * @param {string} idx - L'ID de l'élément à fermer (e.g., "info0Z0").
 */
function infoZclose(idx) {
    const champs = idx.split("info");
    const idx_parts = champs[1].split("Z");
    const iAct = parseInt(idx_parts[0], 10);
    
    const element = GID(idx);
    if (element) {
        element.style.display = "none";
    }

    // Utilisation d'une fonction anonyme pour un appel sécurisé et déverrouillage
    setTimeout(() => {
        blockEvent = false; // Réinitialise le verrou
        TracePeriodes(iAct);
    }, 100);
}

/**
 * Gère la sélection du type de fonctionnement (OFF, ON, Routage...) pour une période.
 * @param {number} T - Nouveau type de période (1=OFF, 2=ON, 3+=Routage/PID...).
 * @param {number} i - Index de la période.
 * @param {number} iAct - Index de l'action.
 */
function selectZ(T, i, iAct) {
    if (F.Actions[iAct] && F.Actions[iAct].Periodes[i]) {
        if (F.Actions[iAct].Periodes[i].Type != T) {
            F.Actions[iAct].Periodes[i].Type = T;
            const idZ = "info" + iAct + "Z" + i;
            
            // Si le mode est OFF (1), on ferme et on rafraîchit.
            if (T === 1) { 
                infoZclose(idZ);
            } else {
                // Pour les modes actifs (ON, Routage), on rafraîchit l'affichage
                // car le contenu de la zone peut changer (changement de couleur/texte)
                TracePeriodes(iAct);
            }
        }
    }
}

/**
 * Met à jour la valeur d'un paramètre spécifique d'une période après modification dans un champ input.
 * @param {HTMLElement} t - L'élément input/select qui a déclenché l'événement (this).
 */
function NewVal(t) {
    const champs = t.id.split("info");
    const idx = champs[1].split("Z"); // Num Action, Num période
    const iAct = parseInt(idx[0], 10);
    const i = parseInt(idx[1], 10);
    
    if (!F.Actions[iAct] || !F.Actions[iAct].Periodes[i]) return;

    const periode = F.Actions[iAct].Periodes[i];
    const value = GID(t.id).value;

    if (champs[0].indexOf("Pw_min") >= 0) {
        periode.Vmin = Math.floor(value);
    } else if (champs[0].indexOf("Pw_max") >= 0) {
        periode.Vmax = Math.floor(value);
        if (iAct === 0) { // Logique spécifique pour l'Action Triac (index 0)
            periode.Vmax = Math.max(periode.Vmax, 5);
            periode.Vmax = Math.min(periode.Vmax, 100);
        }
    } else if (champs[0].indexOf("ouvre") > 0) { // Ouverture ON
        periode.ONouvre = Math.floor(value);
    } else if (champs[0].indexOf("TF_inf") >= 0) { // Sécurité Routage : TinfForce (force 100% si T <= ce seuil)
        let V = value;
        if (V === "") V = 158;
        periode.TinfForce = Math.floor(parseFloat(V) * 10);
    } else if (champs[0].indexOf("TF_sup") >= 0) { // Sécurité Routage : TsupForce (retour au routage si T >= ce seuil)
        let V = value;
        if (V === "") V = 158;
        periode.TsupForce = Math.floor(parseFloat(V) * 10);
    } else if (champs[0].indexOf("inf") > 0) { // Température inférieure (Tinf)
        let V = value;
        if (V === "") V = 158; 
        periode.Tinf = Math.floor(parseFloat(V) * 10);
    } else if (champs[0].indexOf("sup") > 0) { // Température supérieure (Tsup)
        let V = value;
        if (V === "") V = 158; 
        periode.Tsup = Math.floor(parseFloat(V) * 10);
    } else if (champs[0].indexOf("H_min") >= 0) {
        periode.Hmin = Hmn2Hdeci(value);
    } else if (champs[0].indexOf("H_max") >= 0) {
        periode.Hmax = Hmn2Hdeci(value);
    } else if (champs[0].indexOf("O_min") >= 0) {
        periode.Ooff = Math.max(0, Math.min(100, Math.floor(value)));
    } else if (champs[0].indexOf("O_max") >= 0) {
        periode.O_on = Math.max(0, Math.min(100, Math.floor(value)));
    } else if (champs[0].indexOf("Tarif") >= 0) {
        const idZ = "info" + champs[1];
        let Tarif_ = 0;
        
        // Récupère l'état des checkboxes et construit la valeur binaire du tarif
        if (V.LTARFbin <= 3) { // HP/HC
            Tarif_ += GID("TarifPl_" + idZ).checked ? 1 : 0; // H pleine (bit 0)
            Tarif_ += GID("TarifCr_" + idZ).checked ? 2 : 0; // H creuse (bit 1)
        } else { // Tempo
            Tarif_ += GID("TarifBe_" + idZ).checked ? 4 : 0;  // Bleu (bit 2)
            Tarif_ += GID("TarifBa_" + idZ).checked ? 8 : 0;  // Blanc (bit 3)
            Tarif_ += GID("TarifRo_" + idZ).checked ? 16 : 0; // Rouge (bit 4)
        }
        periode.Tarif = Tarif_;
    } else if (champs[0].indexOf("CanalTemp") >= 0) {
        periode.CanalTemp = parseInt(value, 10);
    } else if (champs[0].indexOf("SelAct") >= 0) {
        periode.SelAct = parseInt(value, 10);
    }
}

/**
 * Active le mode édition pour le titre d'une action.
 * @param {number} iAct - Index de l'action.
 */
function editTitre(iAct) {
    const titreElement = GID("titre" + iAct);
    if (titreElement && titreElement.innerHTML.indexOf("<input") === -1) {
        GH("titre" + iAct, "<input type='text' value='" + titreElement.innerHTML + "' id='Etitre" + iAct + "' onblur='TitreValid(" + iAct + ")'>");
        const input = GID("Etitre" + iAct);
        if (input) input.focus();
    }
}

/**
 * Valide le nouveau titre et réaffiche le label.
 * @param {number} iAct - Index de l'action.
 */
function TitreValid(iAct) {
    const input = GID("Etitre" + iAct);
    if (input) {
        F.Actions[iAct].Titre = input.value.trim();
        GH("titre" + iAct, F.Actions[iAct].Titre);
    }
}

/**
 * Vérifie et applique l'état "disabled" ou "visible" aux éléments
 * en fonction du mode d'action (`Actif`) et du choix de sortie (GPIO ou Externe).
 */
function checkDisabled() {

    const show = (id, disp) => GID(id).style.display = disp;
    const val  = id => GID(id).value;
    const chk  = id => GID(id).checked;

    show("SelectOut0", "none");
    show("SelectPin0", "none");
    show("Freq_PWM", "none");
    show("commun", (F.ModePara > 0 && F.ReacCACSI < 100) ? "block" : "none");

    for (let iAct = 0; iAct < F.Actions.length; iAct++) {

        // --- Détermination du mode actif ---
        for (let m = 0; m <= 5; m++) {
            if (chk(`radio${iAct}-${m}`)) {
                F.Actions[iAct].Actif = m;
            }
        }

        const pinVal = parseInt(val(`selectPin${iAct}`), 10);

        // Forçage si pas de pin
        if (pinVal === -1 && F.Actions[iAct].Actif > 1 && iAct > 0) {
            F.Actions[iAct].Actif = 1;
            GID(`radio${iAct}-1`).checked = true;
        }

        // Mise à jour planning
        TracePeriodes(iAct);

        const triac = (F.pTriac > 0) ? "block" : "none";
        show("planning0", triac);
        show("TitrTriac", triac);

        const actif = F.Actions[iAct].Actif;
        const actifVisible = (actif > 0) ? "block" : "none";

        show(`blocPlanning${iAct}`, actifVisible);
        show(`visu${iAct}`, actifVisible);
        show(`forceOuvre${iAct}`, actifVisible);

        // Mode On/Off simple → pas de visu/graph
        if (actif === 1 && iAct > 0) {
            show(`graphAction${iAct}`, "none");
            show(`visu${iAct}`, "none");
            show(`forceOuvre${iAct}`, "none");
        }

        // Zones Host/Port/Repet
        let hostDisp = (actif === 1 && iAct>0) ? "block" : "none";
        show(`Tempo${iAct}`, hostDisp);

        let disable = (pinVal < 0);
        let disp = disable ? "block" : "none";

        if (!disable) {
            hostDisp = "none";
        }

        show(`SelectOut${iAct}`, (pinVal <= 0) ? "none" : "inline-block");
        show(`Host${iAct}`, hostDisp);
        show(`Port${iAct}`, hostDisp);
        show(`Repet${iAct}`, hostDisp);

        // Désactivation des modes 2..5 si pas de pin
        for (const mode of [2, 3, 4, 5]) {
            const r = GID(`radio${iAct}-${mode}`);
            if (r) r.disabled = disable;
        }

        show(`ordreoff${iAct}`, disp);
        show(`ordreon${iAct}`, disp);

        // Correction d'ordreOn si IS présent alors qu'aucune pin
        const ordreOn = GID(`ordreOn${iAct}`);
        if (ordreOn && pinVal === -1 && ordreOn.value.indexOf(IS) > 0) {
            ordreOn.value = "";
        }

        // Ligne basse
        show(
            `ligne_bas${iAct}`,
            (actif === 1 && pinVal <= 0 && iAct > 0) ? "flex" : "none"
        );

        // Slider Triac
        show(
            `fen_slide${iAct}`,
            (actif === 1 && iAct > 0) ? "none" : "table"
        );

        // PWM → affichage Freq et Commun
        if (chk(`radio${iAct}-4`)) {
            show("Freq_PWM", "block");
            show("commun", "block");
        }

        // PID
        const pid = GID(`PID${iAct}`);
        if (F.ModePara === 0 && pid) pid.checked = false;

        show(
            `PIDbox${iAct}`,
            (F.ModePara === 0 || (pinVal <= 0 && iAct > 0) || (actif === 1 && iAct > 0))
                ? "none" : "block"
        );

        const pidActive = pid && pid.checked;
        show(`Propor${iAct}`, pidActive ? "table-row" : "none");
        show(`Derive${iAct}`, pidActive ? "table-row" : "none");
    }

    // PWM désactivé sur triac
    show("Pwm0", "none");
}


/**
 * Etabli les configurations d'actions 
 */
function TraceActions(rajout) {
        
            if (F.Actions.length == 0) {  //Action 0 Triac au mini
                F.Actions[0] = CreerAction(0, "Titre Triac");
            }
            if (F.Actions.length == 1) {  //Action 1 relais au mini au mini
                F.Actions[1] = CreerAction(1, "Titre Relais 1");
            }
            let Imax=F.Actions.length;
            if (rajout) F.Actions[Imax] = CreerAction(Imax, "Titre Relais " + Imax);

            var S = "";
            for (var i = 1; i < F.Actions.length; i++) {
                S += "<div id='planning" + i + "' class='planning' ></div>";
            }
           

            if (F.Actions.length<10) S += "<input id='butR' type='button'  class='tbut' value='+' onclick='TraceActions(true);' title='Rajouter un relais d&apos;action.'>";
            GH("plannings", S);
            for (var iAct = 0; iAct < F.Actions.length; iAct++) {
                TracePlanning(iAct);
            }
            checkDisabled();
 
}

/**
 * Envoie les coefficients PID au serveur en temps réel (uniquement si PlotIdx >= 0).
 * Ces coefficients ne sont pas enregistrés.
 * @param {number} iAct - Index de l'action.
 */
function UpdateK(iAct) {
    if (PlotIdx >= 0) {
        const Kp = Math.floor(GID("sliderKp" + iAct).value);
        const Ki = Math.floor(GID("sliderKi" + iAct).value);
        const Kd = Math.floor(GID("sliderKd" + iAct).value);

        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                // var retour = this.responseText; // Le retour n'est pas utilisé
            }
        };

        xhttp.open('GET', `/UpdateK?iAct=${iAct}&Kp=${Kp}&Ki=${Ki}&Kd=${Kd}`, true);
        xhttp.send();
    }
}
