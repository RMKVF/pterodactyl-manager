# Pterodactyl Manager Discord Bot

Pterodactyl Manager est un bot Discord conçu pour gérer les serveurs Pterodactyl.  
Le bot vous permet de démarrer, arrêter, redémarrer des serveurs, consulter leur statut, et gérer les serveurs associés à des utilisateurs spécifiques.

## Fonctionnalités

- Gérer les serveurs Pterodactyl directement depuis Discord
- Voir le statut des serveurs et leur uptime
- Contrôler l’alimentation des serveurs (démarrer, arrêter, redémarrer)
- Gestion des serveurs pour des utilisateurs spécifiques
- Gestion des rôles : Staff, Admin, Dev avec accès configurables
- Notification privée automatique lors des changements de statut serveur
- Logs détaillés dans la console à chaque vérification
- Embed Discord mis à jour pour éviter le spam
- Support multi-propriétaires pour un serveur
- Limite de 10 serveurs par embed pour respecter les règles Discord

## Installation

### Prérequis

- Node.js (v20 ou supérieur recommandé)
- npm (Node Package Manager)
- Un token de bot Discord
- Une clé API Pterodactyl et l’URL du panel

### Étapes d’installation

1. Clonez le dépôt :

    ```bash
    git clone https://github.com/TonGithub/pterodactyl-manager.git
    cd pterodactyl-manager
    ```

2. Installez les dépendances nécessaires :

    ```bash
    npm install
    ```

3. Configurez le fichier `config.json` :

    ```json
    {
      "token": "xxxxx",
      "channelId": "xxxxx",
      "pterodactyl": {
        "url": "xxxxx",
        "apiKey": "xxxxx"
        },
      "refreshInterval": 30000,
      "statuses": [
        {
          "text": "xxxxx",
          "type": "PLAYING"
        },
        {
          "text": "xxxxx",
          "type": "WATCHING"
        }
      ],
      "staff": ["xxxxx", "xxxxx", "xxxxx"],
      "admins": ["xxxxx", "xxxxx"],
      "dev": ["xxxxx"]
    }

    ```

4. Configurez le fichier `bot-list.json` avec vos serveurs :

    ```json
  [
    {
      "name": "xxxxx",
      "id": "xxxxx",
      "owner_ids": ["xxxxx", "xxxxx"],
      "staff_access": "personal"
    },
    {
      "name": "xxxxx",
      "id": "xxxxx",
      "owner_ids": ["xxxxx", "xxxxx"],
      "staff_access": "dev"
    },
    {
      "name": "xxxxx",
      "id": "xxxxx",
      "owner_ids": ["xxxxx", "xxxxx"],
      "staff_access": "admins"
    },
    {
      "name": "xxxxx",
      "id": "xxxxx",
      "owner_ids": ["xxxxx", "xxxxx"],
      "staff_access": "staff"
    }
  ]
  ```

5. Démarrez le bot :

    ```bash
    node index.js
    ```

## Commandes disponibles

### `/manage-bots`

- **Description** : Gérer les serveurs dont vous êtes propriétaire (démarrer, arrêter, redémarrer).
- **Utilisation** : `/manage-bots`

### `/manage-user-bots`

- **Description** : Gérer les serveurs d’un utilisateur spécifique par son ID Discord (réservé au staff/admin/dev).
- **Utilisation** : `/manage-user-bots user_id:<ID Discord>`

## Ajouter des commandes supplémentaires

Vous pouvez ajouter d’autres commandes en créant de nouveaux fichiers `.js` dans le dossier `commands/`.

Chaque fichier doit suivre cette structure :

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nom-de-la-commande')
        .setDescription('Description de la commande'),
    
    async execute(interaction) {
        await interaction.reply('Réponse de la commande personnalisée.');
    }
};
```