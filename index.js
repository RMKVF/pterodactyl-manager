const { Client, Collection, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const axios = require('axios');
const config = require('./config.json');
const fs = require('fs');
const path = require('path');

const nat2k15 = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping
    ],
    partials: [Partials.Channel]
});

nat2k15.prefix = config.prefix;
nat2k15.commands = new Collection();

nat2k15.once('ready', async () => {
    const chalk = (await import('chalk')).default;
    let commands = [];

    const loadCommands = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const stat = fs.lstatSync(path.join(dir, file));
            if (stat.isDirectory()) {
                loadCommands(path.join(dir, file));
            } else if (file.endsWith('.js')) {
                const command = require(path.join(dir, file));
                if (command) {
                    nat2k15.commands.set(command.name, command);
                    commands.push({
                        name: command.name,
                        description: command.description,
                        options: command.options || []
                    });
                    console.log(chalk.green(`[COMMAND] Loaded: ${command.name}`));
                }
            }
        }
    };

    loadCommands(path.join(__dirname, 'commands'));

    await nat2k15.application.commands.set(commands);

    console.log(chalk.green(`[SUCCESS] Application commands have been successfully loaded!`));

    // Function to change the bot's status
    let currentStatus = 0;
    const changeStatus = () => {
        const status = config.statuses[currentStatus];
        nat2k15.user.setActivity(status.text, { type: ActivityType[status.type] });
        currentStatus = (currentStatus + 1) % config.statuses.length;
    };

    // Set the initial status
    changeStatus();

    // Convert statusInterval from seconds to milliseconds and change the status every X seconds
    const statusIntervalMs = config.statusInterval * 1000;
    setInterval(changeStatus, statusIntervalMs);

    console.log(chalk.green(`[SUCCESS] ${nat2k15.user.tag} is now online!`));

    // Send a private message to the owner when the bot comes online
    try {
        const owner = await nat2k15.users.fetch(config.owner);
        await owner.send('The bot is now online.');
        console.log(chalk.green(`[SUCCESS] Message sent to the owner (${owner.tag}).`));
    } catch (error) {
        console.error(chalk.red(`[ERROR] Unable to send a private message to the owner: ${error.message}`));
    }
});

nat2k15.on('interactionCreate', async (interaction) => {
    const chalk = (await import('chalk')).default;
    if (interaction.isCommand()) {
        const command = nat2k15.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.run(interaction, nat2k15, config);
        } catch (error) {
            console.log(chalk.red(`[ERROR] ${error.stack}`));
            await interaction.reply({ content: 'There was an error while executing this command!' });
        }
    }
});

nat2k15.login(config.token);
