const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('./config.json');
const botList = require('./bot-list.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
});

client.commands = new Collection();
const previousStatus = {};
let statusMessages = [];

client.once('ready', async () => {
    console.log(chalk.greenBright(`[BOT] ${client.user.tag} est en ligne !`));

    // Statut personnalisé
    client.user.setPresence({ status: config.presence || 'online' });

    let currentStatusIndex = 0;
    const updateBotStatus = () => {
        const status = config.statuses[currentStatusIndex];
        if (status) {
            client.user.setActivity(status.text, { type: ActivityType[status.type] });
            currentStatusIndex = (currentStatusIndex + 1) % config.statuses.length;
        }
    };
    updateBotStatus();
    setInterval(updateBotStatus, config.refreshInterval);

    // Chargement des commandes
    let commands = [];
    const loadCommands = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const stat = fs.lstatSync(path.join(dir, file));
            if (stat.isDirectory()) {
                loadCommands(path.join(dir, file));
            } else if (file.endsWith('.js')) {
                const command = require(path.join(dir, file));
                if (command && command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(chalk.green(`[COMMANDE] Chargée : ${command.data.name}`));
                }
            }
        }
    };
    loadCommands(path.join(__dirname, 'commands'));

    await client.application.commands.set(commands);
    console.log(chalk.greenBright(`[SUCCESS] Toutes les commandes sont chargées avec succès !`));

    // Start monitoring
    monitorServers();
    setInterval(monitorServers, config.refreshInterval);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(chalk.red(`[ERREUR] Lors de l'exécution de la commande : ${error}`));
        if (!interaction.replied) {
            await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
        }
    }
});

async function monitorServers() {
    console.log(chalk.blue('\n========== Statuts Check | Start ==========\n'));

    const channel = await client.channels.fetch(config.channelId);
    if (!channel) {
        console.error(chalk.red(`[ERREUR] Impossible de trouver le salon avec l'ID : ${config.channelId}`));
        return;
    }

    const chunks = [];
    let currentChunk = [];

    for (let i = 0; i < botList.length; i++) {
        const server = botList[i];
        try {
            const res = await axios.get(`${config.pterodactyl.url}/api/client/servers/${server.id}/resources`, {
                headers: {
                    'Authorization': `Bearer ${config.pterodactyl.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'Application/vnd.pterodactyl.v1+json'
                }
            });

            const attributes = res.data.attributes;
            const status = attributes.current_state;
            const cpu = attributes.resources.cpu_absolute.toFixed(2);
            const memory = Math.floor(attributes.resources.memory_bytes / 1024 / 1024);
            const disk = Math.floor(attributes.resources.disk_bytes / 1024 / 1024);

            console.log(`Serveur ${server.name} : ${previousStatus[server.id] || 'inconnu'} > ${status}`);

            // Check status change
            if (previousStatus[server.id] && previousStatus[server.id] !== status) {
                for (const ownerId of server.owner_ids) {
                    try {
                        const user = await client.users.fetch(ownerId);
                        const notificationEmbed = new EmbedBuilder()
                            .setTitle('🔔 Changement de statut')
                            .setDescription(`Le serveur **${server.name}** a changé de statut.`)
                            .addFields(
                                { name: 'Ancien statut', value: `\`${previousStatus[server.id]}\``, inline: true },
                                { name: 'Nouveau statut', value: `\`${status}\``, inline: true }
                            )
                            .setColor(status === 'running' ? 0x00FF00 : status === 'offline' ? 0xFF0000 : 0xFFA500)
                            .setTimestamp();
                        await user.send({ embeds: [notificationEmbed] });
                        console.log(chalk.green(`[INFO] Notification envoyée à ${user.tag} pour ${server.name}`));
                    } catch (err) {
                        console.error(chalk.red(`[ERREUR] Impossible d'envoyer un DM à ${ownerId}: ${err.message}`));
                    }
                }
            }

            previousStatus[server.id] = status;

            const statusEmoji = status === 'running' ? '🟢' : status === 'offline' ? '🔴' : '🟡';
            const field = {
                name: server.name,
                value: `${statusEmoji} **Statut** : \`${status}\`\n💾 **CPU** : \`${cpu}%\`\n📀 **RAM** : \`${memory} MB\`\n🗄️ **Disque** : \`${disk} MB\``,
                inline: true
            };

            currentChunk.push(field);

            if (currentChunk.length === 10 || i === botList.length - 1) {
                chunks.push(currentChunk);
                currentChunk = [];
            }

        } catch (error) {
            console.error(chalk.red(`[ERREUR] Serveur ${server.name} : ${error.message}`));
        }
    }

    // Update or send embed(s)
    for (let i = 0; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Statut des serveurs')
            .setColor(0x2f3136)
            .addFields(chunks[i])
            .setTimestamp();

        if (!statusMessages[i]) {
            statusMessages[i] = await channel.send({ embeds: [embed] });
        } else {
            await statusMessages[i].edit({ embeds: [embed] });
        }
    }

    console.log(chalk.blue('\n========== Statuts Check | Stop ==========\n'));
}

client.login(config.token);
