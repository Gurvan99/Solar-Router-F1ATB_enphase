
 let Koul = []; // Couleurs courantes
let Coul_Page, Coul_Bout, Coul_W, Coul_VA, Coul_Wh, Coul_Tab, Coul_Graphe, Coul_Temp, Coul_Ouvre;

//------------------------------------------------------
// Etabli les couleurs 
//------------------------------------------------------
function Set_Couleurs() {
 
      let Retour = F.Couleurs; 

      if (Retour !== "") {
        let L = Retour.length;
        let j = 0;

        for (let i = 0; i < Koul.length; i++) {
          if (Koul[i][1] && j + 6 <= L) { Koul[i][1] = Retour.substring(j, j + 6); j += 6; }
          if (Koul[i][3] && j + 6 <= L) { Koul[i][3] = Retour.substring(j, j + 6); j += 6; }
          if (Koul[i][5] && j + 6 <= L) { Koul[i][5] = Retour.substring(j, j + 6); j += 6; }
        }
      }
      setCouleur();
  
}

//------------------------------------------------------
// Applique les couleurs partout dans la page
//------------------------------------------------------
function setCouleur() {

  for (let i = 0; i < Koul.length; i++) {

    // --- TEXTE ---
    if (Koul[i][1]) {
      let tc = GID("text_color" + i);
      if (tc) tc.value = "#" + Koul[i][1];

      if (Koul[i][2]) {
        for (let j = 0; j < Koul[i][2].length; j++) {
          setColorQuery(Koul[i][2][j], "#" + Koul[i][1]);
        }
      }
    } else {
      if (GID("text_color" + i))
        GID("text_color" + i).style.display = "none";
    }

    // --- FOND ---
    if (Koul[i][3]) {
      let bg = GID("bg_color" + i);
      if (bg) bg.value = "#" + Koul[i][3];

      if (Koul[i][4]) {
        for (let j = 0; j < Koul[i][4].length; j++) {
          setBgColorQuery(Koul[i][4][j], "#" + Koul[i][3]);
        }
      }
    } else {
      if (GID("bg_color" + i))
        GID("bg_color" + i).style.display = "none";
    }

    // --- BORDURE ---
    if (Koul[i][5]) {
      let bd = GID("bord_color" + i);
      if (bd) bd.value = "#" + Koul[i][5];

      if (Koul[i][6]) {
        for (let j = 0; j < Koul[i][6].length; j++) {
          setBoColorQuery(Koul[i][6][j], "#" + Koul[i][5]);
        }
      }
    } else {
      if (GID("bord_color" + i))
        GID("bord_color" + i).style.display = "none";
    }
  }

  //------------------------------------------------------
  // Inversion bordures (éclaircir)
  //------------------------------------------------------
  for (let i = 0; i < BordsInverse.length; i++) {
    let liste = document.querySelectorAll(BordsInverse[i]);

    for (let j = 0; j < liste.length; j++) {
      let rgb = liste[j].style.borderColor;

      if (!rgb || rgb.indexOf("(") < 0) continue;

      rgb = rgb.substring(rgb.indexOf("(") + 1, rgb.indexOf(")"));
      let tmp = rgb.split(",");

      if (tmp.length < 3) continue;

      let hexColor = "#";
      for (let k = 0; k < 3; k++) {
        let c = Math.min(255, Math.floor(tmp[k] * 1.8));
        let H = ("00" + c.toString(16)).slice(-2);
        hexColor += H;
      }
      liste[j].style.borderColor = hexColor;
    }
  }
}

//------------------------------------------------------
function setColorQuery(S, C) {
  document.querySelectorAll(S).forEach(e => e.style.color = C);
}

function setBgColorQuery(S, C) {
  document.querySelectorAll(S).forEach(e => e.style.background = C);
}

function setBoColorQuery(S, C) {
  document.querySelectorAll(S).forEach(e => e.style.borderColor = C);
}

//------------------------------------------------------
// Valeurs par défaut 
//------------------------------------------------------
function CouleurDefaut(){  
    let Coul=[];
    //Format: nom,CoulTexte,QueryTexte,CoulFond,QueryFond,CoulBorder,QueryBorder
    Coul_Page = Coul.length;
    Coul.push(["Page","*",,"*",,"*",]);
    Coul_Bout = Coul.length;
    Coul.push(["Boutons haut des pages","*",["a:visited","a:link"],"*",[".Bonglet",".Bonglet2"],"*",[".Bonglet",".Bonglet2"]]);
    Coul.push(["Champs de saisie","*",["input","select"],"*",["input","select"],"*",["input","select"]]);
    Coul_Tab = Coul.length;
    Coul.push(["Tableaux","*",[".tableau",".grid-container1",".grid-container2",".grid-container2M"],"*",[".tableau"],"*",[".tableau"]]);
    Coul_W = Coul.length;
    Coul.push(["Puissance Active en W",,,"*",[".W"],,]);
    Coul_VA = Coul.length;
    Coul.push(["Puissance Apparente en VA",,,"*",[".VA"],,]);
    Coul_Wh = Coul.length;
    Coul.push(["Energie Active en Wh",,,"*",[".Wh"],,]);
    Coul.push(["Volt V",,,"*",[".V"],,]);
    Coul.push(["Ampère A",,,"*",[".A"],,]);
    Coul.push(["Cosinus Phi",,,"*",[".phi"],,]);
    Coul.push(["Hertz et divers",,,"*",[".Hz",".Enph"],,]);
    Coul_Graphe = Coul.length;
    Coul.push(["Graphes","*",,"*",,"*",]);
    Coul_Temp = Coul.length;
    Coul.push(["Temperature Canal 0",,,"*",,,]);
    Coul.push(["Temperature Canal 1",,,"*",,,]);
    Coul.push(["Temperature Canal 2",,,"*",,,]);
    Coul.push(["Temperature Canal 3",,,"*",,,]);
    Coul_Ouvre = Coul.length; 
    Coul.push(["Ouverture SSR/Triac 0",,,"*",,,]);
    Coul.push(["Ouverture SSR/Triac 1",,,"*",,,]);
    Coul.push(["Ouverture SSR/Triac 2",,,"*",,,]);
    Coul.push(["Ouverture SSR/Triac 3",,,"*",,,]);
    Koul=Coul.slice(); //copie de travail
  }
CouleurDefaut();  // initialisation couleurs courantes

 