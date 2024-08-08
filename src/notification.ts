import { mappingSheet, SUB_SHEET_COLUMN } from "./constants";
import { NotifyParams } from "./interfaces";

export const notify = (params: NotifyParams) => {
    const slackWebhookUrl = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');

    if (!slackWebhookUrl) {
        console.error('Webhook URL is not set, please set it in the script properties from project settings.');
        return;
    }

    const mention = params.slackUserId ? `<@${params.slackUserId}>` : '';
    const message = `${mention} ${params.message} \n${params.pullRequestUrl}\n`;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post' as GoogleAppsScript.URL_Fetch.HttpMethod,
        contentType: 'application/json',
        payload: JSON.stringify({
            text: message
        })
    };

    try {
        const response = UrlFetchApp.fetch(slackWebhookUrl, options);
        const responseCode = response.getResponseCode();

        if (responseCode !== 200) {
            console.error(`Failed to send notification to Slack. HTTP response code: ${responseCode}`);
        }
    } catch (error) {
        console.error(`Error occured while sending notification to slack: ${error}`);
    }
}

export const findSlackUserIdByGithubAccount = async (githubAccount: string) => {
    if (!mappingSheet) {
        console.error('Sheet not found');
        return;
    }

    const dataRange = mappingSheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length === 1) {
        console.error('No data found on the sheet.');
        return;
    }

    for (let i = 1; i < values.length; i++) {
        if (values[i][SUB_SHEET_COLUMN.GITHUB_ACCOUNT] === githubAccount) {
            const slackUserId = values[i][SUB_SHEET_COLUMN.SLACK_USER_ID]; // target slack user id

            if (isValidSlackUserId(slackUserId)) {
                return slackUserId;
            } else {
                console.error(`Invalid Slack User ID found for GitHub account: ${githubAccount}`);
                return;
            }
        }
    }
}

const isValidSlackUserId = (slackUserId: string): boolean => {
    const slackUserIdPattern = /^U[A-Z0-9]{10}$/;

    return slackUserIdPattern.test(slackUserId);
}