import config from 'config';
import { EmbedOptions } from '../../types/configTypes';
const embedOptions: EmbedOptions = config.get('embedOptions');
import { notInVoiceChannel, notInSameVoiceChannel } from '../../utils/validation/voiceChannelValidator';
import{ SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import loggerModule from '../../services/logger';

module.exports = {
    isNew: false,
    isBeta: false,
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Clear the track queue and remove the bot from voice channel.')
        .setDMPermission(false)
        .setNSFW(false),
    execute: async ({ interaction, executionId }) => {
        const logger = loggerModule.child({
            source: 'leave.js',
            module: 'slashCommand',
            name: '/leave',
            executionId: executionId,
            shardId: interaction.guild.shardId,
            guildId: interaction.guild.id
        });

        if (await notInVoiceChannel({ interaction, executionId })) {
            return;
        }

        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            logger.debug('There is already no queue.');

            logger.debug('Responding with warning embed.');
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `**${embedOptions.icons.warning} Oops!**\n_Hmm.._ It seems I am not in a voice channel!`
                        )
                        .setColor(embedOptions.colors.warning)
                ]
            });
        }

        if (await notInSameVoiceChannel({ interaction, queue, executionId })) {
            return;
        }

        if (!queue.deleted) {
            queue.delete();
            logger.debug('Deleted the queue.');
        }

        logger.debug('Responding with success embed.');
        return await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: interaction.member.nickname || interaction.user.username,
                        iconURL: interaction.user.avatarURL()
                    })
                    .setDescription(
                        `**${embedOptions.icons.success} Leaving channel**\nCleared the track queue and left voice channel.\n\nTo play more music, use the **\`/play\`** command!`
                    )
                    .setColor(embedOptions.colors.success)
            ]
        });
    }
};
