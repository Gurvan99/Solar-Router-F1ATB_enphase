// Page de configuration de l'envoi vers PureControl
const char *PureControlHtml = R"====(
<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="commun.css">
  <title>PureControl</title>
  <style>
    .pc-zone { max-width: 760px; margin: 16px auto; padding: 14px; border: 1px solid grey; border-radius: 10px; }
    .pc-ligne { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 12px 0; }
    .pc-ligne label { flex: 1 1 260px; }
    .pc-ligne input, .pc-ligne select { flex: 1 1 180px; min-height: 32px; font-size: 16px; }
    .pc-action { text-align: center; margin: 18px; }
    #pcStatus { text-align: center; min-height: 24px; }
  </style>
  <script src="/ParaCommunJS" defer></script>
</head>
<body onload="SetHautBas(); ChargerPureControl();">
  <div id="lesOnglets"></div>
  <h2>Envoi des températures vers PureControl</h2>
  <div class="pc-zone">
    <div class="pc-ligne">
      <label for="pcToken">API token (32 caractères) :</label>
      <input id="pcToken" type="password" maxlength="32" autocomplete="new-password">
    </div>
    <div class="pc-ligne">
      <label for="pcPeriode">Période d'envoi (minutes, 0 = désactivé) :</label>
      <input id="pcPeriode" type="number" min="0" max="1440" step="1" value="1">
    </div>
  </div>
  <div class="pc-zone">
    <strong>Valeurs à envoyer</strong>
    <p>Associez chaque ID PureControl à un canal de température du routeur. Les deux premiers éléments sont préconfigurés sur les canaux 0 et 1.</p>
    <div id="pcElements"></div>
  </div>
  <div class="pc-action">
    <button class="bouton" type="button" onclick="EnregistrerPureControl()">Sauvegarder</button>
  </div>
  <div id="pcStatus" role="status"></div>
  <div id="pied"></div>
  <script>
    const PC_NB_ELEMENTS = 4;

    function AfficherEtatPureControl(message, erreur) {
      const statut = document.getElementById("pcStatus");
      statut.textContent = message;
      statut.style.color = erreur ? "red" : "inherit";
    }

    function CreerElementsPureControl(nomsCanaux, elements) {
      const conteneur = document.getElementById("pcElements");
      conteneur.textContent = "";
      for (let i = 0; i < PC_NB_ELEMENTS; i++) {
        const element = elements[i] || { canal: i < 2 ? i : -1, id: "" };
        const ligne = document.createElement("div");
        ligne.className = "pc-ligne";

        const labelCanal = document.createElement("label");
        labelCanal.textContent = "Élément " + (i + 1) + " — canal température :";
        const select = document.createElement("select");
        select.id = "pcCanal" + i;
        const aucun = document.createElement("option");
        aucun.value = "-1";
        aucun.textContent = "Non utilisé";
        select.appendChild(aucun);
        for (let canal = 0; canal < 4; canal++) {
          const option = document.createElement("option");
          option.value = String(canal);
          option.textContent = "Canal " + canal + (nomsCanaux[canal] ? " — " + nomsCanaux[canal] : "");
          select.appendChild(option);
        }
        select.value = String(element.canal);
        labelCanal.htmlFor = select.id;

        const labelId = document.createElement("label");
        labelId.htmlFor = "pcId" + i;
        labelId.textContent = "ID PureControl :";
        const inputId = document.createElement("input");
        inputId.id = "pcId" + i;
        inputId.type = "text";
        inputId.inputMode = "numeric";
        inputId.maxLength = 10;
        inputId.placeholder = "ex. 123456";
        inputId.value = element.id || "";
        select.addEventListener("change", function () {
          if (select.value === "-1") inputId.value = "";
        });

        ligne.append(labelCanal, select, labelId, inputId);
        conteneur.appendChild(ligne);
      }
    }

    async function ChargerPureControl() {
      try {
        const reponse = await fetch("/PureControlConfig", { cache: "no-store" });
        if (!reponse.ok) throw new Error("Erreur HTTP " + reponse.status);
        const config = await reponse.json();
        document.getElementById("pcToken").value = config.apiToken || "";
        document.getElementById("pcPeriode").value = config.periodeMinutes;
        CreerElementsPureControl(config.nomsCanaux || [], config.elements || []);
      } catch (erreur) {
        CreerElementsPureControl([], []);
        AfficherEtatPureControl("Impossible de charger la configuration : " + erreur.message, true);
      }
    }

    async function EnregistrerPureControl() {
      const token = document.getElementById("pcToken").value;
      const periodeMinutes = Number(document.getElementById("pcPeriode").value);
      const elements = [];
      for (let i = 0; i < PC_NB_ELEMENTS; i++) {
        elements.push({
          canal: Number(document.getElementById("pcCanal" + i).value),
          id: document.getElementById("pcId" + i).value.trim()
        });
      }

      try {
        const reponse = await fetch("/PureControlConfig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiToken: token, periodeMinutes, elements })
        });
        const message = await reponse.text();
        if (!reponse.ok) throw new Error(message || ("Erreur HTTP " + reponse.status));
        AfficherEtatPureControl("Configuration PureControl sauvegardée.", false);
      } catch (erreur) {
        AfficherEtatPureControl("Échec de la sauvegarde : " + erreur.message, true);
      }
    }
  </script>
</body>
</html>
)====";
