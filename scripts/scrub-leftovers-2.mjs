import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}
function write(rel, text) {
  fs.writeFileSync(path.join(ROOT, rel), text)
  console.log("wrote", rel)
}

// --- adapter: DE instead of FR, drop SUPPLYTIME ---
{
  let t = read("src/app/compass/_diamond/adapter.ts")
  const pairs = [
    [`Assembler les caractéristiques de charte et l’exposition pour \${subject}`, `Charterdaten und Exposition für \${subject} zusammenstellen`],
    [`Extraire les paramètres, normes et conditions pour \${subject}`, `Parameter, Normen und Konditionen für \${subject} extrahieren`],
    [`Préparer l’avis d’option und l’avenant pour \${subject}`, `Optionsanzeige und Nachtrag für \${subject} vorbereiten`],
    [`Émettre l’AO via le portail SCM et dépouiller les offres pour \${subject}`, `Ausschreibung über das SCM-Portal ausgeben und Angebote für \${subject} tabellieren`],
    [`Assembler la fiche du lot et le plan de recherche pour \${subject}`, `Losakte und Rechercheplan für \${subject} zusammenstellen`],
    [`Cadrer le lot avec les bons documents contrôlés avant le début de la rédaction.`, `Das Los vor der Erstellung mit den richtigen verbindlichen Dokumenten rahmen.`],
    [`Fiche approuvée et baseline budgétaire saisie.`, `Akte freigegeben und Budgetbasis erfasst.`],
    [`Compiler la fiche du lot \${subject} : baseline budgétaire, documents contrôlés et fenêtre d’AO.`, `Losakte für \${subject} erstellen: Budgetbasis, verbindliche Dokumente und Ausschreibungsfenster.`],
    [`Chaque exigence doit renvoyer à un document contrôlé avant son intégration à l’AO.`, `Jede Anforderung muss vor der Aufnahme in die Ausschreibung auf ein verbindliches Dokument verweisen.`],
    [`Exigences extraites avec citations documentaires.`, `Anforderungen mit Dokumentzitaten extrahiert.`],
    [`Extraire la baseline complète des exigences pour \${subject}, en citant chaque document source et révision.`, `Vollständige Anforderungsbasis für \${subject} extrahieren und jede Quelle und Revision zitieren.`],
    [`Valider la baseline des exigences`, `Anforderungsbasis bestätigen`],
    [`L’extraction est sourcée, mais le jugement sur le périmètre reste humain.`, `Die Extraktion ist quellenbezogen, die Umfangsentscheidung bleibt menschlich.`],
    [`Le responsable valide la baseline des exigences.`, `Der Verantwortliche bestätigt die Anforderungsbasis.`],
    [`Assembler le projet d’AO et exécuter l’audit`, `Ausschreibungsentwurf zusammenstellen und prüfen`],
    [`Le projet doit réussir la vérification contradictoire avant d’être soumis à l’approbateur.`, `Der Entwurf muss die Gegenprüfung bestehen, bevor er zur Freigabe geht.`],
    [`Projet audité en attente avec certificat conforme.`, `Geprüfter Entwurf mit sauberem Zertifikat in der Warteschlange.`],
    [`Assembler l’AO complet pour \${subject} et vérifier chaque clause par rapport aux documents sources.`, `Vollständige Ausschreibung für \${subject} zusammenstellen und jede Klausel gegen die Quelldokumente prüfen.`],
    [`Approuver l’AO et autoriser son émission`, `Ausschreibung freigeben und Ausgabe genehmigen`],
    [`L’autorité d’approbation et l’acceptation des écarts restent humaines.`, `Freigabe und Abweichungsakzeptanz bleiben menschlich.`],
    [`Approbation enregistrée ; émission autorisée.`, `Freigabe erfasst; Ausgabe genehmigt.`],
    [`Transformer le projet approuvé en AO actif avec suivi des offres.`, `Den freigegebenen Entwurf in eine laufende Ausschreibung mit Angebotsverfolgung überführen.`],
    [`Offres dépouillées et conformité vérifiée.`, `Angebote tabelliert und Konformität geprüft.`],
    [`Gérer l’AO actif pour \${subject} : émission, accusés, clarifications et dépouillement.`, `Laufende Ausschreibung für \${subject} steuern: Ausgabe, Eingangsbestätigungen, Klärungen und Tabellierung.`],
    [`Gérer les clarifications et la recommandation d’attribution pour \${subject}`, `Klärungen und Zuschlagsempfehlung für \${subject} führen`],
    [`La négociation fournisseur et le jugement d’évaluation restent humains.`, `Lieferantenverhandlung und Bewertungsurteil bleiben menschlich.`],
    [`Recommandation d’attribution soumise.`, `Zuschlagsempfehlung eingereicht.`],
    [`Rapprocher la valeur attribuée et comptabiliser les économies`, `Zuschlagswert abstimmen und Einsparungen buchen`],
    [`Démontrer la valeur créée par l’AO et l’affecter au lot.`, `Nachweisen, dass die Ausschreibung Wert geschaffen hat, und ihn dem Los zuordnen.`],
    [`Économies comptabilisées dans le registre.`, `Einsparungen im Register gebucht.`],
    [`Rapprocher la valeur attribuée du budget pour \${subject} et comptabiliser les économies.`, `Zuschlagswert gegen das Budget für \${subject} abstimmen und die Einsparungen buchen.`],
    [`Assembler les caractéristiques de charte et l’exposition pour`, `Vertragsdaten und Exposition zusammenstellen für`],
    [`Préparer l’avis d’option et l’avenant pour \${subject}`, `Optionsanzeige und Nachtrag für \${subject} vorbereiten`],
    [`Ouvrir dans Gestion des appels d’offres`, `In Ausschreibungsmanagement öffnen`],
    [`Exposition de charte évitée`, `Vertragsrisiko vermieden`],
    [`Économies négociées vs budget`, `Verhandelte Einsparungen gegenüber Budget`],
    [`Attached governing procurement terms (S7-SCM-TC-2026) and any charter flow-downs`, `Attached governing procurement terms (SRC-004) and qualification gates`],
    [`QA-MAN-2026-EPCI — Corporate QA manual, standards matrix §3`, `SRC-002 / SRC-008 — SLA and qualification standards`],
    [`S7-SCM-TC-2026-v1.0 — Standard procurement terms`, `SRC-004 — Standard logistics contract terms`],
  ]
  for (const [from, to] of pairs) t = t.split(from).join(to)
  t = t.replace(
    `        ...(pkg.involvesVessel ? [fr ? "SUPPLYTIME 2026 — Clauses découlant de la charte" : "SUPPLYTIME 2026 — Charter flow-down clauses"] : []),`,
    "",
  )
  t = t.replace(
    `    sources: theme === "charter"
      ? [
        fr ? "SUPPLYTIME 2026 — Charte signée (Juridique & maritime)" : "SUPPLYTIME 2026 — Executed charter party (Legal & Maritime)",
        fr ? "S7-SCM-TC-2026-v1.0 — Conditions d’achat standard" : "S7-SCM-TC-2026-v1.0 — Standard procurement terms",
        fr ? "Interne — Évaluation du marché HLCV T3 2026" : "Internal — Q3 2026 HLCV market assessment",
      ]
      : [`,
    `    sources: theme === "charter"
      ? [
        de ? "SRC-004 — Standardvertragsbedingungen für Logistik" : "SRC-004 — Standard logistics contract terms",
        de ? "SRC-005 — Preis- und Kraftstoffzuschlagsregeln" : "SRC-005 — Pricing and fuel surcharge rules",
        de ? "Intern — Relationenregister RFP-2026-001" : "Internal — RFP-2026-001 lane register",
      ]
      : [`,
  )
  t = t.replace("  const fr = locale === \"de\"", "  const de = locale === \"de\"")
  t = t.replaceAll("fr ?", "de ?")
  // missionFromPackage still has const fr = false — keep EN-only there after de rename
  t = t.replace("  const fr = false", "  const de = locale === \"de\"")
  write("src/app/compass/_diamond/adapter.ts", t)
}

// --- shell DE intel ---
{
  let t = read("src/app/compass/_shell.tsx")
  t = t.replace(
    `          chain: [
            "Résolution du lot vers sa spécification technique contrôlée et sa quantité",
            "Récupération des obligations DNV / NORSOK / ISO applicables depuis QA-MAN-2026-EPCI",
            "Assemblage des conditions commerciales et juridiques de S7-SCM-TC-2026, avec obligations issues de la charte pour les opérations maritimes",
            "Composition des sections de l’AO et préparation de l’audit contradictoire de chaque source citée",
          ],
          sources: [\`\${DOCUMENTS.length} documents contrôlés au registre projet\`, \`\${packages.length} lots actifs sur le pipeline \${PROJECT.shortName}\`, "Particularités de la charte SUPPLYTIME 2026"],`,
    `          chain: [
            "Los auf die verbindliche Spezifikation und Menge auflösen",
            "SLA- und Qualifikationspflichten aus SRC-002 und SRC-008 übernehmen",
            "Einkaufs- und Rechtsbedingungen aus SRC-004 und SRC-005 zusammenstellen",
            "Ausschreibungsabschnitte erstellen und gegen jede zitierte Quelle prüfen",
          ],
          sources: [\`\${DOCUMENTS.length} verbindliche Dokumente im Projektregister\`, \`\${packages.length} aktive Lose in der Pipeline \${PROJECT.shortName}\`, "Quellenregister SRC-001 bis SRC-008"],`,
  )
  t = t.replace(
    `          chain: [
            "Application des portes éliminatoires : ISO 9001, knock-for-knock mutuel, DDP Rotterdam",
            "Normalisation des prix éligibles par rapport à l’offre conforme la plus basse (Prix 35)",
            "Notation Technique 25, QA/HSEQ 20 et Juridique 20 — signalement des réductions de garantie supérieures à 25 %",
            "Classement des réponses conformes dans une matrice de recommandation d’attribution",
          ],
          sources: ["Quatre réponses à ITT-MER-SCM-2101", "S7-SCM-TC-2026 §4.1 — Incoterms et garantie de référence", "QA-MAN-2026-EPCI — alignement des préavis FAT / ITP"],`,
    `          chain: [
            "Qualifikationstore (Versicherung, Due Diligence, Datenanbindung) getrennt von den Gewichtungen anwenden",
            "Zulässige Jahreskosten gegen das günstigste konforme Angebot normalisieren",
            "Preis 35, Technik 25, QA/HSEQ 20 und Recht 20 nur unter tor-passenden Carriern bewerten",
            "Incumbent-Historie nur über zwölf geprüfte Monate zeigen; Challenger bleiben No History",
          ],
          sources: ["RFP-2026-001 Relationenraten und Angebotsanhänge", "SRC-002 Leistungs- und SLA-Standard", "SRC-008 Lieferantenqualifikation — No History"],`,
  )
  t = t.replace(
    `        chain: [
          "Chargement du registre des appels d’offres et application de l’avancement de session à chaque lot",
          "Calcul des jours restants pour chaque fenêtre d’appel d’offres de 21 jours",
          "Rattachement des lots aux documents contrôlés, normes et interfaces de charte",
          "Classement par date limite de soumission, objectif d’économies et chemin critique d’installation",
        ],
        sources: [\`\${packages.length} lots actifs sur le pipeline \${PROJECT.shortName}\`, \`\${closed.length} lots attribués dans le registre des économies\`, \`\${DOCUMENTS.length} documents contrôlés au registre projet\`],`,
    `        chain: [
          "Ausschreibungsregister laden und Sitzungsfortschritt je Los anwenden",
          "Verbleibende Tage für jedes 21-Tage-Ausschreibungsfenster berechnen",
          "Lose mit verbindlichen Dokumenten, SLA und Qualifikationstoren verknüpfen",
          "Nach Angebotsfrist, Einsparziel und Betriebspfad ordnen",
        ],
        sources: [\`\${packages.length} aktive Lose in der Pipeline \${PROJECT.shortName}\`, \`\${closed.length} vergebene Lose im Einsparregister\`, \`\${DOCUMENTS.length} verbindliche Dokumente im Projektregister\`],`,
  )
  t = t.replace(
    `"Retrieved applicable DNV / NORSOK / ISO obligations from QA-MAN-2026-EPCI"`,
    `"Retrieved applicable SLA and qualification obligations from SRC-002 and SRC-008"`,
  )
  t = t.replace(
    `"Assembled commercial and legal terms from S7-SCM-TC-2026, including charter flow-downs where vessel operations apply"`,
    `"Assembled commercial and legal terms from SRC-004 and SRC-005"`,
  )
  write("src/app/compass/_shell.tsx", t)
}

// --- reasoning helpers ---
{
  let t = read("src/app/compass/_components/reasoning-helpers.ts")
  t = t.replace(
    `    QA: "QA-MAN-2026-EPCI — Corporate QA Manual",
    Terms: "S7-SCM-TC-2026-v1.0 — Procurement Terms",
    Charter: "SUPPLYTIME 2026 — Executed charter party",`,
    `    QA: "SRC-002 — Carrier performance and SLA standard",
    Terms: "SRC-004 — Standard logistics contract terms",
    Charter: "SRC-008 — Supplier qualification standard",`,
  )
  t = t.replace("/*  Action Centre hero — traceable BluePilot synthesis                  */", "/*  Action Centre hero — traceable Compass synthesis                    */")
  t = t.replace(
    `      : fr ? [
          "Chargement du Logistik-Ausschreibungsregister et application de l’avancement de session par lot",
          "Calcul des jours restants pour chaque fenêtre d’AO et délai de clarification",
          "Association de chaque lot à ses documents contrôlés, normes et interfaces de charte",
          "Classement par échéance, objectif d’économies et chemin critique d’installation",`,
    `      : fr ? [
          "Logistik-Ausschreibungsregister laden und Sitzungsfortschritt je Los anwenden",
          "Verbleibende Tage für jedes Ausschreibungsfenster und die Klärungsfrist berechnen",
          "Jedes Los mit verbindlichen Dokumenten, SLA und Qualifikationstoren verknüpfen",
          "Nach Frist, Einsparziel und Betriebspfad ordnen",`,
  )
  t = t.replace(
    `[citationFromLabel("BluePilot operating-loop orchestrator — specialist → synthesize → verify pipeline", "operating-loop")]`,
    `[citationFromLabel("Compass operating-loop orchestrator — specialist → synthesize → verify pipeline", "operating-loop")]`,
  )
  t = t.replace(
    `? (fr ? "BluePilot a priorisé le pipeline à partir des analyses portefeuille achats, commerciales et marché fournisseurs." : "BluePilot prioritised the tender pipeline from procurement portfolio, commercial and supply market specialist outputs.")
      : (fr ? "BluePilot a classé les lots selon l’échéance, l’objectif d’économies et le chemin critique d’installation." : "BluePilot ranked packages by submission deadline, savings target and installation critical path.")`,
    `? (fr ? "Compass hat die Pipeline aus Einkaufs-, Konditionen- und Lieferantenmarktanalysen priorisiert." : "Compass prioritised the tender pipeline from procurement portfolio, commercial and supply market specialist outputs.")
      : (fr ? "Compass hat die Lose nach Frist, Einsparziel und Betriebspfad geordnet." : "Compass ranked packages by submission deadline, savings target and operating path.")`,
  )
  t = t.replace(
    `      ? \`\${active.length} lots sont actifs sur ce tableau. Consultez les liens de sources pour examiner chaque document ou espace de travail.\``,
    `      ? \`\${active.length} Lose sind auf diesem Board aktiv. Folgen Sie den Quellenlinks, um jedes Dokument oder den Arbeitsbereich zu prüfen.\``,
  )
  write("src/app/compass/_components/reasoning-helpers.ts", t)
}

// --- action reconcile customer strings ---
{
  const rel = "src/app/compass/_components/hub/bluepilot-action-reconcile.ts"
  let t = read(rel)
  t = t.replace(/BluePilot/g, "Compass")
  write(rel, t)
}

// --- en.ts legal chrome ---
{
  let t = read("src/app/compass/_i18n/en.ts")
  t = t.replace('unresolvedHelp: "For a new component class, raise a specification request with Engineering — EPCI Tech Data before going to market."',
    'unresolvedHelp: "For a new service class, raise a specification request with Category Management — Logistics before going to market."')
  t = t.replace('qualityDetail: "mapping obligations from QA-MAN-2026-EPCI"',
    'qualityDetail: "mapping obligations from SRC-002 and SRC-008"')
  t = t.replace('legalAgent: "Contracts & Maritime Agent"', 'legalAgent: "Contracts & Commercial Agent"')
  t = t.replace('legalDetailVessel: "assembling terms + charter flow-downs"',
    'legalDetailVessel: "assembling contract terms"')
  t = t.replace('section4: "Commercial & Maritime Legal Terms"', 'section4: "Commercial & Legal Terms"')
  t = t.replace('checklist3: "Charter flow-downs checked"', 'checklist3: "Qualification gates checked"')
  write("src/app/compass/_i18n/en.ts", t)
}

console.log("pass 2 done")
