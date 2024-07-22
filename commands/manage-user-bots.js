const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType } = require('discord.js');
const serverList = require('../server-list.json');
const ms = require('ms');

module.exports = {
    name: 'manage-user-servers',
    description: 'Manage a user\'s servers by ID',
    options: [
        {
            name: 'user_id',
            type: ApplicationCommandOptionType.String,
            description: 'ID of the user whose servers you want to manage',
            required: true
        }
    ],
    run: async (interaction, client, config) => {
        const userId = interaction.user.id;
        const targetUserId = interaction.options.getString('user_id');

        // Check if the user is the owner or a staff member
        if (userId !== config.owner && !config.staff.includes(userId)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const userServers = serverList.filter(server => server.owner_id === targetUserId);

        if (userServers.length === 0) {
            return interaction.editReply({ content: 'This user has no servers associated with their account.', ephemeral: true });
        }

        const serverStatus = await Promise.all(userServers.map(async server => {
            const apiUrl = `${config.pterodactyl.api_url}/api/client/servers/${server.server_id}/resources`;
            const headers = {
                'Authorization': `Bearer ${config.pterodactyl.api_key}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            };

            try {
                const response = await axios.get(apiUrl, { headers });
                if (response.data && response.data.attributes) {
                    const { current_state: status, resources } = response.data.attributes;
                    const uptime = resources.uptime || 0; // uptime in milliseconds
                    return { ...server, status, uptime };
                } else {
                    console.error(`[ERROR] Unexpected response format: ${JSON.stringify(response.data)}`);
                    return { ...server, status: 'Unknown', uptime: 0 };
                }
            } catch (error) {
                console.error(`[ERROR] ${error.response ? JSON.stringify(error.response.data) : error.message}`);
                return { ...server, status: 'Unknown', uptime: 0 };
            }
        }));

        const embed = new EmbedBuilder()
            .setTitle(`Manage Servers of User ${targetUserId}`)
            .setDescription('Select a server to manage')
            .setTimestamp();

        serverStatus.forEach(server => {
            const statusText = server.status === 'running' ? ':green_square:' : ':red_square:';
            const uptimeText = server.status === 'running' ? `Online for ${ms(server.uptime)}` : 'Offline';
            embed.addFields({ name: server.name, value: `Status: ${statusText}\n${uptimeText}`, inline: true });
        });

        const serverOptions = serverStatus.map(server => ({
            label: server.name,
            description: `Status: ${server.status === 'running' ? 'On' : 'Off'}`,
            value: server.server_id
        }));

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select-user-server')
                .setPlaceholder('Select a server')
                .addOptions(serverOptions)
        );

        await interaction.editReply({ embeds: [embed], components: [selectMenu] });

        const filter = i => i.customId === 'select-user-server' && i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (!i.deferred && !i.replied) {
                await i.deferUpdate();
            }

            const selectedServerId = i.values[0];
            const selectedServer = serverStatus.find(server => server.server_id === selectedServerId);

            const controlButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start-user-server')
                    .setLabel('Start')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('stop-user-server')
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('restart-user-server')
                    .setLabel('Restart')
                    .setStyle(ButtonStyle.Primary)
            );

            const serverControlEmbed = new EmbedBuilder()
                .setTitle(`Manage ${selectedServer.name}`)
                .addFields({ name: 'Current Status', value: selectedServer.status === 'running' ? ':green_square:' : ':red_square:', inline: true })
                .addFields({ name: 'Online for', value: selectedServer.status === 'running' ? ms(selectedServer.uptime) : 'Offline', inline: true })
                .setTimestamp();

            await i.editReply({ embeds: [serverControlEmbed], components: [controlButtons] });

            const controlFilter = btn => ['start-user-server', 'stop-user-server', 'restart-user-server'].includes(btn.customId) && btn.user.id === userId;
            const controlCollector = interaction.channel.createMessageComponentCollector({ controlFilter, time: 60000 });

            controlCollector.on('collect', async btn => {
                try {
                    if (!btn.deferred && !btn.replied) {
                        await btn.deferUpdate();
                    }

                    let action;
                    switch (btn.customId) {
                        case 'start-user-server':
                            action = 'start';
                            break;
                        case 'stop-user-server':
                            action = 'stop';
                            break;
                        case 'restart-user-server':
                            action = 'restart';
                            break;
                    }

                    console.log(`[INFO] Command ${action} for the server ${selectedServer.name}`);

                    const apiUrl = `${config.pterodactyl.api_url}/api/client/servers/${selectedServer.server_id}/power`;
                    const headers = {
                        'Authorization': `Bearer ${config.pterodactyl.api_key}`,
                        'Content-Type': 'application/json',
                        'Accept': 'Application/vnd.pterodactyl.v1+json'
                    };

                    try {
                        await axios.post(apiUrl, { signal: action }, { headers });
                        await btn.followUp({ content: `Command ${action} sent to the server ${selectedServer.name}.`, ephemeral: true });
                    } catch (error) {
                        console.error(`[ERROR] ${error.response ? JSON.stringify(error.response.data) : error.message}`);
                        await btn.followUp({ content: `Error sending the ${action} command to the server.`, ephemeral: true });
                    }
                } catch (error) {
                    console.error(`[ERROR] ${error.message}`);
                }
            });
        });
    }
};
