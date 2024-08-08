export interface NotifyParams {
    slackUserId: string | null;
    message: string;
    pullRequestUrl: string;
}