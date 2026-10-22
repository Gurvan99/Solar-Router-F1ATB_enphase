
// ============================================================================
// Récupération des données principales
// ============================================================================


const REFRESH_INTERVAL = 2000; // 2 secondes

async function LoadData() {
    // Affiche l'indicateur de chargement
      GID("LED").style.display = "block";
    

    try {
        const url = `/ajax_dataRMS?idx=${IdxMessage}`;
        const response = await fetch(url);

        // 1. Gérer les erreurs HTTP (e.g., 404, 500)
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }

        const DuRMS = await response.text();

        // Masque l'indicateur de chargement
        
        GID("LED").style.display = "none";
      

        // --- Début du traitement des données (Logique complexe) ---
        
        // S'assurer que GS et RS sont définis et que DuRMS est une chaîne
        if (typeof GS === 'undefined' || typeof RS === 'undefined') {
             console.error("Variables de séparation (GS, RS) non définies.");
             return; 
        }

        const groupes = DuRMS.split(GS);
        const G0 = groupes[0].split(RS);
        
        // S'assurer que GH est défini
        if (typeof GH !== 'function') {
             console.error("Fonction GH non définie.");
             return; 
        }

        GH('date', G0[0]);
        const Source_data = G0[1];

        // Remplacement des blocs 'if' par un 'switch' pour une meilleure lisibilité
        switch (Source_data) {
            case "NotDef":
                GID('infoNotDef').style.display = "block";
                break;

            case "UxI":
                GID('infoUxI').style.display = "block";
                
                // Assurez-vous que Koul est défini et a la bonne structure
                const colorW = Koul[Coul_W][3];
                const colorVA = Koul[Coul_VA][3];
                const colorGraphe = Koul[Coul_Graphe][1];

                GH('Ueff', `<span style='color:#${colorW};'>_${parseInt(G0[2], 10)}<small> V</small></span>`);
                GH('Ieff', `<span style='color:#${colorVA};'> _${G0[3]}<small> A</small></span>`);
                GH('cosphi', `<span style='color:#${colorGraphe};'> <small>Facteur de puissance : ${G0[4]}</small></span>`);

                // Traitement des données pour le graphique SVG
                const volt = groupes[1].split(RS).map(v => parseFloat(v)); // Conversion en nombres
                const amp = groupes[2].split(RS).map(a => parseFloat(a)); // Conversion en nombres

                // Constantes de style
                const cT = `#${Koul[Coul_Graphe][1]}`;
                const style = `background:linear-gradient(#${Koul[Coul_Graphe][5]},#${Koul[Coul_Graphe][3]},#${Koul[Coul_Graphe][5]});border-color:#${Koul[Coul_Tab][5]};`;
                
                let Vmax = 500;
                let Imax = 500;
                
                // Recherche des valeurs max pour la mise à l'échelle
                for (let i = 0; i < 100; i++) {
                    Vmax = Math.max(Math.abs(volt[i] || 0), Vmax); // Ajout de || 0 pour gérer les valeurs manquantes
                    Imax = Math.max(Math.abs(amp[i] || 0), Imax);   // Ajout de || 0 pour gérer les valeurs manquantes
                }

                // Construction du SVG (Utilisation de template string)
                let S = `<svg height='400' width='1000' style='${style}' >`;
                S += `<line x1='0' y1='400' x2='0' y2='0' style='stroke:${cT};stroke-width:2' />`;
                S += `<line x1='0' y1='197' x2='1000' y2='197' style='stroke:${cT};stroke-width:2' />`;

                // Polyline pour la tension (volt)
                let pointsVolt = '';
                for (let i = 0; i < 100; i++) {
                    // Assurez-vous que volt[i] est un nombre valide
                    const val = volt[i] !== undefined && !isNaN(volt[i]) ? volt[i] : 0; 
                    const Y = 197 - 185 * val / Vmax;
                    const X = 10 * i;
                    pointsVolt += `${X},${Y} `;
                }
                S += `<polyline points='${pointsVolt.trim()}' style='fill:none;stroke:#${Koul[Coul_W][3]};stroke-width:6' />`;

                // Polyline pour le courant (amp)
                let pointsAmp = '';
                for (let i = 0; i < 100; i++) {
                    // Assurez-vous que amp[i] est un nombre valide
                    const val = amp[i] !== undefined && !isNaN(amp[i]) ? amp[i] : 0;
                    const Y = 197 - 185 * val / Imax;
                    const X = 10 * i;
                    pointsAmp += `${X},${Y} `;
                }
                S += `<polyline points='${pointsAmp.trim()}' style='fill:none;stroke:#${Koul[Coul_VA][3]};stroke-width:6' />`;

                S += `</svg>`;
                GH('SVG', S);
                break;

            case "UxIx2":
                GID('infoUxIx2').style.display = "block";
                const G1_UxIx2 = groupes[1].split(RS);
                if (!InitFait) {
                    InitFait = true;
                    if (typeof creerTableauUxIx2 === 'function') creerTableauUxIx2();
                    GH("nomSondeFixe", F.nomSondeFixe);
                    GH("nomSondeMobile", F.nomSondeMobile);
                }
                for (let j = 0; j < M.length; j++) {
                    if (M[j][3] === 'Wh' && typeof LaVal === 'function') {
                        GH(M[j][0], LaVal(G1_UxIx2[j]));
                    } else {
                        GH(M[j][0], G1_UxIx2[j]);
                    }
                }
                break;

            // LIGHT_EXCLUDE_BEGIN
            case "Enphase":
                GID('infoEnphase').style.display = "block";
                const G1_Enphase = groupes[1].split(RS);
                if (!InitFait) {
                    InitFait = true;
                    if (typeof creerTableauEnphase === 'function') creerTableauEnphase();
                    GH("nomSondeMobile", F.nomSondeMobile);
                }
                for (let j = 0; j < E.length; j++) {
                    if (E[j][3] === 'Wh' && typeof LaVal === 'function') {
                        GH(E[j][0], LaVal(G1_Enphase[j]));
                    } else {
                        GH(E[j][0], G1_Enphase[j]);
                    }
                }
                break;
            // LIGHT_EXCLUDE_END

            case "SmartG":
                GID('infoSmartG').style.display="block";
                groupes[1] = groupes[1].replaceAll('"','');
                var G1=groupes[1].split(",");
                let Sg="";              
                for (var i=0;i<G1.length;i++){
                      Sg +=G1[i]+"<br>";
                }
                GH('dataSmartG', Sg);
                break;
            case "HomeW":
                GID('infoHomeW').style.display="block";
                groupes[1] = groupes[1].replaceAll('"','');
                var G1=groupes[1].split(",");
                let Sw="";              
                for (var i=0;i<G1.length;i++){
                      Sw +=G1[i]+"<br>";
                }
                GH('dataHomeW', Sw);
                break;
            // LIGHT_EXCLUDE_BEGIN
            case "ShellyEm":
            case "ShellyPro":
                
                GID('infoShellyEm').style.display="block";
                
                GID('infoShellyEm').style.display="block";
                groupes[1] = groupes[1].replaceAll('"','');
                var G1=groupes[1].split(",");
                let Ss="";              
                for (var i=0;i<G1.length;i++){
                      Ss +=G1[i]+"<br>";
                }
                GH('dataShellyEm', Ss);
                break;
            // LIGHT_EXCLUDE_END

            case "Zendure":
                GID('infoZendure').style.display="block";
                groupes[1] = groupes[1].replaceAll('"','');
                var G1=groupes[1].split(",");
                let Sz="";
                for (var i=0;i<G1.length;i++){
                      Sz +=G1[i]+"<br>";
                }
                GH('dataZendure', Sz);
                break;

            // LIGHT_EXCLUDE_BEGIN
            case "UxIx3":
                GID('infoUxIx3').style.display="block";
                GH('dataUxIx3', groupes[1]);
                break;
            // LIGHT_EXCLUDE_END
            case "Pmqtt":
                GID('infoPmqtt').style.display="block";
                GH('dataPmqtt', groupes[1]);
                break;

            // LIGHT_EXCLUDE_BEGIN
            case "Linky":
                GID('infoLinky').style.display = "block";
                if (!InitFait) {
                    InitFait = true;
                    if (typeof creerTableauLinky === 'function') creerTableauLinky();
                }
                
                // Le message Linky peut être très fragmenté, donc on ajoute le nouveau morceau
                MessageLinky += groupes[1];
                
                // Le séparateur de bloc de message Linky est le caractère STX (ASCII 2)
                const blocs = MessageLinky.split(String.fromCharCode(2));
                const lg = blocs.length;
                
                if (lg > 2) {
                    // Si on a au moins un bloc complet + le début du suivant
                    MessageLinky = String.fromCharCode(2) + blocs[lg - 1]; // Garde le début du dernier bloc pour la prochaine fois
                    const dataBlock = blocs[lg - 2];
                    
                    GH('DataLinky', '<pre>' + dataBlock + '</pre>');
                    
                    // Le séparateur de ligne est LF (ASCII 10)
                    const lignes = dataBlock.split(String.fromCharCode(10)); 
                    
                    for (let i = 0; i < lignes.length; i++) {
                        // Le séparateur de colonne est TAB (ASCII 9)
                        const colonnes = lignes[i].split(String.fromCharCode(9)); 
                        
                        if (colonnes[0] === 'DATE' && typeof LaDate === 'function') {
                            GH('dateLinky', LaDate(colonnes[1]));
                        }
                        
                        // Traitement des données Linky à partir du tableau L
                        for (let j = 0; j < L.length; j++) {
                            if (colonnes[0] === L[j][0]) {
                                // Vérifie si la donnée est affichable (pas masquée OU valeur > 0)
                                const isVisible = !L[j][2] || parseInt(colonnes[1]) > 0;
                                
                                if (isVisible) {
                                    GID('L' + L[j][0]).style.display = "table-row";
                                    
                                    switch (L[j][4]) {
                                        case 0: // Valeur simple (ex: index)
                                            GH(L[j][0], typeof LaVal === 'function' ? LaVal(colonnes[1]) : colonnes[1]);
                                            break;
                                        case 1: // Valeur avec horodatage (ex: PMAX)
                                            GH('h' + L[j][0], typeof LaDate === 'function' ? LaDate(colonnes[1]) : colonnes[1]);
                                            GH(L[j][0], typeof LaVal === 'function' ? LaVal(colonnes[2]) : colonnes[2]);
                                            break;
                                        case 2: // Texte
                                            GH('h' + L[j][0], colonnes[1]);
                                            break;
                                    }
                                }
                                break; // Sortir de la boucle L.length
                            }
                        }
                    }
                    GID('LED').style.display = 'none'; // Re-masquer l'indicateur après traitement Linky
                }
                
                // Mettre à jour l'index de message pour la prochaine requête
                IdxMessage = groupes[2];
                break;
            // LIGHT_EXCLUDE_END
                
            default:
                // Si la Source_data est inconnue, ne rien faire
                console.log(`Source de données inconnue : ${Source_data}`);
                break;
        }

    } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      
        GID("LED").style.display = "none";
        
    } finally {
        // Planifier le prochain appel après un délai, qu'il y ait eu succès ou échec
        setTimeout(() => LoadData(), REFRESH_INTERVAL);
    }
}
      
      function LaDate(d){
          return d.substr(0,1)+' '+d.substr(5,2)+'/'+d.substr(3,2)+'/'+d.substr(1,2)+' '+d.substr(7,2)+'h '+d.substr(9,2)+'mn '+d.substr(11,2)+'s';
      }
      
      function AdaptationSource(){
        if(F.Source=="Ext"){
          GID("donneeDistante").style.display="block";
        }
        
      }
