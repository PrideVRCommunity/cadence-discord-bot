import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { REST, RouteLike, Routes, SlashCommandBuilder } from 'discord.js';
import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import loggerModule from '../services/logger';
import { SystemOptions } from '../types/configTypes';
const systemOptions: SystemOptions = config.get('systemOptions');

const executionId = uuidv4();

const logger = loggerModule.child({
    source: 'deploySlashCommands.js',
    module: 'deploy',
    name: 'deploySlashCommands',
    executionId: executionId
});

const slashCommands: SlashCommandBuilder[] = [];
const systemCommands: SlashCommandBuilder[] = [];
const commandFolders = fs.readdirSync(path.resolve('./dist/commands'));
for (const folder of commandFolders) {
    const commandFiles = fs
        .readdirSync(path.resolve(`./dist/commands/${folder}`))
        .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
        /* eslint-disable @typescript-eslint/no-var-requires */
        const command = require(`../commands/${folder}/${file}`);
        command.isSystemCommand
            ? systemCommands.push(command.data.toJSON())
            : slashCommands.push(command.data.toJSON());
    }
}

if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN environment variable is not set.');
}

if (!process.env.DISCORD_APPLICATION_ID) {
    throw new Error('DISCORD_APPLICATION_ID environment variable is not set.');
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    if (!process.env.DISCORD_APPLICATION_ID || !process.env.DISCORD_BOT_TOKEN) {
        logger.error(
            'Missing required environment variables for deployment.\nPlease provide valid DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in .env file.'
        );
    }

    try {
        logger.debug(`Bot user slash commands found: ${slashCommands.map((command) => `/${command.name}`).join(', ')}`);

        logger.info('Started refreshing user slash commands.');
        await refreshCommands(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID!), slashCommands);
        logger.info('Successfully refreshed user slash commands.');
    } catch (error) {
        logger.error(error, 'Failed to refresh user slash commands.');
    }

    try {
        logger.debug(
            `Bot system slash commands found: ${systemCommands
                .map((systemCommand) => `/${systemCommand.name}`)
                .join(', ')}`
        );

        logger.info('Started refreshing system slash commands.');
        const systemGuildIds = systemOptions.systemGuildIds;
        await Promise.all(
            systemGuildIds.map((systemGuildId: string) => {
                logger.debug(`Refreshing system slash command for guild id '${systemGuildId}'.`);
                refreshCommands(
                    Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID!, systemGuildId),
                    systemCommands
                );
            })
        );
        logger.info('Successfully refreshed system slash commands.');
    } catch (error) {
        logger.error(
            error,
            "Failed to refresh system slash commands. Make sure the bot is in the system guilds specified in 'systemOptions'."
        );
    }
})();

async function refreshCommands(route: RouteLike, commands: object[]) {
    await rest.put(route, { body: commands });
}
