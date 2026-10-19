//*********************************************
// Page résumé rapide
//*********************************************
const char *PageRapide = R"====(
<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Résumé rapide - Routeur F1ATB</title>
  <style>
    body { font: 16px Arial, sans-serif; max-width: 900px; margin: 1rem auto; padding: 0 1rem; color: #222; }
    h1 { font-size: 1.5rem; }
    h2 { margin-top: 1.5rem; font-size: 1.2rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: .65rem .4rem; border-bottom: 1px solid #ccc; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    .tableScroll { overflow-x: auto; }
    #actions { min-width: 650px; font-size: .9rem; }
    #actions td { vertical-align: top; }
    .equivalent div + div { margin-top: .3rem; }
    .commandes { white-space: nowrap; text-align: center; }
    .commandes button { margin: 0 .1rem; padding: .35rem .5rem; }
    .commandeActive { background: #f88; }
    #messageAction { min-height: 1.2em; color: #555; font-size: .9rem; }
    #temperatures { list-style: none; padding: 0; margin: 0; }
    #temperatures li { display: flex; justify-content: space-between; padding: .65rem .4rem; border-bottom: 1px solid #ccc; }
    #zendure { list-style: none; padding: 0; margin: 0; }
    #zendure li { display: flex; justify-content: space-between; padding: .65rem .4rem; border-bottom: 1px solid #ccc; }
    #miseAJour { color: #555; font-size: .9rem; }
    .erreur { color: #a00 !important; }
  </style>
</head>
<body>
  <h1>Résumé du jour</h1>
  <p id="miseAJour" aria-live="polite">Chargement des mesures…</p>
  <table>
    <thead><tr><th>Énergie du jour</th><th>Soutirée</th><th>Injectée</th></tr></thead>
    <tbody id="energies"></tbody>
  </table>
  <section id="actionsSection" hidden>
    <h2>Actions</h2>
    <p id="messageAction" aria-live="polite"></p>
    <div class="tableScroll">
      <table id="actions">
        <thead>
          <tr><th>Action</th><th>État / ouverture</th><th>Ouverture équivalente</th><th>Forçage</th></tr>
        </thead>
        <tbody id="actionsBody"></tbody>
      </table>
    </div>
  </section>
  <section id="zendureSection" hidden>
    <h2>Zendure</h2>
    <ul id="zendure"></ul>
  </section>
  <h2>Températures</h2>
  <ul id="temperatures"></ul>
  <script>
    const energies = document.getElementById("energies");
    const temperatures = document.getElementById("temperatures");
    const zendureSection = document.getElementById("zendureSection");
    const zendure = document.getElementById("zendure");
    const actionsSection = document.getElementById("actionsSection");
    const actionsBody = document.getElementById("actionsBody");
    const messageAction = document.getElementById("messageAction");
    const miseAJour = document.getElementById("miseAJour");
    let commandeEnCours = false;

    function ajouterCellule(ligne, texte) {
      const cellule = document.createElement("td");
      cellule.textContent = texte;
      ligne.appendChild(cellule);
    }

    function formatHeures(centiemesHeure) {
      const valeur = Number.parseInt(centiemesHeure, 10) || 0;
      const heures = Math.floor(valeur / 100);
      const minutes = Math.floor(0.6 * (valeur + 0.4 - 100 * heures));
      return `${heures}:${String(minutes).padStart(2, "0")}`;
    }

    function afficherActions(actions) {
      actionsSection.hidden = actions.length === 0;
      actionsBody.replaceChildren();
      for (const action of actions) {
        const ligne = document.createElement("tr");
        ajouterCellule(ligne, action.nom);
        ajouterCellule(
          ligne,
          action.etat === "Ouverture" ? `${action.ouverture} %` : action.etat
        );

        const equivalent = document.createElement("td");
        equivalent.className = "equivalent";
        const routage = document.createElement("div");
        routage.textContent = `Routage : ${formatHeures(action.routageHeures)} · ${Number(action.routageWh).toLocaleString("fr-FR")} Wh`;
        const force = document.createElement("div");
        force.textContent = `Forcé : ${formatHeures(action.forceHeures)} · ${Number(action.forceWh).toLocaleString("fr-FR")} Wh`;
        equivalent.append(routage, force);
        ligne.appendChild(equivalent);

        const commandes = document.createElement("td");
        commandes.className = "commandes";
        const forceActive = Number(action.forcage) !== 0;
        const boutonOn = document.createElement("button");
        boutonOn.type = "button";
        boutonOn.textContent = "On";
        boutonOn.dataset.actionId = action.id;
        boutonOn.dataset.force = "1";
        boutonOn.classList.toggle("commandeActive", Number(action.forcage) > 0);
        boutonOn.setAttribute("aria-pressed", String(Number(action.forcage) > 0));
        const boutonOff = document.createElement("button");
        boutonOff.type = "button";
        boutonOff.textContent = "Off";
        boutonOff.dataset.actionId = action.id;
        boutonOff.dataset.force = "-1";
        boutonOff.classList.toggle("commandeActive", Number(action.forcage) < 0);
        boutonOff.setAttribute("aria-pressed", String(Number(action.forcage) < 0));
        commandes.append(boutonOn, boutonOff);
        if (forceActive) {
          const duree = document.createElement("div");
          duree.textContent = `${Math.abs(Number(action.forcage))} min`;
          commandes.appendChild(duree);
        }
        ligne.appendChild(commandes);
        actionsBody.appendChild(ligne);
      }
    }

    function afficher(data) {
      energies.replaceChildren();
      const compteurs = [["Principal", data.soutiree, data.injectee]];
      if (data.secondaire) {
        compteurs.push(["Secondaire", data.soutireeSecondaire, data.injecteeSecondaire]);
      }
      for (const compteur of compteurs) {
        const ligne = document.createElement("tr");
        ajouterCellule(ligne, compteur[0]);
        ajouterCellule(ligne, `${Number(compteur[1]).toLocaleString("fr-FR")} Wh`);
        ajouterCellule(ligne, `${Number(compteur[2]).toLocaleString("fr-FR")} Wh`);
        energies.appendChild(ligne);
      }

      afficherActions(data.actions || []);

      zendureSection.hidden = !data.zendure;
      zendure.replaceChildren();
      if (data.zendure) {
        const mesuresZendure = [
          ["PowerSecteur (Pw)", data.PowerSecteur, "W"],
          ["PwBattery", data.PwBattery, "W"],
          ["PwBatteryCharge", data.PwBatteryCharge, "W"],
          ["BatteryStatus", data.BatteryStatus, "%"]
        ];
        for (const [nom, valeur, unite] of mesuresZendure) {
          const ligne = document.createElement("li");
          const libelle = document.createElement("span");
          const mesure = document.createElement("strong");
          libelle.textContent = nom;
          mesure.textContent = valeur === null
            ? "Indisponible"
            : `${Number(valeur).toLocaleString("fr-FR")} ${unite}`;
          ligne.append(libelle, mesure);
          zendure.appendChild(ligne);
        }
      }

      temperatures.replaceChildren();
      if (data.temperatures.length === 0) {
        const ligne = document.createElement("li");
        ligne.textContent = "Aucune sonde configurée";
        temperatures.appendChild(ligne);
      } else {
        for (const mesure of data.temperatures) {
          const ligne = document.createElement("li");
          const nom = document.createElement("span");
          const valeur = document.createElement("strong");
          nom.textContent = mesure.nom;
          valeur.textContent = mesure.valeur === null
            ? "Indisponible"
            : `${Number(mesure.valeur).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`;
          ligne.append(nom, valeur);
          temperatures.appendChild(ligne);
        }
      }

      miseAJour.textContent = data.date ? `Dernière mise à jour : ${data.date}` : "Mesures actualisées";
      miseAJour.classList.remove("erreur");
    }

    actionsBody.addEventListener("click", async (evenement) => {
      if (commandeEnCours) return;
      const bouton = evenement.target.closest("button[data-action-id]");
      if (!bouton) return;
      const id = bouton.dataset.actionId;
      const force = bouton.dataset.force;
      commandeEnCours = true;
      messageAction.classList.remove("erreur");
      messageAction.textContent = "Envoi du forçage…";
      try {
        const reponse = await fetch(
          `/ajax_etatActions?Force=${encodeURIComponent(force)}&NumAction=${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );
        if (!reponse.ok) {
          const detail = await reponse.text();
          throw new Error(detail || `HTTP ${reponse.status}`);
        }
        messageAction.textContent = "Forçage appliqué.";
        await actualiser();
      } catch (erreur) {
        console.error("Erreur de forçage d’une action :", erreur);
        messageAction.classList.add("erreur");
        messageAction.textContent = erreur.message.startsWith("Accès refusé.")
          ? erreur.message
          : `Forçage impossible : ${erreur.message}`;
      } finally {
        commandeEnCours = false;
      }
    });

    async function actualiser() {
      try {
        const reponse = await fetch("/ajax_rapide", { cache: "no-store" });
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        afficher(await reponse.json());
      } catch (erreur) {
        console.error("Erreur de lecture des mesures rapides :", erreur);
        miseAJour.textContent = "Mesures indisponibles — nouvelle tentative en cours.";
        miseAJour.classList.add("erreur");
      }
    }

    actualiser();
    setInterval(actualiser, 5000);
  </script>
</body>
</html>
)====";
