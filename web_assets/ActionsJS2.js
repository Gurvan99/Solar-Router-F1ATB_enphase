
    function startDrag(handleElement, ev, iAct, iPeriode) {
   if (ev.preventDefault) ev.preventDefault();
    if (ev.stopPropagation) ev.stopPropagation();
     draggedHandle = {
        action: iAct,
        periode: iPeriode,
        element: handleElement,
        originalStyle: handleElement.style.cssText
    };
    var dragStyle = "position:absolute;right:-15px;top:50%;transform:translateY(-50%) scale(1.2);width:30px;height:40px;";
    dragStyle += "background-color:#ffeb3b;border:2px solid #f57c00;border-radius:8px;";
    dragStyle += "cursor:ew-resize;display:flex;align-items:center;justify-content:center;";
    dragStyle += "font-size:14px;font-weight:bold;color:#333;z-index:10;";
    dragStyle += "box-shadow:0 4px 8px rgba(0,0,0,0.5);touch-action:none;user-select:none;";
    handleElement.style.cssText = dragStyle;
}

function dragHandle(ev, iAct) {
    if (!draggedHandle || draggedHandle.action !== iAct) return;
   
    if (ev.preventDefault) ev.preventDefault();
   
    var curseur = GID('curseurs' + iAct);
    var leftPos;
   
      if (ev.touches && ev.touches.length > 0) {
        leftPos = ev.touches[0].clientX - curseur.getBoundingClientRect().left;
    } else {
        leftPos = ev.clientX - curseur.getBoundingClientRect().left;
    }
   var width = curseur.getBoundingClientRect().width;
    var HeureMouse = leftPos * 2420 / width;
    var iPeriode = draggedHandle.periode;
   
    var NewHfin = Math.max(0, Math.min(HeureMouse, 2400));
   const action = F.Actions[iAct];
  if (iPeriode < action.Periodes.length - 1) {
        NewHfin = Math.min(NewHfin, action.Periodes[iPeriode + 1].Hfin);
    }
    if (iPeriode > 0) {
        NewHfin = Math.max(NewHfin, action.Periodes[iPeriode - 1].Hfin);
    }
   
   action.Periodes[iPeriode].Hfin = Math.floor(NewHfin);
   draggedHandle.element.textContent = Hdeci2Hmn(Math.floor(NewHfin));
   var H0 = (iPeriode > 0) ? action.Periodes[iPeriode - 1].Hfin : 0;
    var left = H0 / 24;
    var w = (NewHfin - H0) / 24;
   
   var zone = GID('zone' + iAct + '_' + iPeriode);
    if (zone) {
        zone.style.width = w + '%';
    }
   
     if (iPeriode < action.Periodes.length - 1) {
        var nextZone = GID('zone' + iAct + '_' + (iPeriode + 1));
        var nextLeft = NewHfin / 24;
        var nextW = (action.Periodes[iPeriode + 1].Hfin - NewHfin) / 24;
        if (nextZone) {
            nextZone.style.left = nextLeft + '%';
            nextZone.style.width = nextW + '%';
        }
    }
}

function stopDrag() {
    if (draggedHandle && draggedHandle.element) {
      draggedHandle.element.style.cssText = draggedHandle.originalStyle;
       
      var iAct = draggedHandle.action;
        TracePeriodes(iAct);
    }
    draggedHandle = null;
}

/**
 * Gère le mouvement du doigt (touch) pour ajuster les périodes.
 * @param {HTMLElement} t - L'élément curseur cliqué.
 * @param {Event} ev - L'objet événement touch.
 * @param {number} iAct - Index de l'action.
 */
function touchMove(t, ev, iAct) {
    // Calcul de la position X relative à l'élément (t)
    const leftPos = ev.touches[0].clientX - GID(t.id).getBoundingClientRect().left;
    NewPosition(t, leftPos, iAct);
}

/**
 * Gère le mouvement de la souris pour ajuster les périodes.
 * @param {HTMLElement} t - L'élément curseur cliqué.
 * @param {Event} ev - L'objet événement souris.
 * @param {number} iAct - Index de l'action.
 */
function mouseMove(t, ev, iAct) {
    if (mouseClick) {
        // Calcul de la position X relative à l'élément (t)
        const leftPos = ev.clientX - GID(t.id).getBoundingClientRect().left;
        NewPosition(t, leftPos, iAct);
    }
}


/**
 * Calcule et applique la nouvelle position d'un curseur horaire.
 * @param {HTMLElement} t - L'élément curseur.
 * @param {number} leftPos - La position X du pointeur/doigt relative à l'élément.
 * @param {number} iAct - Index de l'action.
 */
function NewPosition(t, leftPos, iAct) {
    
    // Récupère la largeur totale de la zone de glissement
    const width = GID(t.id).getBoundingClientRect().width;
    
    // Convertit la position en centièmes d'heure (0 à 2400)
    // Utilisation de 2400 comme référence pour 24 heures (le 2420 est ajusté au standard 2400)
    const HeureMouse = leftPos * 2400 / width;
    
    let idxClick = 0;
    let deltaX = 999999;
    
    // Cherche le curseur le plus proche (sauf le dernier qui doit rester à 2400)
    for (let i = 0; i < F.Actions[iAct].Periodes.length - 1; i++) {
        const dist = Math.abs(HeureMouse - F.Actions[iAct].Periodes[i].Hfin);
        if (dist < deltaX) {
            idxClick = i;
            deltaX = dist;
        }
    }
    
    // Borne la nouvelle position entre 0 et 2400
    let NewHfin = Math.max(0, Math.min(HeureMouse, 2400));
    
    // La dernière période (qui représente 24h) ne doit pas être déplacée
    if (idxClick === F.Actions[iAct].Periodes.length - 1) {
        NewHfin = 2400;
    }
    
    // S'assure que le curseur ne dépasse pas le curseur suivant (à droite)
    if (idxClick < F.Actions[iAct].Periodes.length - 1) {
        NewHfin = Math.min(NewHfin, F.Actions[iAct].Periodes[idxClick + 1].Hfin);
    }
    
    // S'assure que le curseur ne recule pas au-delà du curseur précédent (à gauche)
    // Note: Pour le premier curseur (idxClick = 0), cette condition est ignorée.
    if (idxClick > 0) {
        // Le curseur précédent est celui qui se termine là où celui-ci commence.
        // On vérifie la fin du curseur précédent (idxClick - 1)
        NewHfin = Math.max(NewHfin, F.Actions[iAct].Periodes[idxClick - 1].Hfin);
    }
    
    // Affecte la nouvelle fin de période (arrondie à l'entier pour les centièmes d'heure)
    F.Actions[iAct].Periodes[idxClick].Hfin = Math.floor(NewHfin);
    
    // Redessine l'affichage des périodes
    TracePeriodes(iAct);
}

/**
 * Ajoute ou supprime une période horaire pour une action.
 * @param {number} v - 1 pour ajouter, -1 pour supprimer.
 * @param {number} iAct - Index de l'action.
 */
function AddSub(v, iAct) {
    if (v === 1) {
        // Ajout
        let type=3; //Pw pour les relais
        if (iAct==0) type=4; //Pw pour le Triac
        if (F.Actions[iAct].Periodes.length < 8) {
            // Crée la nouvelle période avec des valeurs par défaut
            const newPeriod = {
                Hfin: 2400,
                Type: type,
                Vmin: 0,
                Vmax: 100,
                ONouvre : 100,
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
                Tarif: 31 // Tarif codé en bits (toutes les options actives par défaut)
            };
            F.Actions[iAct].Periodes.push(newPeriod);
            
            // Recalcule et ajuste Hfin de l'avant-dernière période pour centrer la nouvelle
            let Hbas = 0;
            const len = F.Actions[iAct].Periodes.length;
            if (len > 2) {
                // Hbas est l'Hfin de la période précédant l'avant-dernière
                Hbas = parseInt(F.Actions[iAct].Periodes[len - 3].Hfin, 10);
            }
            if (len > 1) {
                // Ajuste Hfin de l'avant-dernière période (celle qui vient d'être créée devient la dernière)
                F.Actions[iAct].Periodes[len - 2].Hfin = Math.floor((Hbas + 2400) / 2);
            }
        }
    } else {
        // Suppression
        if (F.Actions[iAct].Periodes.length > 1) {
            F.Actions[iAct].Periodes.pop();
            // S'assure que la nouvelle dernière période se termine à 2400
            if (F.Actions[iAct].Periodes.length > 0) {
                F.Actions[iAct].Periodes[F.Actions[iAct].Periodes.length - 1].Hfin = 2400;
            }
        }
    }
    F.Actions[iAct].NbPeriode= F.Actions[iAct].Periodes.length;
    TracePeriodes(iAct);
}

/**
 * Ouvre le panneau de configuration pour une période donnée.
 * @param {number} i - Index de la période.
 * @param {number} iAct - Index de l'action.
 */
function infoZclicK(i, iAct) {
    let capteurT = false;
    
    // Empêche l'ouverture multiple du panneau
    if (!blockEvent) {
        blockEvent = true;
        
        const periode = F.Actions[iAct].Periodes[i];
        const Type = periode.Type;
        const idZ = "info" + iAct + "Z" + i;
        const ONouvre = periode.ONouvre;
        
        let S = "<div class='selectZ'> S&eacute;lection Action<div class='closeZ' onclick='infoZclose(\"" + idZ + "\")'>X</div></div>";
        
        // --- Choix du Mode ---
        
        // OFF
        let check = (Type === 1) ? "checked" : "";
        S += "<div class='zOff'><div class='radioC'><input type='radio' name='R" + idZ + "' onclick='selectZ(1," + i + "," + iAct + ");' " + check + " title='Off forcé'>OFF</div></div>";
        
        S += "<div class='fcontainer'><div class='fcontleft'>";
        
        // ON (100%)
        check = (Type === 2) ? "checked" : "";
        S += "<div class='zOn'><div class='radioC'><input type='radio' name='R" + idZ + "' onclick='selectZ(2," + i + "," + iAct + ");' " + check + " title='On forcé (si conditions optionnelles valides)'>ON </div>";
        S += "<div><small>Ouverture: &nbsp;</small><input id='ONouvre_" + idZ + "' type='number' value='" + ONouvre + "' onchange='NewVal(this)' title='Ouverture en position ON.' >%</div></div>";
        
        // Routage/PWM/Triac
        check = (Type > 2) ? "checked" : "";
        
        const Vmin = periode.Vmin;
        const Vmax = periode.Vmax;
        const Tinf = periode.Tinf;
        const Tsup = periode.Tsup;
        const TinfForce = periode.TinfForce;
        const TsupForce = periode.TsupForce;
        
        let TinfC = Tinf / 10;
        let TsupC = Tsup / 10;
        let TinfForceC = TinfForce / 10;
        let TsupForceC = TsupForce / 10;
        
        const Hmin = (periode.Hmin > 0) ? Hdeci2Hmn(periode.Hmin) : "";
        const Hmax = (periode.Hmax > 0) ? Hdeci2Hmn(periode.Hmax) : "";
        const Ooff = (periode.Ooff > 0) ? periode.Ooff : "";
        const O_on = (periode.O_on > 0) ? periode.O_on : "";
        
        // Vider si hors de la plage -50.0 à 150.0
        if (Tinf > 1500 || Tinf < -500) TinfC = ""; 
        if (Tsup > 1500 || Tsup < -500) TsupC = ""; 
        if (TinfForce > 1500 || TinfForce < -500) TinfForceC = "";
        if (TsupForce > 1500 || TsupForce < -500) TsupForceC = "";

        if (iAct > 0) {
            // Mode Routage ON/OFF ou Multi/Train de sinus
            const Routage = ["", "Routage ON/Off", "Routage Multi-sinus", "Routage Train de Sinus", "PWM", "Routage Demi-Sinus"];
            S += "<div class='zPw'><div class='radioC'><input type='radio' name='R" + idZ + "' onclick='selectZ(3," + i + "," + iAct + ");' " + check + ">" + Routage[F.Actions[iAct].Actif] + "</div>";
            
            if (F.Actions[iAct].Actif <= 1) {
                // Routage ON/OFF
                S += "<div><small>On : &nbsp;</small>Pw &lt;<input id='Pw_min_" + idZ + "' type='number' value='" + Vmin + "' onchange='NewVal(this)' title='Seuil de puissance pour activer ou désactiver le routage. Attention, en cas de mode On/Off la diff&eacute;rence, seuil sup&eacute;rieur moins seuil inf&eacute;rieur doit &ecirc;tre sup&eacute;rieure &agrave; la consommation du dipositif pour &eacute;viter l&apos;oscillation du relais de commande.'>W</div>";
                S += "<div><small>Off : </small>Pw &gt;<input id='Pw_max_" + idZ + "' type='number' value='" + Vmax + "' onchange='NewVal(this)'>W</div>";
                S += "<div><small>Puissance active en entrée de maison</small></div></div>";
            } else {
                // Routage Multi/Train de sinus/PWM
                S += "<div><small>Seuil Pw : &nbsp;</small><input id='Pw_min_" + idZ + "' type='number' value='" + Vmin + "' onchange='NewVal(this)' title='Seuil de puissance pour activer ou désactiver le routage.' >W</div>";
                S += "<div><small>Puissance active en entrée de maison</small></div>";
                S += "<div><small>Ouvre Max : </small><input id='Pw_max_" + idZ + "' type='number' value='" + Vmax + "' onchange='NewVal(this)' title='Ouverture maximum du SSR. Valeur typique : 100%'>%</div></div>";
            }
        } else {
            // Mode Triac/Découpe Sinus (iAct === 0)
            const Routage = ["", "Routage Découpe Sinus", "Routage Multi-sinus", "Routage Train de Sinus", "", "Routage Demi-Sinus"];
            S += "<div class='zTriac'><div class='radioC'><input type='radio' name='R" + idZ + "' onclick='selectZ(4," + i + "," + iAct + ");' " + check + ">" + Routage[F.Actions[iAct].Actif] + "</div>";
            S += "<div>Seuil Pw &nbsp;<input id='Pw_min_" + idZ + "' type='number' value='" + Vmin + "' onchange='NewVal(this)' title='Seuil en W de r&eacute;gulation par le Triac de la puissance mesur&eacute;e Pw en entrée de la maison. Valeur typique : 0.'>W</div>";
            S += "<div><small>Puissance active en entrée de maison</small></div>";
            S += "<div>Ouvre Max <input id='Pw_max_" + idZ + "' type='number' value='" + Vmax + "' onchange='NewVal(this)' title='Ouverture maximum du triac. Valeur typique : 100%'>%</div></div>";
        }
        
        S += "</div>"; // Ferme fcontleft
        
        // --- Conditions optionnelles (Température, Action, Tarif) ---
        
        // Sélecteur de canal de température
        let SelectT = "<div>Canal de Température <select id='CanalTemp" + idZ + "' onchange='NewVal(this)'><option value=-1 selected>Non exploité</option>";
        for (let c = 0; c < 4; c++) {
            if (V.temperature[c] > -100) {
                const Temper = parseFloat(V.temperature[c]).toFixed(1);
                SelectT += "<option value=" + c + " >" + F["nomTemperature" +c] + " (" + Temper + "°)" + "</option>";
                capteurT = true;
            }
        }
        SelectT += "</select></div>";
        
        // Affichage des conditions optionnelles
        const styleDisplay = (F.ModePara === 0) ? "none" : "block";
        const style = `style='display:${styleDisplay}';`;
        S += "<div>";
        S += "<div class='TitZone' " + style + ">&nbsp;&nbsp;&nbsp;Conditions optionnelles pour activer</div>";
        
        // Conditions de Température
        if (capteurT) {
            S += "<div class='bord1px' " + style + ">";
            S += SelectT;
            S += "<div class='minmax'><div>T &ge;<input id='T_sup_" + idZ + "' type='number' value='" + TsupC + "' onchange='NewVal(this)' title='Définir la ou les températures qui permettent l&apos;activation de la fonction On ou Routage.'>°</div>";
            S += "<div>T &le;<input id='T_inf_" + idZ + "' type='number' value='" + TinfC + "' onchange='NewVal(this)'>°</div></div>";
            S += "<div><small>T en degré (-50.0 à 150.0) ou laisser vide</small></div>";
            S += "</div>";
        }

        // Sécurité température en mode Routage (relais SSR) : force 100% si T trop basse, hystérésis de retour
        if (capteurT && iAct > 0 && Type === 3) {
            S += "<div class='bord1px'>";
            S += "<div class='TitZone'>&nbsp;&nbsp;&nbsp;Sécurité : forcer 100% si température basse</div>";
            S += "<div class='minmax'><div>Forcer si T &le;<input id='TF_inf_" + idZ + "' type='number' value='" + TinfForceC + "' onchange='NewVal(this)' title='En dessous de ce seuil, le Routage est suspendu et la sortie est forcée à 100% (Ouverture Force).'>°</div>";
            S += "<div>Revient au Routage si T &ge;<input id='TF_sup_" + idZ + "' type='number' value='" + TsupForceC + "' onchange='NewVal(this)' title='Le retour au Routage normal ne se fait que quand la température remonte à ce niveau (hystérésis, évite les oscillations).'>°</div></div>";
            S += "<div><small>T en degré (-50.0 à 150.0) ou laisser vide (sécurité désactivée)</small></div>";
            S += "</div>";
        }
        
        // Conditions d'Action
        S += "<div class='bord1px' " + style + " >";
        S += "<div>Etat d'une Action <select id='SelAct" + idZ + "' onchange='NewVal(this)'>" + SelectActions + "</select></div>";
        S += "<div class='minmax'><div>Durée : </div><div>H &ge;<input id='H_min_" + idZ + "' type='text' value='" + Hmin + "' onchange='NewVal(this)'>h:mn</div>";
        S += "<div>H &le;<input id='H_max_" + idZ + "' type='text' value='" + Hmax + "' onchange='NewVal(this)'>h:mn</div></div>";
        S += "<div class='minmax'><div>Seuil : </div><div>On à Off si &le;<input id='O_min_" + idZ + "' type='number' value='" + Ooff + "' onchange='NewVal(this)'>%</div>";
        S += "<div>Off à On si &ge;<input id='O_max_" + idZ + "' type='number' value='" + O_on + "' onchange='NewVal(this)'>%</div></div>";
        S += "<div><small>h:mn ou % ou laisser vide</small></div>";
        S += "</div>";


        // Conditions Tarifaires
        if (V.LTARFbin > 0) {
            // Récupère l'état actuel du tarif
            const Tarif_ = F.Actions[iAct].Periodes[i].Tarif;
            const isHPle = (Tarif_ & 1);
            const isHCre = (Tarif_ & 2);
            const isBe = (Tarif_ & 4);
            const isBa = (Tarif_ & 8);
            const isRo = (Tarif_ & 16);

            S += "<div class='bord1px'>";
            S += "<div title='Condition d&apos;activation suivant la tarification. Sinon ordre Off envoyé ou Triac/SSR se ferme.'>Actif si tarif :</div>";
            if (V.LTARFbin <= 3) {
                // HP/HC
                S += "<div id='PleineCreuse'><span style='color:red;'>Heure Pleine</span><input type='checkbox' " + (isHPle ? "checked" : "") + " id='TarifPl_" + idZ + "' onchange='NewVal(this)'> <span style='color:green;'>Heure Creuse</span><input type='checkbox' " + (isHCre ? "checked" : "") + " id='TarifCr_" + idZ + "' onchange='NewVal(this)'></div>";
            } else {
                // Tempo
                S += "<div id='Tempo'>Tempo <span style='color:blue;'>Bleu</span><input type='checkbox' " + (isBe ? "checked" : "") + " id='TarifBe_" + idZ + "' onchange='NewVal(this)'><span style='color:white;'> Blanc</span><input type='checkbox' " + (isBa ? "checked" : "") + " id='TarifBa_" + idZ + "' onchange='NewVal(this)'><span style='color:red;'> Rouge</span><input type='checkbox' " + (isRo ? "checked" : "") + " id='TarifRo_" + idZ + "' onchange='NewVal(this)'></div>";
            }
            S += "</div>";
        }
        S += "</div>"; // Ferme le bloc conditions
        
        S += "</div>"; // Ferme la div container

        GH(idZ, S);
        
        // --- Affectation des valeurs aux sélecteurs (après construction du HTML) ---
        if (capteurT) GID("CanalTemp" + idZ).value = periode.CanalTemp;
        GID("SelAct" + idZ).value = periode.SelAct;
        GID(idZ).style.display = "block";
    }
}

