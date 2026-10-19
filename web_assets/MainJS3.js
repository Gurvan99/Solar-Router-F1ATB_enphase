



const REFRESH_INTERVAL_ACTIONS = 3500; // 3.5 secondes


async function EtatActions(Force, NumAction) {
    
    // 1. Annuler le timeout précédent pour éviter les appels doubles
    if (myActionTimeout !== null) {
        clearTimeout(myActionTimeout);
        myActionTimeout = null; // Réinitialiser le timeout
    }

    try {
        const url = `/ajax_etatActions?Force=${Force}&NumAction=${NumAction}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} lors du chargement des actions.`);
        }

        const retour = await response.text();
        
        if (typeof GS === 'undefined' || typeof RS === 'undefined') {
             throw new Error("Séparateurs GS ou RS non définis.");
        }
        
        const message = retour.split(GS);
        const LesTemp = message[0].split("|");
        Source_data = message[1]; 

        // --- 2. Traitement des Températures ---
        let T_html = "";
        for (let c = 0; c < Math.min(4, LesTemp.length); c++) { 
            const tempValue = parseFloat(LesTemp[c]);

            if (tempValue > -100) {
                const Temper = tempValue.toFixed(1);
                const nom=F[`nomTemperature${c}`];
                T_html += `<div class='item_temp_nom ce'>${nom}</div><div class='item_temp_val ce'>${Temper}°C</div>`;
            }
        }
        
        // --- 3. Traitement des Actions et Forçage ---
        let S_html = "";
        const nombreActions = parseInt(message[3], 10) || 0; // Ajout d'une valeur par défaut
        
        if (nombreActions > 0) {
            
            // Réinitialisation du tableau ActionForce
            ActionForce.length = 0; 
            
            for (let i = 0; i < nombreActions; i++) { 
                // data est à partir de message[i + 4]
                const data = message[i + 4].split(RS); 
                
                if (data.length < 8) continue; // Sauter les lignes mal formatées

                // Stockage du forçage actuel
                ActionForce[i] = data[3];
                let ouvre = 0;
                
                S_html += `<div class='item_val ce'>${data[1]}</div>`; // Nom de l'action

                // Logique d'ouverture (On/Off vs Pourcentage)
                if (data[2] === "On" || data[2] === "Off") { 
                    S_html += `<div class='item_val ce'>${data[2]}</div>`;
                    if (data[2] === "On") ouvre = 100;
                } else {
                    // Calcul de la jauge pour l'ouverture en pourcentage
                    const pourcentage = parseFloat(data[2]);
                    const W = 1 + 1.99 * pourcentage;
                    
                    S_html += `<div class='item_val ce'>
                        <div class='jaugeBack item_val'>
                            <div class='jauge' style='width:${W}px'></div>
                            <div class='ce w100'>${data[2]}%</div>
                        </div>
                    </div>`;
                    ouvre = parseInt(data[2], 10);
                }
                
                // Stockage de l'ouverture (LastActOuvre doit être un tableau global)
                LastActOuvre[parseInt(data[0], 10)] = ouvre; 
                S_html += `<div class='ce item_val'>
                    <div>Routage : ${Hdeci2Hmn(data[4])} · ${data[5]} Wh</div>
                    <div>Forcé : ${Hdeci2Hmn(data[6])} · ${data[7]} Wh</div>
                </div>`;
               

                // Logique des boutons de Forçage
                const forceValue = parseInt(ActionForce[i], 10) || 0;
                const stOn = (forceValue > 0) ? "style='background-color:#f66;'" : "";
                const stOff = (forceValue < 0) ? "style='background-color:#f66;'" : "";
                const minText = (forceValue === 0) ? "&nbsp;&nbsp;" : `${Math.abs(forceValue)} min`;
                
                S_html += `
                    <div class='item_F ce'><input type='button' onclick='EtatActions(1, ${data[0]});' value='On' ${stOn}></div>
                    <div class='item_F ce'><small>${minText}</small></div>
                    <div class='item_F ce'><input type='button' onclick='EtatActions(-1, ${data[0]});' value='Off' ${stOff}></div>
                `;
            }
        }
        
        // --- 4. Affichage Final ---
        S_html = S_html + T_html;
        
        if (S_html !== "") { 
            const header = "<div class='item_Act ce'>Etat Action(s)</div><div class='item_H ce'>Ouverture équivalente<div class='fsize10'>Temps · énergie</div></div><div class='item_Force ce'> Forçage</div>";
                GH("etatActions", header + S_html);
                setBoColorQuery("th", "#" + Koul[Coul_Tab][5]); 
                setBoColorQuery("td", "#" + Koul[Coul_Tab][5]);
                GID("etatActions").style.display = "grid";
          
        }

    } catch (error) {
        console.error("Erreur EtatActions:", error);
    } finally {
        // 5. Planification du prochain appel (polling)
        myActionTimeout = setTimeout(() => { EtatActions(0, 0); }, REFRESH_INTERVAL_ACTIONS); 
    }
}

// Fonction de rafraîchissement 2 secondes
function Refresh_2s() {
  if (tabPW2sM.length > 0) {
    tabPW2sM.shift(); 
    tabPW2sM.shift(); 
    tabPW2sM.push(LastPW_M);
    tabPW2sM.push(LastPVA_M);
    
    // Ajout d'une vérification pour biSonde avant de manipuler tabPW2sT
    if (biSonde) {
        tabPW2sT.shift(); 
        tabPW2sT.shift(); 
        tabPW2sT.push(LastPW_T);
        tabPW2sT.push(LastPVA_T);
    }
    
    GH("nomSondeMobile", F.nomSondeMobile);
    if (biSonde) GH("nomSondeFixe", F.nomSondeFixe)
    
    let Nom_simul = F.nomSondeMobile; 
    if (Source_data === "NotDef") Nom_simul = "(Puissance simulée. Source inconnue)"; 
    
    if (Graphes_Select[0]) Plot('SVG_PW2sM', tabPW2sM, Koul[Coul_W][3], 'Puissance Active ' + Nom_simul + ' sur 10 mn en W', Koul[Coul_VA][3], 'Puissance Apparente sur 10 mn en VA');
    
    if (biSonde && Graphes_Select[1]) {
      if (Source_data !== "NotDef") Nom_simul = GID("nomSondeFixe").innerHTML; 
      GID('SVG_PW2sT').style.display = "block";
      Plot('SVG_PW2sT', tabPW2sT, Koul[Coul_W][3], 'Puissance Active ' + Nom_simul + ' sur 10 mn en W', Koul[Coul_VA][3], 'Puissance Apparente sur 10 mn en VA');
    }
    
    if (tabActOuvre.length > 0 && Graphes_Select[8]) Plot_ouvertures_2s();
  }
}



// Fonction pour forcer une action
function Force(NumAction, Force) {
  if (myActionTimeout !== null) clearTimeout(myActionTimeout); 
  EtatActions(Force, NumAction);
}

// Fonction d'adaptation de l'affichage en fonction de la source
function AdaptationSource() {
  let col4="auto";
  let col5="auto";
  if (biSonde) {
    if ( F.nomSfixePpos=="") { 
      GID('nomSfixePpos').innerHTML = '';
      GID('nomSfixePpos').style.padding = '0px';
      GID('PwS_T').innerHTML = '';
      GID('PVAS_T').innerHTML = '';
      GID('EAJS_T').innerHTML = '';
      GID('EAS_T').innerHTML = '';
      GID('PMS_T').innerHTML = '';
      col4="0px";  
    }
    if ( F.nomSfixePneg=="") { 
      GID('nomSfixePneg').innerHTML = '';
      GID('nomSfixePneg').style.padding = '0px';
      GID('PwI_T').innerHTML = '';
      GID('PVAI_T').innerHTML = '';
      GID('EAJI_T').innerHTML = '';
      GID('EAI_T').innerHTML = '';
      GID('PMI_T').innerHTML = '';
      col5="0px";  
    }

    const collection = document.getElementsByClassName('grid-container2M');
    for (let i = 0; i < collection.length; i++) { 
      collection[i].style.gridTemplateColumns = "auto auto auto "+col4 +" " + col5 +" auto";
    }
  }
}


// Fonction d'initialisation
var Graphes_Nom=["Pw / 10 mn","Pw T","Pw / 48h","Pw 48h T","Temperature 0","Temperature 1","Temperature 2","Temperature 3","Ouvertures / 10mn","Ouvertures / 48h","Wh Jour"];
var Graphes_Dispo=[true,true,true,true,true,true,true,true,true,true,true]; //Il y a des données
var Graphes_Select=[true,true,true,true,true,true,true,true,true,true,true]; //Affichage choisi par la personne
var Graphes_Ordre=[0,1,2,3,4,5,6,7,8,9,10]; //11 graphiques différents
function Init() {
  SetHautBas();
  
  let VA_M = "true";
  let VA_T = "true";
  
  for (let i = 0; i < 8; i++) { 
    DispAutres[i] = "false"; // Initialiser avec 'false' string pour correspondre à localStorage
  }
  if (localStorage.getItem("DispAutres") !== null) DispAutres= JSON.parse(localStorage.getItem("DispAutres"));
  
  if (localStorage.getItem("SVG_PW2sM_LS") !== null) { 
    VA_M = localStorage.getItem("SVG_PW2sM_LS");
    VA_T = localStorage.getItem("SVG_PW2sT_LS"); 
  }
  
  
  let Graphes=[
            `<p id="SVG_PW2sM"></p>
            <div class="choixG">
              <div class="choix" id="SVG_PW2sM_L">
                <label for="SVG_PW2sM_C">VA</label>
                <input type="checkbox" id="SVG_PW2sM_C">
              </div>
            </div>`,

            `<p id="SVG_PW2sT"></p>
            <div class="choixG">
              <div class="choix" id="SVG_PW2sT_L">
                <label for="SVG_PW2sT_C">VA</label>
                <input type="checkbox" id="SVG_PW2sT_C">
              </div>
            </div>`,

            `<p id="SVG_PW48hM"></p>`,
            `<p id="SVG_PW48hT"></p>`,

            `<p class="SVG_Temp48h" id="SVG_Temp48h0"></p>`,
            `<p class="SVG_Temp48h" id="SVG_Temp48h1"></p>`,
            `<p class="SVG_Temp48h" id="SVG_Temp48h2"></p>`,
            `<p class="SVG_Temp48h" id="SVG_Temp48h3"></p>`,

            `<p id="SVG_Ouvertures_2s"></p>`,
            `<p id="SVG_Ouvertures"></p>`,
            `<p id="SVG_WhJour"></p>`     
  ];
  
  
  let Ordre_g= JSON.parse(localStorage.getItem("TableauGraphiques"));
  if (Ordre_g!=null) {
      Graphes_Ordre=Ordre_g;
      if(Graphes_Ordre.length>11) Graphes_Ordre.pop(); //Retrait SVG_Wh1an
  }
  let Ordre_gS= JSON.parse(localStorage.getItem("TableauGraphiquesSelected"));
  if (Ordre_gS!=null) {
      Graphes_Select= Ordre_gS;
      if(Graphes_Select.length>11) Graphes_Select.pop(); //Retrait SVG_Wh1an
  }
  let G="";
  for (let i=0;i<Graphes_Ordre.length;i++){
    G +=Graphes[Graphes_Ordre[i]]; //Zones positionnes pour chaque Graphe
  }
  GH("LesGraphes",G);
  Graphes_Dispo[1]=biSonde;
  Graphes_Dispo[3]=biSonde;
  
  let S = ''; 
  if (biSonde) {
    S = '<div class="grid-container2M">';
    S += '<div class="item1 ce" id="nomSondeMobile">Maison</div>';
    S += '<div class="item2 ce" id="nomSondeFixe">Triac/SSR</div>';
    S += '<div class="item3 ce" id="couleurTarif_jour">Tarif</div>';

    S += '<div class="item4 ce">Soutirée</div>';
    S += '<div class="item5 ce">Injectée</div>';
    S += '<div class="item6 ce" id="nomSfixePpos">Conso.</div>';
    S += '<div class="item7 ce" id="nomSfixePneg">Produite</div>';
    S += '<div id="couleurTarif_J1" class="item14 ce">Tarif J1</div>';

    S += '<div class="item8 W">Puissance Active <small>(Pw)</small></div>';
    S += '<div class="item9 W" id="PwS_M"></div>';
    S += '<div class="item10 W" id="PwI_M"></div>';
    S += '<div class="item11 W" id="PwS_T"></div>';
    S += '<div class="item12 W" id="PwI_T"></div>';
    S += '<div class="item13 W">W</div>';

    S += '<div class="VA le">Puissance Apparente</div>';
    S += '<div class="VA" id="PVAS_M"></div>';
    S += '<div class="VA" id="PVAI_M"></div>';
    S += '<div class="VA" id="PVAS_T"></div>';
    S += '<div class="VA" id="PVAI_T"></div>';
    S += '<div class="VA">VA</div>';

    S += '<div class="W le">Puissance Active Max du jour</div>';
    S += '<div class="W" id="PMS_M"></div>';
    S += '<div class="W" id="PMI_M"></div>';
    S += '<div class="W" id="PMS_T"></div>';
    S += '<div class="W" id="PMI_T"></div>';
    S += '<div class="W">W</div>';

    S += '<div class="Wh le">Energie Active du jour</div>';
    S += '<div class="Wh" id="EAJS_M"></div>';
    S += '<div class="Wh" id="EAJI_M"></div>';
    S += '<div class="Wh" id="EAJS_T"></div>';
    S += '<div class="Wh" id="EAJI_T"></div>';
    S += '<div class="Wh">Wh</div>';

    S += '<div class="Wh le">Energie Active Totale</div>';
    S += '<div class="Wh" id="EAS_M"></div>';
    S += '<div class="Wh" id="EAI_M"></div>';
    S += '<div class="Wh" id="EAS_T"></div>';
    S += '<div class="Wh" id="EAI_T"></div>';
    S += '<div class="Wh">Wh</div>';
    S += '</div>';

  } else {
    S = '<div class="grid-container1">';
    S += '<div class="item1 ce" id="nomSondeMobile">Maison</div>';
    S += '<div class="item31 ce" id="couleurTarif_jour">Tarif</div>';

    S += '<div class="item4 ce">Soutirée</div>';
    S += '<div class="item5 ce">Injectée</div>';
    S += '<div id="couleurTarif_J1" class="item14 ce">Tarif J1</div>';

    S += '<div class="item8 W">Puissance Active <small>(Pw)</small></div>';
    S += '<div class="item9 W" id="PwS_M"></div>';
    S += '<div class="item10 W" id="PwI_M"></div>';
    S += '<div class="item13 W">W</div>';

    S += '<div class="VA le">Puissance Apparente</div>';
    S += '<div class="VA" id="PVAS_M"></div>';
    S += '<div class="VA" id="PVAI_M"></div>';
    S += '<div class="VA">VA</div>';

    S += '<div class="W le">Puissance Active Max du jour</div>';
    S += '<div class="W" id="PMS_M"></div>';
    S += '<div class="W" id="PMI_M"></div>';
    S += '<div class="W">W</div>';

    S += '<div class="Wh le">Energie Active du jour</div>';
    S += '<div class="Wh" id="EAJS_M"></div>';
    S += '<div class="Wh" id="EAJI_M"></div>';
    S += '<div class="Wh">Wh</div>';

    S += '<div class="Wh le">Energie Active Totale</div>';
    S += '<div class="Wh" id="EAS_M"></div>';
    S += '<div class="Wh" id="EAI_M"></div>';
    S += '<div class="Wh">Wh</div>';
    S += '</div>';
  }
  
  GH("TabMesures", S);
  LoadParaFixe();
  

  GID("SVG_PW2sM_C").checked = (VA_M === "true") ? true : false;
  GID("SVG_PW2sT_C").checked = (VA_T === "true") ? true : false;
  
  
}

function ListeGraph(){
  let Gnom=`<div>Choix des graphiques</div><div id="B_Graph_in">`;
  for (let i=0;i<Graphes_Ordre.length;i++){
    let Ord=Graphes_Ordre[i];
    if (Graphes_Dispo[Ord]){
      let chk="";
      if (Graphes_Select[Ord]) chk="checked";   
        Gnom +=`<input type='checkbox' onchange="Gr_Select();" id="GraphCheck${Ord}" ${chk}><div>${Graphes_Nom[Ord]}</div><div onclick="decalG(${i},-1);">⬆️</div><div onclick="decalG(${i},1);">⬇️</div>`;
    }
  } 
  Gnom +=`</div><input type="button" value="Valider" onclick="Gr_Select();location.reload();" >`;
  GH("B_Graph",Gnom);
  GID("B_Graph").style= 'background:linear-gradient( #' + Koul[Coul_Graphe][5] + ',#' + Koul[Coul_Graphe][3] + ',#' + Koul[Coul_Graphe][5] + ');';
  GID("B_Graph").style.display="block";
}
function decalG(i,s){
  let j=parseInt(i);
  let Modulo = Graphes_Ordre.length;
  let dispo=false;
  while (!dispo){
      if (s<0) {
        j--;
      } else {
        j++;
      }
      j=(j+Modulo)%Modulo;
      dispo=Graphes_Dispo[j];
  }
  let k=Graphes_Ordre[i];
  Graphes_Ordre[i]=Graphes_Ordre[j];
  Graphes_Ordre[j]=k;
  localStorage.setItem("TableauGraphiques", JSON.stringify(Graphes_Ordre));
  Gr_Select();
  ListeGraph();
}
function Gr_Select(){
  for (let i=0;i<Graphes_Ordre.length;i++){
    let Ord=Graphes_Ordre[i];
    if (Graphes_Dispo[Ord]){      
      Graphes_Select[Ord]= GID("GraphCheck" + Ord).checked ? true : false;
    }
  }
  localStorage.setItem("TableauGraphiquesSelected",JSON.stringify(Graphes_Select));
}
