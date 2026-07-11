# NutriBalance — Backlog Produit

## Épic 1 — Profil & Onboarding

- Saisie poids, taille, âge, sexe, niveau d'activité
- Choix objectif : perte / maintien / prise de masse / recomposition
- Calcul BMR (Mifflin-St Jeor) + TDEE selon activité
- Calcul auto macros (protéines/glucides/lipides) selon objectif
- Poids cible + délai souhaité → rythme hebdo réaliste (~0.5-1%/semaine)
- Onboarding sport : niveau (débutant/intermédiaire/avancé), équipement dispo

## Épic 2 — Authentification _(fait)_

- Register/Login, refresh JWT, stockage sécurisé

## Épic 3 — Suivi alimentaire

- Recherche aliment (base OpenFoodFacts)
- Scan code-barres
- Ajout manuel aliment (nom, cal, macros/100g)
- Saisie grammage → calcul auto calories/macros
- Repas : petit-déj/déjeuner/dîner/collations
- Journal quotidien avec total cal/macros vs objectif
- Aliments favoris / récents / repas types réutilisables
- Recettes maison → calcul macros auto (déjà identifié)
- Estimation calories par photo (IA, phase 2)

## Épic 4 — Hydratation

- Objectif eau/jour (calculé selon poids + activité)
- Ajout rapide (verre, bouteille, quantité perso)
- Rappels programmés

## Épic 5 — Compléments alimentaires

- Liste compléments perso (protéine, créatine, vitamines...)
- Dosage + horaire de prise
- Rappels + historique prise

## Épic 6 — Suivi sportif

- Choix mode : maison (sans matériel) / salle (machines/poids libres)
- Split routines : Full Body / Haut-Bas / Push-Pull-Legs, rotation auto
- Bibliothèque exercices (nom, muscle ciblé, instructions, GIF/vidéo)
- Séance : séries × reps × poids × temps de repos
- Timer repos entre séries
- RPE (intensité ressentie) par séance
- Historique + progression charge (surcharge progressive)
- Suggestions séance selon jour précédent (éviter surentraînement même groupe musculaire)
- Calories brûlées estimées par séance

## Épic 7 — Suivi progression

- Courbe poids dans le temps
- Photos progression (avant/après, dates)
- Mesures corporelles (tour de taille, bras, etc. — optionnel)
- Comparaison objectif vs réel

## Épic 8 — Conseils & IA (Claude API)

- Conseils quotidiens selon écart calories/macros
- Détection plateau → suggestion ajustement
- Chat coach IA (questions libres nutrition/sport)
- Rapport hebdo automatique (résumé + recommandations)

## Épic 9 — Notifications

- Rappels repas par horaire
- Rappels hydratation/compléments
- Rappel séance du jour
- Alerte objectif atteint

## Épic 10 — Gamification (optionnel)

- Streaks (jours consécutifs de suivi)
- Badges/paliers
- Défis hebdo

## Épic 11 — Intégrations

- Apple Health / Google Fit (sync poids, pas, calories)
- Export PDF/CSV bilan mensuel
- Stripe (si version premium)

## Épic 12 — Réglages

- Unités (kg/lb, cm/in)
- Notifications on/off par type
- Gestion compte / suppression données (RGPD)

---

**Priorisation suggérée (MVP) :** Épic 1, 3, 6, 7 → app fonctionnelle basique.
Puis Épic 4, 5, 9 → confort quotidien.
Puis Épic 8, 10, 11 → différenciation/valeur ajoutée.
