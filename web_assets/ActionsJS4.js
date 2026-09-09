

function Send_Values(){
  
    GID("attente").style.visibility = "visible"; 

    // 1. Mise à jour du modèle  depuis le DOM
    for (let iAct = 0; iAct < F.Actions.length; iAct++) {
        const action = F.Actions[iAct];
        
        // Correction: S'assurer que tous les modes sont couverts (0 à 5)
        for (let i = 0; i <= 5; i++) { 
            const radio = GID(`radio${iAct}-${i}`);
            if (radio && radio.checked) { 
                action.Actif = i; 
            }
        }
        
        // Conversion explicite en entier pour les nombres
        action.Action=iAct; //Pour info numéro Action
        action.Titre = GID("titre" + iAct).innerHTML.trim();
        action.Host = GID("host" + iAct).value.trim();
        action.Port = parseInt(GID("port" + iAct).value, 10) || 0; // Sécurité: valeur par défaut 0
        action.OrdreOn = GID("ordreOn" + iAct).value.trim();
        action.OrdreOff = GID("ordreOff" + iAct).value.trim();
        action.Repet = parseInt(GID("repet" + iAct).value, 10) || 0;
        action.Tempo = parseInt(GID("tempo" + iAct).value, 10) || 0;
        action.ForceOuvre = parseInt(GID("ForceOuvre" + iAct).value, 10) || 100;
        
        // Coefficients PID
        action.Kp = parseInt(GID("sliderKp" + iAct).value, 10) || 0;
        action.Ki = parseInt(GID("sliderKi" + iAct).value, 10) || 0;
        action.Kd = parseInt(GID("sliderKd" + iAct).value, 10) || 0;
        action.PID = GID("PID" + iAct).checked ? 1 : 0;
        
        const selectPin = GID("selectPin" + iAct);
        if (selectPin && selectPin.value >= 0) {
            // Reconstruit OrdreOn pour la sortie GPIO/relais (Pin + Sortie)
            const selectOut = GID("selectOut" + iAct);
            action.OrdreOn = selectPin.value + IS + selectOut.value;
        }

         for (let i = 0; i < action.Periodes.length; i++) {
                const periode = action.Periodes[i];
                
                // Logique spécifique au mode Standard (non Routage)
                if (F.ModePara == 0) { 
                    periode.CanalTemp = -1;
                    periode.SelAct = 255;
                }
                
                
            }
        
        // Logique d'effacement de l'action (iAct > 0)
        if (iAct > 0 && selectPin && (selectPin.value == 0 || action.Titre === "")) { 
            action.Actif = -1; // Marque l'action à effacer 
        }
        action.NbPeriode= action.Periodes.length;
    }
    
    // 2. Effacement des Actions inutilisées
    let j=0 ;
    for (let iAct = 0; iAct < F.Actions.length; iAct++) {
        if (F.Actions[iAct].Actif >= 0) { // N'envoie que les actions valides ou actives
            if(j!=iAct) F.Actions[j]=F.Actions[iAct];
            F.Actions[j].Action=j;
            j++;
        }
    }
    
    F.Actions=F.Actions.slice(0,j);
   
    // 3. Récupération des paramètres globaux
    F.Fpwm = document.querySelector('input[name="Fpwm"]:checked').value;
    F.ReacCACSI = document.querySelector('input[name="ReacCACSI"]:checked').value;
    F.PuissanceMaxSoutirage = parseInt(GID("PuissanceMaxSoutirage").value, 10) || 0;
    F.NbActions=F.Actions.length;
    // 4. Envoi POST
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
function Plot(iAct) {
    for (i = 0; i < F.Actions.length; i++) {
        GID('graphAction' + i).style.display = "none";
    }
    if (PlotIdx != iAct) {
        PlotIdx = iAct;
        GID('graphAction' + iAct).style.display = "block";
        PlotR(iAct);
    } else {
        PlotIdx = -1;
    }


}
function PlotR(iAct) { // Courbes détaillées PID
    if (PlotIdx >= 0) {
        if (!Pause) {
            TabIdx = (TabIdx + 1) % 150;
            Ecart[TabIdx] = parseInt(MesuresPwAct[0]);
            Prop[TabIdx] = parseFloat(MesuresPwAct[1]);
            Integ[TabIdx] = parseFloat(MesuresPwAct[2]);
            Deriv[TabIdx] = parseFloat(MesuresPwAct[3]);
            let retard = Prop[TabIdx] + Integ[TabIdx] + Deriv[TabIdx];
            Retard[TabIdx] = Math.floor(Math.max(Math.min(100, retard), 0));
            Ouvert[TabIdx] = 100 - Retard[TabIdx];
            var cW = "#" + Koul[Coul_W][3];
            var cOuvre = "#" + Koul[Coul_Ouvre][3];
            var cRetard = "#" + Koul[Coul_VA][3];
            var cT = "#" + Koul[Coul_Graphe][1];
            var cP = "#" + Koul[Coul_Temp][3];
            var cI = "#" + Koul[Coul_Temp + 1][3];
            var cD = "#" + Koul[Coul_Temp + 3][3];
            var style = 'background:linear-gradient(#' + Koul[Coul_Graphe][5] + ',#' + Koul[Coul_Graphe][3] + ',#' + Koul[Coul_Graphe][5] + ');border-color:#' + Koul[Coul_Tab][5] + ';';
            var S = "<svg viewbox='0 0 970 240' style='" + style + "' height='240'  >"; //   
            S += "<line x1='50' y1='20' x2='50' y2='220' style='stroke:" + cW + ";stroke-width:2' />";
            S += "<line x1='800' y1='20' x2='800' y2='220' style='stroke:" + cOuvre + ";stroke-width:2' />";
            S += "<line x1='50' y1='220' x2='800' y2='220' style='stroke:" + cT + ";stroke-width:2' />";
            for (var t = 0; t < 75; t = t + 5) {
                let x = 800 - t * 10;
                S += "<text x='" + x + "' y='237' style='font-size:16px;fill:" + cT + ";'>" + t + "</text>";
                S += "<line x1='" + x + "' y1='220' x2='" + x + "' y2='224' style='stroke:" + cT + ";stroke-width:2' />";
            }
            S += "<text x='790' y='218' style='font-size:12px;fill:" + cT + ";'>s</text>";
            S += "<text x='804' y='220' style='font-size:12px;fill:" + cOuvre + ";'>0%</text>";
            S += "<text x='804' y='20' style='font-size:12px;fill:" + cOuvre + ";'>100%</text>";
            S += "<line x1='50' y1='20' x2='800' y2='20' style='stroke:" + cOuvre + ";stroke-width:2' stroke-dasharray='1 4' />";
            S += "<line x1='50' y1='120' x2='800' y2='120' style='stroke:" + cW + ";stroke-width:2' stroke-dasharray='1 4' />";
            S += "<text x='20' y='120' style='font-size:12px;fill:" + cW + ";'>0 W</text>";
            S += "<text x='5' y='20' style='font-size:12px;fill:" + cW + ";'>100 W</text>";
            S += "<text x='1' y='220' style='font-size:12px;fill:" + cW + ";'>-100 W</text>";


            S += "<text x='830' y='40' style='font-size:16px;fill:" + cW + ";'>Ecart..........." + Ecart[TabIdx] + " W</text>";
            S += "<text x='830' y='60' style='font-size:16px;fill:" + cOuvre + ";'>Ouverture....." + Ouvert[TabIdx] + " %</text>";
            S += "<text x='860' y='76' style='font-size:12px;fill:" + cT + ";'>= 100 - Retard</text>";
            S += "<text x='830' y='96' style='font-size:16px;fill:" + cRetard + ";'>Retard........." + Retard[TabIdx] + " %</text>";            
            S += "<text x='830' y='168' style='font-size:16px;fill:" + cI + ";'>Intégral....." + Integ[TabIdx] + "</text>";
            
            if (F.ModePara == 1 && GID("PID" + iAct).checked ){
                S += "<text x='860' y='112' style='font-size:12px;fill:" + cT + ";'>=</text>";
                S += "<text x='830' y='132' style='font-size:16px;fill:" + cP + ";'>Proportion.." + Prop[TabIdx] + "</text>";
                S += "<text x='860' y='148' style='font-size:12px;fill:" + cT + ";'>+</text>";
                S += "<text x='860' y='184' style='font-size:12px;fill:" + cT + ";'>+</text>";
                S += "<text x='830' y='204' style='font-size:16px;fill:" + cD + ";'>Dérivée........" + Deriv[TabIdx] + "</text>";
            }

            let SE = "<polyline points='";
            let SO = "<polyline points='";
            let SR = "<polyline points='";
            let SP = "<polyline points='";
            let SI = "<polyline points='";
            let SD = "<polyline points='";
            for (let i = 0; i < 150; i++) { //toutes les 0.5s
                let j = (TabIdx - i + 150) % 150;
                let x = 800 - i * 5;
                let y = 120 - Ecart[j];
                y = Math.min(y, 220); y = Math.max(y, 20);
                SE += x + "," + y + " ";
                y = 220 - 2 * Ouvert[j];
                SO += x + "," + y + " ";
                y = 220 - 2 * Retard[j];
                SR += x + "," + y + " ";
                y = 120 - Prop[j];
                y = Math.min(y, 220); y = Math.max(y, 20);
                SP += x + "," + y + " ";
                y = 220 - 2 * Integ[j];
                SI += x + "," + y + " ";
                y = 120 - Deriv[j];
                y = Math.min(y, 220); y = Math.max(y, 20);
                SD += x + "," + y + " ";
            }
            SE += "' style='fill:none;stroke:" + cW + ";stroke-width:2' />";
            SO += "' style='fill:none;stroke:" + cOuvre + ";stroke-width:2' />";
            SR += "' style='fill:none;stroke:" + cRetard + ";stroke-width:2' />";
            SP += "' style='fill:none;stroke:" + cP + ";stroke-width:2' />";
            SI += "' style='fill:none;stroke:" + cI + ";stroke-width:2' />";
            SD += "' style='fill:none;stroke:" + cD + ";stroke-width:2' />";
             if (F.ModePara == 1 && GID("PID" + iAct).checked){
                    S += SD  + SP;
             }
            S +=  SI  + SR + SO + SE + "</svg>";
            GID('graphSVG' + iAct).innerHTML = S;

        }
        setTimeout(() => {
            PlotR(iAct);
        }, 500);
    }
}

function ShowAction() {
    
    let Dt = 200; //ms
    if (PlotIdx >= 0) {
        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const retour = this.responseText;
                // Supposons que MesuresPwAct est un tableau global
                MesuresPwAct = retour.split(RS).map(val => isNaN(parseFloat(val)) ? 0 : parseFloat(val)); // Assure la conversion numérique et la sécurité
            }
        };
        xhttp.open('GET', '/ShowAction?NumAction=' + PlotIdx, true);
        xhttp.send();
    } else {
        // Initialisation propre des tableaux si PlotIdx < 0
        MesuresPwAct = [0, 0, 0, 0];
        
        // Initialisation de toutes les valeurs du graphe à zéro
        // (En supposant que Ecart, Ouvert, Retard, Prop, Integ, Deriv sont des tableaux globaux de taille 150)
        const zeros = new Array(150).fill(0);
        Ecart = [...zeros];
        Ouvert = [...zeros];
        Retard = [...zeros];
        Prop = [...zeros];
        Integ = [...zeros];
        Deriv = [...zeros];
        
        Dt = 2000;
    }
    
    setTimeout(() => {
        ShowAction();
    }, Dt);
}

//=============Fin Initialisation  ===============
function SetParaFixe(){
    LoadParaVar();
    Set_Couleurs();
    ShowAction();

    if (F.ReacCACSI < 100) {
        GID("CACSI" + F.ReacCACSI).checked = true; //Reactivité Ki CACSI et non Estimation
        GID("CACSI").style = "display:block;";
    }
    GID("Fpwm" + F.Fpwm).checked = true;
    GID("PuissanceMaxSoutirage").value = F.PuissanceMaxSoutirage || 0;
}


function SetParaVar() {
    SelectActions = "<option value=255>Non exploité</option>";
    for ( let esp = 0; esp < nomRMS.length; esp++) { //Liste des actions par routeur
        for (var iAct = 0; iAct < nomActions[esp].length; iAct++) {
            var v = esp * 10 + parseInt(nomActions[esp][iAct][0]); //Nombre refletant la référence esp et action
            var T = (esp == 0) ? "" : nomRMS[esp] + " / ";
            SelectActions += "<option value=" + v + ">" + T + nomActions[esp][iAct][1] + "</option>";
            ListeActions[v] = T + nomActions[esp][iAct][1];
        }
    }
    TraceActions(false);
}



function AdaptationSource() {

}
