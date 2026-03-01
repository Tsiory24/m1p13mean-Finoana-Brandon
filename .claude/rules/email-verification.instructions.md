# Fonctionnalité : Vérification email à l'inscription (OTP 6 chiffres)

## Vue d'ensemble

Lors de l'inscription d'un acheteur sur le front-office, un code de vérification à 6 chiffres est envoyé à l'adresse email renseignée. L'inscription ne peut aboutir que si l'utilisateur saisit le bon code. L'email devient ainsi **obligatoire** pour l'inscription.

## Flow utilisateur

1. L'utilisateur remplit le formulaire (nom, email, contact, mot de passe) et clique **"Envoyer le code"**
2. Le backend génère un code à 6 chiffres valable **10 minutes**, le stocke en mémoire et envoie un email
3. Le formulaire passe en **étape 2** : saisie du code à 6 chiffres
4. L'utilisateur entre le code et clique **"Créer mon compte"**
5. Le backend vérifie le code puis crée le compte

## Backend

### Utilitaires créés
- `backend/utils/mailer.js` — configuration nodemailer (SMTP via variables d'environnement)
- `backend/utils/emailVerification.js` — store en mémoire (Map) avec TTL 10 min pour les codes OTP

### Variables d'environnement `.env`
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=votre_mot_de_passe_app
SMTP_FROM="Centre Commercial <votre@email.com>"
```

### Endpoints ajoutés
```
POST /api/auth/send-email-code   public — envoie le code à l'email, stocke en mémoire 10 min
```

### Endpoint modifié
```
POST /api/auth/register — désormais exige emailCode dans le body, vérifie le code avant de créer le compte
```

### Règles métier
1. Un seul code actif par email — un nouvel envoi remplace l'ancien
2. Le code expire après **10 minutes**
3. Après **3 tentatives échouées** de vérification, le code est invalidé
4. L'email doit être **unique** (déjà vérifié par le backend)

## Frontend

### Service `AuthService`
- Nouvelle méthode `sendEmailCode(email: string): Observable<any>`

### Composant `InscriptionFoComponent`
Formulaire en 2 étapes :
- **Étape 1** : Nom, email (obligatoire), contact, mot de passe, confirmation → bouton "Envoyer le code de vérification"
- **Étape 2** : Champ code 6 chiffres + timer "expire dans X:XX" → bouton "Créer mon compte" + lien "Renvoyer le code"
