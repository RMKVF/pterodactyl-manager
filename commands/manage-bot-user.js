const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType } = require('discord.js');
const axios = require('axios');
const ms = require('ms');
const botList = require('../bot-list.json');
const config = require('../config.json');

module.exports = {
    name: 'manage-user-bots',
    description: 'Gérer les bots d\'un utilisateur via son ID',
    options: [
        {
            name: 'user_id',
            description: 'ID de l\'utilisateur dont tu souhaites gérer les serveurs',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    run: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const targetUserId = interaction.options.getString('user_id');

        // Vérifier que l'utilisateur est bien staff/admin/dev
        if (![...config.staff, ...config.admins, ...config.dev].includes(userId)) {
            return interaction.editReply({ content: '🚫 Tu n\'as pas la permission d\'utiliser cette commande.', ephemeral: true });
        }

        // Vérifier les serveurs de l'utilisateur ciblé
        const userServers = botList.filter(bot => bot.owner_ids.includes(targetUserId));

        if (userServers.length === 0) {
            return interaction.editReply({ content: 'Cet utilisateur n\'a aucun serveur.', ephemeral: true });
        }

        // Filtrer les serveurs selon le niveau de staff de celui qui exécute la commande
        const role = config.dev.includes(userId) ? 'dev' : config.admins.includes(userId) ? 'admins' : 'staff';

        const accessibleServers = userServers.filter(server => {
            if (server.staff_access === 'personal') return false; // Pas accessible
            if (server.staff_access === 'staff') return ['staff', 'admins', 'dev'].includes(role);
            if (server.staff_access === 'admins') return ['admins', 'dev'].includes(role);
            if (server.staff_access === 'dev') return ['dev'].includes(role);
            return false;
        });

        if (accessibleServers.length === 0) {
            return interaction.editReply({ content: '🚫 Aucun serveur accessible pour toi sur cet utilisateur.', ephemeral: true });
        }

        const serverStatus = await Promise.all(accessibleServers.map(async bot => {
            try {
                const res = await axios.get(`${config.pterodactyl.url}/api/client/servers/${bot.id}/resources`, {
                    headers: {
                        'Authorization': `Bearer ${config.pterodactyl.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'Application/vnd.pterodactyl.v1+json'
                    }
                });

                const attributes = res.data.attributes;
                return {
                    ...bot,
                    status: attributes.current_state,
                    uptime: attributes.resources.uptime || 0
                };
            } catch (err) {
                return {
                    ...bot,
                    status: 'inconnu',
                    uptime: 0
                };
            }
        }));

        const embed = new EmbedBuilder()
            .setTitle(`🔧 Gestion des serveurs de l'utilisateur ${targetUserId}`)
            .setDescription(`Sélectionne un serveur à gérer`)
            .setColor(0x2f3136)
            .setTimestamp();

        const menuOptions = serverStatus.map(server => ({
            label: server.name,
            description: `Statut: ${server.status}`,
            value: server.id
        }));

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_server_user')
                .setPlaceholder('Choisis un serveur')
                .addOptions(menuOptions)
        );

        await interaction.editReply({ embeds: [embed], components: [selectMenu] });

        const menuCollector = interaction.channel.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 60000 });

        menuCollector.on('collect', async i => {
            if (i.customId === 'select_server_user') {
                const selectedId = i.values[0];
                const server = serverStatus.find(s => s.id === selectedId);

                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('start').setLabel('Démarrer').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('stop').setLabel('Arrêter').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('restart').setLabel('Redémarrer').setStyle(ButtonStyle.Primary)
                );

                const controlEmbed = new EmbedBuilder()
                    .setTitle(`🎮 Contrôle - ${server.name}`)
                    .addFields(
                        { name: '🟢 Statut', value: `\`${server.status}\``, inline: true },
                        { name: '⏱️ Uptime', value: server.status === 'running' ? ms(server.uptime) : 'N/A', inline: true }
                    )
                    .setColor(0x2f3136)
                    .setTimestamp();

                await i.update({ embeds: [controlEmbed], components: [controlRow] });

                const buttonCollector = i.channel.createMessageComponentCollector({ filter: btn => btn.user.id === userId, time: 60000 });

                buttonCollector.on('collect', async btn => {
                    try {
                        await axios.post(`${config.pterodactyl.url}/api/client/servers/${server.id}/power`, {
                            signal: btn.customId
                        }, {
                            headers: {
                                'Authorization': `Bearer ${config.pterodactyl.apiKey}`,
                                'Content-Type': 'application/json',
                                'Accept': 'Application/vnd.pterodactyl.v1+json'
                            }
                        });

                        await btn.reply({ content: `✅ Commande **${btn.customId}** envoyée à \`${server.name}\`.`, ephemeral: true });
                    } catch (error) {
                        console.error(`[ERROR] ${error.message}`);
                        await btn.reply({ content: `❌ Erreur lors de l'envoi de la commande.`, ephemeral: true });
                    }
                });
            }
        });
    }
};
