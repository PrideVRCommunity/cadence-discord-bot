import loggerModule from '../../services/logger';

export const getUptimeFormatted = async ({ executionId }) => {
    const logger = loggerModule.child({
        source: 'getUptimeFormatted.js',
        module: 'utilSystem',
        name: 'getUptimeFormatted',
        executionId: executionId
    });

    try {
        let uptimeFormattedString = '';

        const uptimeInSeconds = process.uptime();
        const uptimeDate = new Date(0);
        uptimeDate.setSeconds(uptimeInSeconds.toFixed(0));
        uptimeFormattedString = `${
            uptimeDate.getUTCDate() - 1
        }d ${uptimeDate.getUTCHours()}h ${uptimeDate.getUTCMinutes()}m ${uptimeDate.getUTCSeconds()}s`;

        return uptimeFormattedString;
    } catch (error) {
        logger.error('Error retrieving or transforming uptime to formatted string.', error);
        throw error;
    }
};
