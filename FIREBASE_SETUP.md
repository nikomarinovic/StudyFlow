# Firebase setup

StudyFlow is connected to the existing Firebase project `studyflow-78e19`. The repository includes its public web-app configuration, Firebase CLI project mapping, and Firestore rules configuration. Email/Password Authentication is enabled, Firestore is provisioned in the Europe multi-region (`eur3`) with deletion protection enabled, and the rules in `firestore.rules` have been deployed.

## Create and configure the project

The configured production site is `studyflowio.netlify.app`; it and `localhost` are authorized. Other deployment domains must be added under **Authentication → Settings → Authorized domains**. For local development, serve the site from `localhost` over HTTP; Web Crypto and Firebase require a secure context outside localhost.

The Firebase Web App config in `js/firebase-config.js` is public project metadata. Never place a service-account key in this repository. Open the app and create or sign in to an account. Existing local records for the same email are moved to that Firebase UID and synced to its private Firestore records.

The app loads the modular Firebase Web SDK from Firebase's CDN. Firebase documents CDN imports as a supported option for web apps that do not use a module bundler ([Firebase Web setup](https://firebase.google.com/docs/web/learn-more)).

## Data model

Records are stored at `users/{uid}/records/{collection}__{recordId}`. The client listens to that user's records collection and updates the local cache when another device changes data. The rule file permits access only when the signed-in UID matches the path UID and the record's owner UID. Firebase notes that Firestore rules are the access boundary for direct client access ([Firestore security rules](https://firebase.google.com/docs/firestore/security/rules-conditions)).

Until the config is filled and rules are published, the sync indicator reports device-only storage. Avoid entering sensitive academic or personal information into a deployed build before setup is complete.
