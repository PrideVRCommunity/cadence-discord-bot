import { GuildQueue, Track, useQueue } from 'discord-player';
import { EmbedBuilder, MessageComponentInteraction } from 'discord.js';
import { BaseComponentInteraction } from '../../classes/interactions';
import { BaseComponentParams, BaseComponentReturnType } from '../../types/interactionTypes';
import { checkQueueCurrentTrack, checkQueueExists } from '../../utils/validation/queueValidator';
import { checkInVoiceChannel, checkSameVoiceChannel } from '../../utils/validation/voiceChannelValidator';
import { TFunction } from 'i18next';
import { useServerTranslator } from '../../common/localeUtil';
import { formatRepeatModeDetailed } from '../../common/formattingUtils';

class ActionSkipButton extends BaseComponentInteraction {
    constructor() {
        super('action-skip-button');
    }

    async execute(params: BaseComponentParams): BaseComponentReturnType {
        const { executionId, interaction, referenceId } = params;
        const logger = this.getLogger(this.name, executionId, interaction);
        const translator = useServerTranslator(interaction);

        const queue: GuildQueue = useQueue(interaction.guild!.id)!;

        await this.runValidators({ interaction, queue, executionId }, [
            checkInVoiceChannel,
            checkSameVoiceChannel,
            checkQueueExists,
            checkQueueCurrentTrack
        ]);

        if (!queue || (queue.tracks.data.length === 0 && !queue.currentTrack)) {
            return await this.handleNoQueue(interaction);
        }

        if (queue.currentTrack!.id !== referenceId) {
            return await this.handleAlreadySkipped(interaction);
        }

        const skippedTrack: Track = queue.currentTrack!;
        queue.node.skip();
        logger.debug('Skipped the track.');

        logger.debug('Responding with success embed.');
        return await this.handleSuccess(interaction, skippedTrack, queue, translator);
    }

    private async handleNoQueue(interaction: MessageComponentInteraction) {
        return await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `**${this.embedOptions.icons.warning} Oops!**\nThere is nothing currently playing. First add some tracks with **\`/play\`**!`
                    )
                    .setColor(this.embedOptions.colors.warning)
            ],
            components: []
        });
    }

    private async handleAlreadySkipped(interaction: MessageComponentInteraction) {
        return await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `**${this.embedOptions.icons.warning} Oops!**\nThis track has already been skipped or is no longer playing.`
                    )
                    .setColor(this.embedOptions.colors.warning)
            ],
            components: []
        });
    }

    private async handleSuccess(
        interaction: MessageComponentInteraction,
        skippedTrack: Track,
        queue: GuildQueue,
        translator: TFunction
    ) {
        const successEmbed = new EmbedBuilder()
            .setAuthor(this.getEmbedUserAuthor(interaction))
            .setDescription(
                `**${this.embedOptions.icons.skipped} Skipped track**\n` +
                    `${this.getDisplayTrackDurationAndUrl(skippedTrack, translator)}\n\n` +
                    `${formatRepeatModeDetailed(queue.repeatMode, this.embedOptions, translator, 'success')}`
            )
            .setThumbnail(skippedTrack.thumbnail)
            .setColor(this.embedOptions.colors.success);

        return await interaction.editReply({
            embeds: [successEmbed],
            components: []
        });
    }
}

export default new ActionSkipButton();
