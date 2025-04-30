L'objectif de ce projet est de concevoir un système de calcul qui utilise rabbitmq, nous avons conçu cette application étape par étape comme il était demandé dans le cahier des charges, nous allons donc diviser ce rapport pour chaque étape.

Arnaud D'ANSELME
Valeriya SHIN
Guilherme DE OLIVEIRA DIAS

# Installation

*Veuillez d'abord avoir un serveur RabbitMQ à disposition !*

Clonez le projet

```
git clone https://github.com/Araden14/efrei_rabbitmq_ngi.git
```

Créez le fichier *.env* à la racine du projet et remplissez les informations de connexion à votre instance RabbitMQ tel que dans le fichier *.env.exemple*

Installer les librairies node:

```
npm install
```

Après ça vous pouvez lancer les procéssus dans des terminaux différents (vous pouvez aussi lancer les workers en tâche de fond):

```
npm run listener
npm run add_worker
npm run sub_worker
npm run mul_worker
npm run div_worker
npm run producer
```

Au lancement du worker vouz pourrez choisir quel mode de lancement vous vouz utiliser.

# Rapport

**Étape 1**

Structure du projet à l'étape 1 

```
.
├── node_modules
├── package-lock.json
├── package.json
└── src
    ├── producer.js
    ├── results_client.js
    └── workers
        └── workeradd.js

```

Notre projet à l'étape 1 comporte plusieurs acteurs :

**producer.js**

**`createCalc()`**  
Génère deux entiers aléatoires (`n1`, `n2`) et choisit au hasard l’opération à réaliser, puis retourne ce triplet prêt à être publié.

**`send()`**  
Ouvre la connexion RabbitMQ, crée un canal, vérifie/instancie la file `add_worker`, fabrique une requête via `createCalc()` et l’envoie dans la file.

**`sendMessagesIndefinitely()`**  
Appelle `send()` puis se ré-auto-programme toutes les 5 secondes avec `setTimeout`, afin d’injecter un flux continu de calculs dans RabbitMQ.

**workeradd.js**

**`amqplib.connect()`**  
Établit la connexion TCP à RabbitMQ à partir de l’URL AMQP construite avec ces variables, ouvrant la voie à tous les échanges de messages.

**`receive_div()`**  
Crée un canal, déclare (ou vérifie) les files `add_worker` et `results`, puis écoute la première : à chaque message, elle parse les nombres, calcule l’addition après un délai simulé, renvoie le résultat dans `results` et accuse réception.

**`setTimeout()`**  
Introduit un délai aléatoire de 5–15 s pour imiter un traitement long, ce qui permet de tester la robustesse du flux de messages asynchrones.


**results_clients.js**

**`receive_results()`**  
Crée un canal, déclare (ou vérifie) la file `results`, puis y attache un consommateur : pour chaque message, il parse le JSON, affiche le calcul et son résultat, puis accuse réception via `channel.ack`. Cette fonction assure donc l’écoute continue des réponses et leur traitement propre.

**Variables d'environnement**
USERNAME
PASSWORD
URL

**Packages :** 
- dotenv
- random
- amqplib

**Étape 2**

```
.
├── node_modules
├── package-lock.json
├── package.json
└── src
    ├── producer.js
    ├── results_client.js
    └── worker.js
```

- **Modification de la fréquence d'envoi des requêtes**
  Augmentation de la fréquence d'envoi de requêtes dans le script producer.js (passage de 5 secondes à 3)
- **Worker paramétrable par CLI**  
    La file d’entrée et la clé de routage sont construites avec `process.argv[2]` (`${op}_worker`) : on lance désormais le même script pour `add | sub | mul | div`.
    
- **Nouvel exchange**  
    Passage à `AVG_operations` (type _direct_) pour regrouper toutes les files spécifiques sous un bus commun.
    
- **Table de symboles**  
    Objet `operation` → mappe chaque verbe à son signe arithmétique, simplifiant les logs.
    
- **Refactor du worker**  
    Logs dynamiques, protection contre la division par zéro quand l’opération est `div`.
    

> **À noter** – Après coup, on a repéré une erreur liée à l’étape 2 : le calcul du résultat utilise toujours l’addition (`+`) au lieu du signe correspondant à l’opération choisie. Cette erreur a été modifiée dans les derniers commits (ETAPE 3)

**Étape 3**

```
.
├── node_modules
├── package-lock.json
├── package.json
└── src
    ├── producer.js
    ├── results_client.js
    └── worker.js
    
```


- Création de l’exchange **`AVG_operations_all`** pour diffuser (en fanout) tous les messages d’opérations
    
- Ajout de l’opération **`all`** à la liste des opérations supportées
    
- Mise à jour de la fonction `send()` pour gérer à la fois les exchanges directs et le fanout, en publiant les messages « all » sur `AVG_operations_all`
    
- Adaptation de `sendMessagesIndefinitely` pour accepter l’exchange et l’opération en paramètres, incluant désormais la valeur `all`

- Ajout de scripts NPM dans `package.json` pour démarrer facilement les services : `producer`, `listener`, `add_worker`, `sub_worker`, `mul_worker`, `div_worker`
    
- Mise à jour de `src/producer.js` pour utiliser **`LOGIN`**, affichage de l’URL RabbitMQ au démarrage, et correction de l’appel à `setTimeout`
    
- Modification de `src/results_client.js` pour passer de `USERNAME` à **`LOGIN`**
    
- Ajustements dans `src/worker.js` : utilisation de **`LOGIN`**, introduction de la variable `calc` pour regrouper nom de queue et opération, et correction du bug de l'étape 2 de la logique de calcul par un appel dynamique à `eval()`

**Étape 4**

```
.
├── node_modules
├── package-lock.json
├── package.json
└── src
    ├── producer.js
    ├── results_client.js
    └── worker.js
```


- Mise à disposition d'un mode de lancement du producer manuel via un cli
- Création d'un serveur avec express qui connecte une interface HTML en websocket au serveur rabbitmq pour aafficher les résultats : cette fonctionnalité n'a pas été complétement finalisé mais un aperçu de l'interface est disponible sur le port 3000 après exécution de la commande `npm run server`