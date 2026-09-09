//****************************************************
// Page HTML et Javascript - Gestion des couleurs    *
//****************************************************
const char *CouleursHtml = R"====(
 <!doctype html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Colors</title>

    <link rel="stylesheet" href="/commun.css">

    <style>
        .Zone {
            width: 100%;
            border: 1px solid grey;
            border-radius: 10px;
            margin-top: 10px;
            background-color: rgba(30,30,30,0.3);
        }
        .boldT {
            text-align: left;
            font-weight: bold;
            padding: 10px;
        }
        .form {
            margin: auto;
            padding: 10px;
            display: table;
            text-align:left;
            width:100%;
        }
        .ligne {
            display: table-row;
            margin-top: 5px;
        }
        .ligneB {
            font-weight: bold;
        }
        .ligne div {
            display: table-cell;
            margin: 5px;
            text-align: left;
            font-size: 20px;
            height: 25px;
        }
        .liste {
            display:flex;
            justify-content:center;
            text-align:left;
        }
        #onglets2 {
            display:block;
        }
        .Bparametres { border: inset 10px azure; }
        .Bcouleurs   { border: inset 4px azure; }
        .les_boutons {
            display:flex;
            justify-content:space-between;
        }
    </style>
</head>

<body onload="Init();">

    <div id="lesOnglets"></div>

    <h2>Choix des couleurs</h2>

    <div class="Zone">
        <div class="form" id="colors"></div>
    </div>

    <br>

    <div class="les_boutons">
        <input class="bouton" type="button" value="Couleurs par défaut"
               onclick="SendValues(false);">

        <input class="bouton" type="button" value="Sauvegarder"
               onclick="SendValues(true);">
    </div>
   <br>
    <script>
        var BordsInverse = [".Bparametres", ".Bcouleurs"];

        function Init() {
            SetHautBas();
            SetCurseurs();
            LoadParaFixe();
            
        }

        function SetCurseurs() {
            let S = "<div class='ligne ligneB'><div>Champ</div><div>Texte</div><div>Fond / Courbe</div><div>Bordure</div></div>";

            for (let i = 0; i < Koul.length; i++) {
                S += "<div class='ligne'>";
                S += "<div>" + Koul[i][0] + "</div>";
                S += "<div><input type='color' id='text_color" + i + "' value='#000000' onchange='readCouleur();'></div>";
                S += "<div><input type='color' id='bg_color" + i + "' value='#000000' onchange='readCouleur();'></div>";
                S += "<div><input type='color' id='bord_color" + i + "' value='#000000' onchange='readCouleur();'></div>";
                S += "</div>";
            }

            GH("colors", S);
        }

        function readCouleur() {
            for (let i = 0; i < Koul.length; i++) {
                if (Koul[i][1]) Koul[i][1] = GID("text_color" + i).value.substring(1);
                if (Koul[i][3]) Koul[i][3] = GID("bg_color" + i).value.substring(1);
                if (Koul[i][5]) Koul[i][5] = GID("bord_color" + i).value.substring(1);
            }
            CoulPage();
            setCouleur();
        }

        function CoulPage() {
            setColorQuery("body", "#" + Koul[0][1]);
            document.body.style.background =
                "linear-gradient(#" + Koul[0][5] + ",#" + Koul[0][3] + ",#" + Koul[0][5] + ")";
        }

        function SendValues(update) {
            let S = "?couleurs=";
            if(update){
              for (let i = 0; i < Koul.length; i++) {
                  if (Koul[i][1]) S += Koul[i][1];
                  if (Koul[i][3]) S += Koul[i][3];
                  if (Koul[i][5]) S += Koul[i][5];
              }
            }
            const xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    location.reload();
                }
            };

            xhttp.open("GET", "/CouleurUpdate" + S, true);
            xhttp.send();
        }

        function SetParaFixe() {
            GID("Bwifi").style.display = (F.ESP32_Type != 10) ? "inline-block" : "none";
            Set_Couleurs();
        }
    </script>

    <br>
    <div id="pied"></div>

    <script src="/ParaCommunJS"></script>
    <script src="/CommunCouleurJS"></script>
   

</body>
</html>

 )====";


// CommunCouleurJS: served gzip-compressed (see web_assets/CommunCouleurJS.js + tools/build_gzip_assets.py). Content-Encoding: gzip is set in Server.ino.
#include "web_assets/generated/CommunCouleurJS_gz.h"