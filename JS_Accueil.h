//**********************************************
// Page principale  Javascript 
//**********************************************
const char * MainJS1 = R"====(
// NOTA: La variable biSonde est déclarée au chargement du fichier par le serveur pour être dispo immédiatement
let tabPW2sM = [];
let tabPW2sT = [];
let tabActOuvre = [];
let LastPW_M = 0;
let LastPVA_M = 0;
let LastPW_T = 0;
let LastPVA_T = 0;
let LastActOuvre = [];
let PuisMaxS_M = 0;
let PuisMaxI_M = 0;
let PuisMaxS_T = 0;
let PuisMaxI_T = 0;
let initUxIx2 = false;
let TabVal = [];
let TabCoul = [];
let myTimeout;
let myActionTimeout;
let ActionForce = [];
let Pva_valide = false;
let BordsInverse = [".Baccueil"];
let DispAutres = [];


// Fonction pour récupérer les données en temps réel


async function LoadData() {
    const REFRESH_INTERVAL=2000;
    const ERROR_RETRY_INTERVAL=10000;
    
    // Affichage de l'indicateur de chargement
    GID('LED').style.display = 'block';

    try {
        const response = await fetch('/ajax_data');

        // Gérer les erreurs HTTP (e.g., 404, 500)
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        }

        const DuRMS = await response.text();
        
        // --- Traitement des données ---
        const groupes = DuRMS.split(GS);
       
        const G0 = groupes[0].split(RS);
        const G1 = groupes[1].split(RS);
        const G2 = groupes.length > 2 ? groupes[2].split(RS) : []; // Initialisation sûre de G2

        // Affectation des variables principales
        GID('date').innerHTML = G0[1];
        Source_data = G0[2]; 

        // Initialisation des variables de l'interface
        if (!initUxIx2) {
            initUxIx2 = true;
        }

        // --- Affectation des valeurs Maison (G1) ---
        // Utilisation d'un tableau pour réduire la répétition
        const elementsMaison = ['PwS_M', 'PwI_M', 'PVAS_M', 'PVAI_M', 'EAJS_M', 'EAJI_M', 'EAS_M', 'EAI_M'];
        for (let i = 0; i < elementsMaison.length; i++) {
            GID(elementsMaison[i]).innerHTML = LaVal(G1[i]);
        }
        
        
        PuisMaxS_M = Math.max(PuisMaxS_M, G1[0]); 
        PuisMaxI_M = Math.max(PuisMaxI_M, G1[1]); 
        GID('PMS_M').innerHTML = LaVal(PuisMaxS_M);
        GID('PMI_M').innerHTML = LaVal(PuisMaxI_M);

     
        LastPW_M = parseFloat(G1[0]) - parseFloat(G1[1]);
        LastPVA_M = parseFloat(G1[2]) - parseFloat(G1[3]);

        // Logique Tarif
        const Tarif = ["NON_DEFINI", "PLEINE", "CREUSE", "BLEU", "BLANC", "ROUGE"];
        const couleur = ["#666" , "#f00", "#0f0", "#00bfff", "#fff", "#f00"];
        const tarif = ["", "H.<br>pleine", "H.<br>creuse", "Tempo<br>Bleu", "Tempo<br>Blanc", "Tempo<br>Rouge"];
        
        let idx_jour = 0;
        // Détermination du tarif du jour (G0[3])
        for (let i = 0; i < Tarif.length; i++) {
            // Utilisation de .includes() pour plus de clarté
            if (G0[3].includes(Tarif[i])) { 
                idx_jour = i;
                break; // Sortir dès que le tarif est trouvé
            }
        }
        GID('couleurTarif_jour').style.backgroundColor = couleur[idx_jour];
        GID('couleurTarif_jour').innerHTML = tarif[idx_jour];
        
        // Détermination du tarif J+1 (G0[4]) - Tempo
        let tempo = parseInt(G0[4], 16) || 0; 
        tempo = Math.floor(tempo / 4); // La valeur est 1 (Bleu), 2 (Blanc), ou 3 (Rouge)
        
        let idx_j1 = -2; // Correspond à l'index "NON_DEFINI" (-2 + 2 = 0)
        let txtJ = "";
        
        if (tempo > 0 && tempo <= 3) {
            // idx = 1, 2, 3 (Bleu, Blanc, Rouge). Dans le tableau couleur/tarif, ils sont à l'index 3, 4, 5
            idx_j1 = tempo + 2; 
            txtJ = "Tempo<br>J+1";
        } else {
             idx_j1 = 0; // Utiliser la couleur NON_DEFINI si la valeur est inattendue ou 0
        }
        
        GID('couleurTarif_J1').style.backgroundColor = couleur[idx_j1];
        GID('couleurTarif_J1').innerHTML = txtJ;
        
        // Validation du PVA
        Pva_valide = (G0[6] === '1'); // Conversion explicite en chaîne pour la comparaison

        // --- Traitement des données Triac/SSR (G2) ---
        // Vérifie si la bi-sonde est active ET si les données du groupe 2 sont présentes
        if (biSonde && groupes.length >= 3 && F.nomSondeFixe !== "") {
            
            // Utilisation d'un tableau pour réduire la répétition (éléments T)
            const elementsTriac = ['PwS_T', 'PwI_T', 'PVAS_T', 'PVAI_T', 'EAJS_T', 'EAJI_T', 'EAS_T', 'EAI_T'];
            for (let i = 0; i < elementsTriac.length; i++) {
                GID(elementsTriac[i]).innerHTML = LaVal(G2[i]);
            }
            
            // Mise à jour des puissances maximales du Triac
            const PwS_T = parseInt(G2[0], 10) ;
            const PwI_T = parseInt(G2[1], 10) ;
            PuisMaxS_T = Math.max(PuisMaxS_T, PwS_T);
            PuisMaxI_T = Math.max(PuisMaxI_T, PwI_T);
            
            GID('PMS_T').innerHTML = LaVal(PuisMaxS_T);
            GID('PMI_T').innerHTML = LaVal(PuisMaxI_T);

            LastPW_T = parseFloat(G2[0]) - parseFloat(G2[1]);
            LastPVA_T = parseFloat(G2[2]) - parseFloat(G2[3]);
        }

        AdaptationSource();

        // Masquage des éléments PVA si non valides
        if (!Pva_valide) {
            const collection = document.getElementsByClassName('VA');
            for (let i = 0; i < collection.length; i++) {
                collection[i].style.display = "none";
            }
        }
        
        // Masquage de l'indicateur de chargement après succès
        GID('LED').style.display = 'none';
        
        // Planification du prochain appel
        setTimeout(LoadData, REFRESH_INTERVAL); 

    } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        
        // Masquage de l'indicateur de chargement même en cas d'erreur
        GID('LED').style.display = 'none';
        setTimeout(LoadData, ERROR_RETRY_INTERVAL); 
    }
}

// Fonction pour charger l'historique 10 minutes
async function LoadHisto10mn() {
    try {
        const response = await fetch('/ajax_data10mn');

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} lors du chargement 10mn.`);
        }

        const retour = await response.text();
        let groupes = retour.split(GS); 
        
        

        // --- Traitement des Puissances (tabPW2sM) ---
        // Utilisation de let pour la réassignation si nécessaire.
        tabPW2sM = groupes[1].split(',').filter(s => s.length > 0); // Filtre pour retirer la dernière entrée vide

        if (biSonde && groupes.length >= 3) {
            tabPW2sT = groupes[2].split(',').filter(s => s.length > 0);
        }
        
        // --- Traitement des Actionneurs (tabActOuvre) ---
        
        // Utilisation de .slice() pour obtenir le reste des groupes (meilleure lisibilité que les shift() répétés)
        const groupesActionneurs = groupes.slice(3); // Commence à l'index 3 (après Pmax, M, T)

        if (groupesActionneurs.length > 0) { 
            
            for (const groupe of groupesActionneurs) { 
                const Act = groupe.split(ES);
                const i = parseInt(Act[0], 10);
                
                // Assurez-vous que 'i' est un index valide avant d'assigner
                if (!isNaN(i) && i >= 0 && Act[1]) {
                    // Utilisation de filter pour retirer le dernier élément vide
                    tabActOuvre[i] = Act[1].split(RS).filter(s => s.length > 0); 
                }
            }
        }
        
        // Passe à l'étape suivante
        await LoadHisto1an();

    } catch (error) {
        console.error("Erreur LoadHisto10mn:", error);
       
    }
}
// Fonction pour charger l'historique 48 heures (avec rafraîchissement périodique)
async function LoadHisto48h() {
    const REFRESH_INTERVAL_48H = 300000; // 5 minutes

    try {
        const response = await fetch('/ajax_histo48h');

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} lors du chargement 48h.`);
        }

        const retour = await response.text();
        const groupes = retour.split(GS);
        
        if (groupes.length < 1) {
             throw new Error("Format de données 48h invalide.");
        }

        // --- 1. Maxima (Pmaxi) ---
        const Pmaxi = groupes[0].split(RS);
        PuisMaxS_M = parseInt(Pmaxi[0], 10) ;
        PuisMaxI_M = parseInt(Pmaxi[1], 10) ;
        PuisMaxS_T = parseInt(Pmaxi[2], 10) ;
        PuisMaxI_T = parseInt(Pmaxi[3], 10) ;

        // --- 2. Puissance Mobile (Maison) ---
        let tabPWM = groupes[1].split(',').filter(s => s.length > 0);
        
        
        if (Graphes_Select[2]) Plot('SVG_PW48hM', tabPWM, Koul[Coul_W][3], `Puissance Active ${F.nomSondeMobile} sur 48h en W`, '', '');
        
        
        // --- 3. Puissance Fixe (Triac/SSR) ---
        if (biSonde && groupes.length >= 3 && Graphes_Select[3]) {
            let tabPWT = groupes[2].split(',').filter(s => s.length > 0);
            GID('SVG_PW48hT').style.display = "block";
            Plot('SVG_PW48hT', tabPWT, Koul[Coul_W][3], `Puissance Active ${F.nomSondeFixe} sur 48h en W`, '', '');    
        }
        
        // --- 4. Températures ---
        
        // Les groupes 1 et 2 ont été traités. Les températures commencent au groupe[3]
        const lesTempBlock = groupes[3]; 

        if (lesTempBlock) {
            const lesTemp = lesTempBlock.split("|");
            
            for (let c = 0; c < 4; c++) { 
                if (lesTemp[c] && Graphes_Select[4+c]) {
                    // Les données de température peuvent contenir une dernière valeur non significative, la vérification est maintenue
                    const tabTemperature = lesTemp[c].split(',');
                    const lastTemp = parseFloat(tabTemperature[tabTemperature.length - 1], 10);
                    
                    if (lastTemp > -100 && typeof Plot === 'function' && typeof GID === 'function') { 
                        tabTemperature.pop(); // Retirer la dernière valeur non significative
                        GID('SVG_Temp48h' + c).style.display = "block";
                        let nomT=[F.nomTemperature0,F.nomTemperature1,F.nomTemperature2,F.nomTemperature3];                        
                        Plot('SVG_Temp48h' + c, tabTemperature, Koul[Coul_Temp + c][3], `${nomT[c]} sur 48h `, '', '');
                    }
                }
            }
        }
        
        // --- 5. Ouvertures (Actionneurs) ---
        // Les ouvertures sont dans les groupes suivants (commencent à l'index 4 si groupe[3] était les températures)
        const groupesOuvertures = groupes.slice(4); 
        
        if (groupesOuvertures.length > 0 && Graphes_Select[9]) {
            Plot_ouvertures(groupesOuvertures);
        }
        
    } catch (error) {
        console.error("Erreur LoadHisto48h:", error);
    } finally {
        // Le rafraîchissement se fait toutes les 5 minutes, qu'il y ait eu succès ou échec
        setTimeout(LoadHisto48h, REFRESH_INTERVAL_48H); 
    }
}

// Fonction pour charger l'historique 1 an
async function LoadHisto1an() {
    try {
        const response = await fetch('/ajax_histo1an');

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} lors du chargement 1an.`);
        }

        let retour = await response.text();
        retour=JSON.parse(retour);
        const tabJWh = retour.EnergieJour;
        let tabJourWh=[];
        let j=-1;
        let lastDay="";
        for (let i=0;i<tabJWh.length;i++){ //On ne garde que les valeurs de fin de journée
            let ValJour=tabJWh[i].split(",");            
            if (ValJour[0] !=lastDay) { //Nouvelle valeur
                j++;
            }
            lastDay=ValJour[0];
            tabJourWh[j]=ValJour.slice(0,5); //Date + Souti+Inject+Conso+Produit          
        }
        if (Graphes_Select[10]) PlotWhJour(tabJourWh);
        // Passe à l'étape suivante
        await LoadHisto48h();

    } catch (error) {
        console.error("Erreur LoadHisto1an:", error);
    }
}
)====";

// MainJS2: served gzip-compressed (see web_assets/MainJS2.js + tools/build_gzip_assets.py). Content-Encoding: gzip is set in Server.ino.
#include "web_assets/generated/MainJS2_gz.h"

// MainJS3: served gzip-compressed (see web_assets/MainJS3.js + tools/build_gzip_assets.py). Content-Encoding: gzip is set in Server.ino.
#include "web_assets/generated/MainJS3_gz.h"
// icône panneaux solaire et soleil (Merci michy)
const char * Favicon = R"====(
<svg xmlns = "http://www.w3.org/2000/svg" width = "64" height = "64" viewBox = "13 18 46 44" >
<rect width="64" height="64" x="0" y="0"  fill="SpringGreen" />
<path d="m16 36h19l16 20h-20z" fill="#92d3f5"></path>
<circle cx="48" cy="28" fill="#fcea2b" r="8"></circle>
<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
  <path d="m16 36h19l16 20h-20z"></path><path d="m17 43v13h10"></path>
  <path d="m24 46h19"></path><path d="m26 36 16 20"></path>
  <circle cx="48" cy="28" r="8"></circle>
</g>
</svg >
)====";
// icône panneaux solaire et soleil 192pixels
const char * Favicon192 = R"====(
<svg xmlns = "http://www.w3.org/2000/svg" width = "192" height = "192" viewBox = "13 18 46 44" >
<rect width="64" height="64" x="0" y="0"  fill="SpringGreen" />
<path d="m16 36h19l16 20h-20z" fill="#92d3f5"></path>
<circle cx="48" cy="28" fill="#fcea2b" r="8"></circle>
<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
  <path d="m16 36h19l16 20h-20z"></path><path d="m17 43v13h10"></path>
  <path d="m24 46h19"></path><path d="m26 36 16 20"></path>
  <circle cx="48" cy="28" r="8"></circle>
</g>
</svg >
)====";
// Manifest pour Android
const char * Manifest = R"====(
{
  "name": "Routeur F1ATB",
  "short_name": "Routeur",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    {
      "src": "/favicon192.ico",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "/favicon.ico",
      "sizes": "64x64",
      "type": "image/svg+xml"
    }
  ]
}
)====";
