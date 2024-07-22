# Pterodactyl Manager Discord Bot

Pterodactyl Manager is a Discord bot designed to manage Pterodactyl servers. The bot allows users to start, stop, and restart servers, view server statuses, and manage servers associated with specific users.

## Features

- Manage Pterodactyl servers directly from Discord
- View server status and uptime
- Control server power states (start, stop, restart)
- Manage servers for specific users

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- A Discord bot token
- Pterodactyl API key and URL

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/RMKVF/pterodactyl-manager.git
    cd pterodactyl-manager
    ```

2. Install the required dependencies:

    ```bash
    npm install
    ```

3. Edit the `config.json` file with your configuration:

    ```json
    {
      "prefix": "!",
      "token": "your-discord-bot-token",
      "owner": "owner-id-of-bot",
      "staff": ["user-id-of-person-can-use-manage-user-bot", "id2"],
      "pterodactyl": {
        "api_key": "your-api-key-of-pterodactyl",
        "api_url": "https://example.com"
      },
      "statuses": [
        {
          "text": "with servers",
          "type": "PLAYING"
        },
        {
          "text": "look at the bots",
          "type": "WATCHING"
        }
      ],
      "statusInterval": 10
    }
    ```

4. Edit the `bot-list.json` file with your servers:

    ```json
    [
      {
        "name": "name of the server",
        "server_id": "id of the server in pterodactyl",
        "owner_id": "discord ID of the owner of the server"
      },
      {
        "name": "name of the server",
        "server_id": "id of the server in pterodactyl",
        "owner_id": "discord ID of the owner of the server"
      }
    ]
    ```

5. Start the bot:

    ```bash
    node index.js
    ```

## Commands

### `/manage-user-servers`

- **Description**: Manage servers of a user by their Discord ID.
- **Usage**: `/manage-user-servers user_id:<Discord ID>`

### `/manage-server`

- **Description**: Manage your Pterodactyl servers.
- **Usage**: `/manage-server`

### Additional Commands

You can add more commands by creating new command files in the `commands` directory. Each command file should export a command object with the following structure:

```javascript
module.exports = {
    name: 'command-name',
    description: 'Command description',
    options: [
        // Command options
    ],
    run: async (interaction, client, config) => {
        // Command logic
    }
};
