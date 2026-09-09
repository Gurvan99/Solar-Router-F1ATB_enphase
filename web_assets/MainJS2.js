
// Fonction de fin de chargement des paramètres fixes
function SetParaFixe() {
  GH("nomSondeMobile",F.nomSondeMobile);
  Graphes_Nom[0]=F.nomSondeMobile +" / 10 mn";
  Graphes_Nom[2]=F.nomSondeMobile +" / 48 h";
  if (biSonde){
    GH("nomSondeFixe",F.nomSondeFixe); 
    GH("nomSfixePpos",F.nomSfixePpos);
    GH("nomSfixePneg",F.nomSfixePneg);
    Graphes_Nom[1]=F.nomSondeFixe +" / 10 mn";
    Graphes_Nom[3]=F.nomSondeFixe +" / 48 h";
  }
  Graphes_Dispo[4]=F.Source_Temp0!="tempNo";
  Graphes_Dispo[5]=F.Source_Temp1!="tempNo";
  Graphes_Dispo[6]=F.Source_Temp2!="tempNo";
  Graphes_Dispo[7]=F.Source_Temp3!="tempNo";
  Graphes_Nom[4]=F.nomTemperature0;
  Graphes_Nom[5]=F.nomTemperature1;
  Graphes_Nom[6]=F.nomTemperature2;
  Graphes_Nom[7]=F.nomTemperature3;
  GID("B_graph").style.display = "flex";
  GID("date").style.display = "block";
  GID("foot").style.display = "block";
  GID("routeur").style.display = "none";
  LoadParaVar();
}
// Fonction de fin de chargement des paramètres variables
function SetParaVar() {  
  Set_Couleurs();
  setInterval(Refresh_2s, 2000); 
  GID("TabMesures").style.display = "block";
  LoadData();
  LoadHisto10mn();
  EtatActions(0, 0);
  let S = "";
  for (let c = 1; c < V.IP_RMS.length; c++) { 
    S += "<div class='autreRMS'><div>" + V.IP_RMS[c] + "</div><div>" +nomRMS[c] + "</div><div id='autreRid" + c + "' onclick='autreRclick(" + c + ");' style='cursor:pointer;' ></div></div>";
    S += "<div class='autreRif' id='autreRif" + c + "'></div>";
  }
  GH("autresRMS", S);
  
  const IPextDisp = int2ip(F.RMSextIP);
  let IdsxSource = -1;
  
  for (let c = 1; c < V.IP_RMS.length; c++) { 
    if (V.IP_RMS[c] === IPextDisp) IdsxSource = c; 
    autreRaffiche(c);
  }
  
  S = 'Source : ';
  if (F.Source === "Ext") { 
    S += 'ESP distant ' + IPextDisp;
    if (IdsxSource > -1) S += " " + nomRMS[IdsxSource];
    GID("donneeDistante").style.display = "block";
  } else {
    S += 'ESP local';
  }
  GH('source', S);
  
}

// Fonction clic autre routeur
function autreRclick(c) {
  
  
  if (DispAutres[c] == "true") { 
    DispAutres[c] = "false";
  } else {
    DispAutres[c] = "true";
  }
  autreRaffiche(c);
}

// Fonction d'affichage autre routeur
function autreRaffiche(c) {
  let S = "";
  let fleche = "⬆️";
  
  if (DispAutres[c] == "true") { 
    S += "<iframe src='http://" + V.IP_RMS[c] + "' ></iframe>";
  } else {
    fleche = "⬇️";
  }
  GH("autreRif" + c, S);
  GH("autreRid" + c, fleche);
  localStorage.setItem("DispAutres", JSON.stringify(DispAutres));
}

// Fonction de tracé de graphique SVG
var cadrageMax;
function Plot(SVG, Tab, couleur1, titre1, couleur2, titre2) {
  let Vmax = 0;
  const TabY0 = [];
  const TabY1 = [];
  couleur1 = "#" + couleur1;
  couleur2 = "#" + couleur2;
  const dX = 900 / Tab.length;
  const d = new Date();
  let dI = 1;
  let label = 'heure';
  let pixelTic = 72;
  let dTextTic = 4;
  let moduloText = 24;
  const H0 = d.getHours() + d.getMinutes() / 60;
  let H00 = 4 * Math.floor(H0 / 4);
  let X0 = 18 * (H00 - H0);
  let Y0 = 250;
  let X,Y,Y2;
  let Yamp = 230;
 
  let dispVA = false;
  
 
  switch (SVG) {
    case 'SVG_PW48hM':
      break;
    case 'SVG_PW48hT':
      break;
    case 'SVG_Temp48h':
      
      break; 
    case 'SVG_PW2sM':
      label = 'mn';
      pixelTic = 90;
      X0 = 0;
      dTextTic = 1;
      moduloText = -100;
      H00 = 0;
      dI = 2; 
      GID(SVG + '_L').style.color = couleur2; 
      GID(SVG + '_L').style.display = 'block';
      dispVA = GID(SVG + '_C').checked; 
      localStorage.setItem(SVG + '_LS', dispVA);
      break;
    case 'SVG_PW2sT':
      label = 'mn';
      pixelTic = 90;
      X0 = 0;
      dTextTic = 1;
      moduloText = -100;
      H00 = 0;
      dI = 2; 
      GID(SVG + '_L').style.color = couleur2; 
      GID(SVG + '_L').style.display = 'block';
      dispVA = GID(SVG + '_C').checked; 
      localStorage.setItem(SVG + '_LS', dispVA);
      break;
    
  }
  const c1 = '"' + couleur1 + '"';
  const c2 = '"' + couleur2 + '"';
  const cT = "#" + Koul[Coul_Graphe][1];
  const Mois = ['Jan', 'Fev', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Ao&ucirc;t', 'Sept', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < Tab.length; i++) { 
    if (i % 2 === 0 || dI === 1 || dispVA) { 
      // Assurer la conversion en nombre pour la comparaison
      const val = parseFloat(Tab[i]); 
      Tab[i] = Math.min(val, 10000000);
      Tab[i] = Math.max(Tab[i], -10000000);
      Vmax = Math.max(Math.abs(Tab[i]), Vmax);
    }
  }
  
  let S=PlotCommun(SVG,cT,Vmax,label);
  for (let x = 1000 + X0; x > 100; x = x - pixelTic) { 
    X = x;
    Y2 = Y0 + 6;
    S += "<line x1='" + X + "' y1='" + Y0 + "' x2='" + X + "' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:2' />";
    X = X - 8;
    Y2 = Y0 + 22;   
    S += "<text x='" + X + "' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>" + H00 + "</text>";   
    H00 = (H00 - dTextTic + moduloText) % moduloText;
  }
  

  
  if (dI === 2 && Pva_valide && dispVA) { 
    S += "<text x='450' y='40' style='font-size:18px;fill:" + couleur2 + ";'>" + titre2 + "</text>";
    S += "<polyline points='";
    let j = 0;  
    for (let i = 1; i < Tab.length; i = i + dI) { 
      Y = Y0 - Yamp * Tab[i] / cadrageMax;
      X = 100 + dX * i;
      S += X + "," + Y + " ";
      TabY1[j] = parseFloat(Tab[i]);
      j++;
    }
    S += "' style='fill:none;stroke:" + couleur2 + ";stroke-width:2' />";
  }
  
  S += "<text x='450' y='18' style='font-size:18px;fill:" + couleur1 + ";'>" + titre1 + "</text>";
  S += "<polyline points='";
  let j = 0; 
  for (let i = 0; i < Tab.length; i = i + dI) { 
    Y = Y0 - Yamp * Tab[i] / cadrageMax;
    X = 100 + dX * i;
    S += X + "," + Y + " ";
    TabY0[j] = parseFloat(Tab[i]);
    j++;
  }
  S += "' style='fill:none;stroke:" + couleur1 + ";stroke-width:2' />";
  S += "</svg>";
  
  GID(SVG).innerHTML = S;
  TabVal["S_" + SVG] = [TabY0, TabY1];
  TabCoul["S_" + SVG] = [couleur1, couleur2];
}

function PlotWhJour(tabWh){
  if (tabWh.length>0){
    let couleur1="#"+ Koul[Coul_W][3];
    let couleur2="#"+ Koul[Coul_VA][3];
    const cT = "#" + Koul[Coul_Graphe][1];
    let cWh1=  Koul[Coul_Wh][3];
    let cWh2="#" + cWh1.substring(4,6) + cWh1.substring(2,4) + cWh1.substring(0,2) ;//couleur injectée
    cWh1="#" + cWh1;//Couleur soutirée
    let Y0 = 250,Yamp = 230;
    let X,Y;
    let Vmax=1;
    for (let i = 0; i < tabWh.length; i++) { 
      for (let j=1;j<=4;j++) {
        // Assurer la conversion en nombre pour la comparaison
        let val = parseInt(tabWh[i][j]); 
        val = Number.isNaN(val) ? 0 : val;
        if (val>=0){
          Vmax=Math.max(Vmax,val);
        } else {
          Vmax=Math.max(Vmax,-val);
        }
      }
    }

    let S=PlotCommun("SVG_WhJour",cT,Vmax,"Date");
    const dX = 900 / tabWh.length;
    const step=Math.floor(tabWh.length/10);
    const dX2=0.9*dX;
    let Sconso="",Sprod="";
    for (let i = 0; i < tabWh.length; i++) { 
      let  H1=Yamp * tabWh[i][1] / cadrageMax; //Soutire
      Y = Y0 - H1;
      X = 100 + dX * i;
      S +="<rect width='" +dX2 +"' height='"+H1 + "' x='"+ X +"' y='"+Y+"'  fill='"+cWh1+"A0' />";
      let  H2=Yamp * tabWh[i][2] / cadrageMax; //Injecté
      S +="<rect width='" +dX2 +"' height='"+H2 + "' x='"+ X +"' y='"+Y0+"'  fill='"+cWh2+"A0' />";
      if (Sconso!="" || tabWh[i][3] !=0){ //Données seconde sonde
        let Y3=Y0-Yamp * tabWh[i][3] / cadrageMax;
        Sconso += X+"," + Y3+" "; 
      }
      if (Sprod!="" || tabWh[i][4] !=0){ //Données seconde sonde
        let Y4=Y0-Yamp * tabWh[i][4] / cadrageMax;
        Sprod += X+"," + Y4+" "; 
      }
      if (i%step==0){
        let Y5=Y0+50;
        let X2=X+12;
        S += `<text x='${X2}' y='${Y5}'  transform='rotate(-90,${X2},${Y5})' style='font-size:12px;fill:${cT};'>${tabWh[i][0]}</text>`; //La Date
      }
    }
    S += `<text x='110' y='18' style='font-size:18px;fill:${cWh1};'>Energie Soutirée </text>`;
    S += `<text x='550' y='18' style='font-size:18px;fill:${cWh2};'>Energie Injectée</text>`;
    if (Sconso!=""){
      S += `<polyline points='${Sconso}' style='fill:none;stroke:${couleur1};stroke-width:2' />`;    
      S += `<text x='300' y='18' style='font-size:18px;fill:${couleur1};'>${F.nomSondeFixe} / ${F.nomSfixePpos}</text>`;
    }
    if (Sprod!=""){
      S += `<polyline points='${Sprod}' style='fill:none;stroke:${couleur2};stroke-width:2' />`;
      S += `<text x='690' y='18' style='font-size:18px;fill:${couleur2};'>${F.nomSondeFixe} / ${F.nomSfixePneg}</text>`;
    }
    S += "</svg>";
    GID("SVG_WhJour").innerHTML = S;
    let TabWh = tabWh[0].map((_, c) => tabWh.map(ligne => ligne[c])); //Transposition matrice
    TabVal["S_SVG_WhJour"] =TabWh;
    TabCoul["S_SVG_WhJour" ] = [cT,cWh1, cWh2,couleur1, couleur2];
  }
}
// 
function PlotCommun(SVG,cT,Vmax,label){
  let Y0 = 250,Yamp = 230;
  let dy = 2;
  let Y2;
  cadrageMax = 1;
  Vmax=Math.min(Vmax,10000000);
  let cadrage1 = 1000000;
  const cadrage2 = [10, 8, 5, 4, 2, 1];
  
  for (let m = 0; m < 7; m++) { 
    for (let i = 0; i < cadrage2.length; i++) { 
      X = cadrage1 * cadrage2[i];
      if ((Vmax) <= X) cadrageMax = X;
    }
    cadrage1 = cadrage1 / 10;
  }

 
  const style = 'background:linear-gradient( #' + Koul[Coul_Graphe][5] + ',#' + Koul[Coul_Graphe][3] + ',#' + Koul[Coul_Graphe][5] + ');border-color:#' + Koul[Coul_Tab][5] + ';';
  
  let S = "<svg viewbox='0 0 1030 500' style='" + style + "' height='500' width='100%' id='S_" + SVG + "' onmousemove ='DispVal(this,event);' >";
  S += "<line x1='100' y1='20' x2='100' y2='480' style='stroke:" + cT + ";stroke-width:2' />"; //Axe vertical
  S += "<line x1='100' y1='" + Y0 + "' x2='1000' y2='" + Y0 + "' style='stroke:" + cT + ";stroke-width:2' />"; //Axe horizontal

 for (let y = -10; y <= 10; y = y + dy) { // pointillé horizont
    Y2 = Y0 - Yamp * y / 10;
    if (Y2 <= 480) {
      S += "<line x1='100' y1='" + Y2 + "' x2='1000' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:1;stroke-dasharray:2 10;' />";
      Y2 = Y2 + 7;
      let T = cadrageMax * y / 10; T = T.toString(); 
      X = 90 - 9 * T.length;
      S += "<text x='" + X + "' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>" + T + "</text>";
    }
  }
  Y2 = Y0 - 3;
  S += "<text x='980' y='" + Y2 + "' style='font-size:14px;fill:" + cT + ";'>" + label + "</text>";  //Label axe X
  return S;
}
// Fonction d'affichage des valeurs au survol
function DispVal(t, evt) {
  const ClientRect = t.getBoundingClientRect();
  const largeur_svg = ClientRect.right - ClientRect.left - 4; 
  let x = Math.round(evt.clientX - ClientRect.left - 2); 
  x = x * 1030 / largeur_svg;
  const p = Math.floor((x - 100) * TabVal[t.id][0].length / 900);
  
  if (p >= 0 && p < TabVal[t.id][0].length) {
    let S = "";
    for (let j = 0; j < TabVal[t.id].length; j++) { 
      if (TabVal[t.id][j].length > 0) {
        S += "<div style='color:" + TabCoul[t.id][j] + ";'>" + TabVal[t.id][j][p] + "</div>";
      }
    }
    x = evt.pageX;
    GID("info").style.left = x + "px";
    x = ClientRect.top + 10 + window.scrollY;
    GID("info").style.top = x + "px";
    x = evt.pageY - x;
    GID("info_txt").style.top = x + "px";
    x = ClientRect.height - 20;
    GID("info").style.height = x + "px";
    GH("info_txt", S);
    GID("info").style.display = "block";
    
    if (myTimeout !== null) clearTimeout(myTimeout); 
    myTimeout = setTimeout(stopAffiche, 5000); // Référence de fonction
  }
}

// Fonction pour masquer l'affichage
function stopAffiche() {
  GID("info").style.display = "none";
}

// Fonction de tracé des ouvertures
function Plot_ouvertures(Gr) {
  GID("SVG_Ouvertures").style.display = "block";
  const d = new Date();
  const label = 'heure';
  const pixelTic = 72;
  const dTextTic = 4;
  const moduloText = 24;
  const H0 = d.getHours() + d.getMinutes() / 60;
  let H00 = 4 * Math.floor(H0 / 4);
  let X0 = 18 * (H00 - H0);
  const Hmax = 50 + 150 * Gr.length;
  let Y0 = Hmax - 50;
  let X,Y,Y2,Y00;
  const Couls = ["#" + Koul[Coul_Ouvre][3], "#" + Koul[Coul_Ouvre + 1][3], "#" + Koul[Coul_Ouvre + 2][3], "#" + Koul[Coul_Ouvre + 3][3]];
  const LesVals = [];
  const LesCouls = [];
  const cT = "#" + Koul[Coul_Graphe][1];
  const style = 'background:linear-gradient(#' + Koul[Coul_Graphe][5] + ',#' + Koul[Coul_Graphe][3] + ',#' + Koul[Coul_Graphe][5] + ');border-color:#' + Koul[Coul_Tab][5] + ';';
  
  let S = "<svg viewbox='0 0 1030 " + Hmax + "' height='" + Hmax + "' style='" + style + "' width='100%' id='S_Ouvertures' onmousemove ='DispVal(this,event);'>";
  S += "<line x1='100' y1='" + Y0 + "' x2='1000' y2='" + Y0 + "' style='stroke:" + cT + ";stroke-width:2' />";
  
  for (let x = 1000 + X0; x > 100; x = x - pixelTic) { 
     X = x;
     Y2 = Y0 + 6; 
    S += "<line x1='" + X + "' y1='" + Y0 + "' x2='" + X + "' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:2' />";
    X = X - 8;
    Y2 = Y0 + 22;
    S += "<text x='" + X + "' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>" + H00 + "</text>";
    H00 = (H00 - dTextTic + moduloText) % moduloText;
  }
  
  Y2 = Y0 - 3;
  S += "<text x='980' y='" + Y2 + "' style='font-size:14px;fill:" + cT + ";'>" + label + "</text>";
  
  for (let i = 0; i < Gr.length; i++) { 
    const tableau = Gr[i].split(RS);
    Y00 = (i + 1) * 150;
    Y2 = Y00 - 110;
    S += "<text x='450' y='" + Y2 + "' style='font-size:18px;fill:" + Couls[i % 4] + ";'>" + tableau.pop() + "</text>";
    S += "<line x1='100' y1='" + Y00 + "' x2='1000' y2='" + Y00 + "' style='stroke:" + cT + ";stroke-width:1;' />";
    Y2 = Y00 - 100;
    S += "<line x1='100' y1='" + Y2 + "' x2='1000' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:1;stroke-dasharray:5 10;' />";
    Y2 = Y00 + 7;
    S += "<text x='80' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>0</text>";
    Y2 = Y00 - 93;
    S += "<text x='55' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>100%</text>";
    Y2 = Y00 - 100;
    S += "<line x1='100' y1='" + Y00 + "' x2='100' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:1;' />";
    S += "<polyline points='";
    
    for (let j = 0; j < tableau.length; j++) { 
       Y = Y00 - tableau[j];
       X = 100 + 1.5 * j;
      S += X + "," + Y + " ";
    }
    S += "' style='fill:none;stroke:" + Couls[i % 4] + ";stroke-width:2' />";

    LesVals.push(tableau);
    LesCouls.push(Couls[i % 4]);
  }
  S += "</svg>";
  TabVal["S_Ouvertures"] = LesVals;
  TabCoul["S_Ouvertures"] = LesCouls;
  GID("SVG_Ouvertures").innerHTML = S;
}

// Fonction de tracé des ouvertures (2s)
function Plot_ouvertures_2s() {
  const label = 'mn';
  const pixelTic = 90;
  let X0 = 0;
  const dTextTic = 1;
  const moduloText = -100;
  let H00 = 0; 
  const Hmax = 50 + 150 * nomActions[0].length;
  let Y0 = Hmax - 50;
  let X,Y,Y2,Y00;
  const Couls = ["#" + Koul[Coul_Ouvre][3], "#" + Koul[Coul_Ouvre + 1][3], "#" + Koul[Coul_Ouvre + 2][3], "#" + Koul[Coul_Ouvre + 3][3]];
  const LesVals = [];
  const LesCouls = [];
  const cT = "#" + Koul[Coul_Graphe][1];
  const style = 'background:linear-gradient(#' + Koul[Coul_Graphe][5] + ',#' + Koul[Coul_Graphe][3] + ',#' + Koul[Coul_Graphe][5] + ');border-color:#' + Koul[Coul_Tab][5] + ';';
  
  let S = "<svg viewbox='0 0 1030 " + Hmax + "' height='" + Hmax + "' style='" + style + "' width='100%' id='S_Ouvertures_2s' onmousemove ='DispVal(this,event);'>";
  S += "<line x1='100' y1='" + Y0 + "' x2='1000' y2='" + Y0 + "' style='stroke:" + cT + ";stroke-width:2' />";
  
  for (let x = 1000 + X0; x > 100; x = x - pixelTic) { 
    X = x;
    Y2 = Y0 + 6; 
    S += "<line x1='" + X + "' y1='" + Y0 + "' x2='" + X + "' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:2' />";
    X = X - 8;
    Y2 = Y0 + 22;
    S += "<text x='" + X + "' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>" + H00 + "</text>";
    H00 = (H00 - dTextTic + moduloText) % moduloText;
  }
  
  Y2 = Y0 - 3;
  S += "<text x='980' y='" + Y2 + "' style='font-size:14px;fill:" + cT + ";'>" + label + "</text>";
  
  for (let i = 0; i < nomActions[0].length; i++) { 
    GID("SVG_Ouvertures_2s").style.display = "block";
    const idxAction = parseInt(nomActions[0][i][0], 10);
    
    // Vérification de la taille avant d'appeler shift
    if (tabActOuvre[idxAction] && tabActOuvre[idxAction].length > 0) {
        tabActOuvre[idxAction].shift(); 
    } else {
        // Initialiser si nécessaire
        tabActOuvre[idxAction] = []; 
    }
    
    // S'assurer que LastActOuvre[idxAction] existe
    const lastOuvre = LastActOuvre[idxAction] !== undefined ? LastActOuvre[idxAction] : 0;
    tabActOuvre[idxAction].push(lastOuvre);
    
    Y00 = (i + 1) * 150;
    Y2 = Y00 - 110;
    S += "<text x='450' y='" + Y2 + "' style='font-size:18px;fill:" + Couls[i % 4] + ";'>" + nomActions[0][i][1] + "</text>";
    S += "<line x1='100' y1='" + Y00 + "' x2='1000' y2='" + Y00 + "' style='stroke:" + cT + ";stroke-width:1;' />";
    Y2 = Y00 - 100;
    S += "<line x1='100' y1='" + Y2 + "' x2='1000' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:1;stroke-dasharray:5 10;' />";
    Y2 = Y00 + 7;
    S += "<text x='80' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>0</text>";
    Y2 = Y00 - 93;
    S += "<text x='55' y='" + Y2 + "' style='font-size:16px;fill:" + cT + ";'>100%</text>";
    Y2 = Y00 - 100;
    S += "<line x1='100' y1='" + Y00 + "' x2='100' y2='" + Y2 + "' style='stroke:" + cT + ";stroke-width:1;' />";
    
    if (tabActOuvre[idxAction] && tabActOuvre[idxAction].length > 0) {
      S += "<polyline points='";
      for (let j = 0; j < tabActOuvre[idxAction].length; j++) { 
        Y = Y00 - tabActOuvre[idxAction][j];
        X = 100 + 3 * j;
        S += X + "," + Y + " ";
      }
      S += "' style='fill:none;stroke:" + Couls[i % 4] + ";stroke-width:2' />";
      LesVals.push(tabActOuvre[idxAction]);
      LesCouls.push(Couls[i % 4]);
    }
  }
  S += "</svg>";
  TabVal["S_Ouvertures_2s"] = LesVals;
  TabCoul["S_Ouvertures_2s"] = LesCouls;
  GID("SVG_Ouvertures_2s").innerHTML = S;
}



