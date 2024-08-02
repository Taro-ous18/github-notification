import {
    activeSheet,
    COLUMN,
} from "./constants";
import { createComment, fetchAllOpenPullRequestUrls, fetchPullRequest, fetchPullRequestComments, fetchPullRequestFiles } from "./api";
import { findSlackUserIdByGithubAccount, notify } from "./notification";
import { PullRequest } from "./interfaces";
import { getReviewCommentByDify } from "./dify";

export const executePrReview = async () => {
    console.log('Start executePrReview function');
    const dataOnSheet = activeSheet.getDataRange().getValues();

    for (let i = dataOnSheet.length - 1; i > 0; i--) {
        const pullRequestUrl = dataOnSheet[i][COLUMN.PR_URL];
        const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/;
        const match = (pullRequestUrl as string).match(regex);

        if (match) {
            const prDetails = {
                owner: match[1],
                repository: match[2],
                prNumber: match[3]
            };
            const prFiles = await fetchPullRequestFiles(prDetails);
            const patchesAndUrls = prFiles.map(file => file.patch).join('\n');
            const response = await getReviewCommentByDify(patchesAndUrls);

            await createComment(prDetails, response);
        } else {
            console.error(`Row ${i + 1}: URL is not a valid GitHub pull request URL.`);
        }
    
    }
    console.log('End executePrReview function');

}

export const main = async () => {
    console.log('Start main function');
    const dataTocheckExistingUrls = activeSheet.getDataRange().getValues();
    const existingPRUrlsOnSheet = dataTocheckExistingUrls.map((row) => row[0]);
    const pullRequestUrls = await fetchAllOpenPullRequestUrls();

    await addNewPullRequests(activeSheet, pullRequestUrls, existingPRUrlsOnSheet);
    await processPullRequests(activeSheet);
    console.log('End main function');
}

const addNewPullRequests = async (activeSheet, pullRequestUrls: string[], existingPRUrlsOnSheet: string[]) => {
    await Promise.all(pullRequestUrls.map(async (url: string) => {
        if (existingPRUrlsOnSheet.includes(url) === false) {
            activeSheet.appendRow([url]);
        }
    }));
}

const processPullRequests = async (activeSheet) => {
    const dataOnSheet = activeSheet.getDataRange().getValues();

    for (let i = dataOnSheet.length - 1; i > 0; i--) {
        const pullRequestUrl = dataOnSheet[i][COLUMN.PR_URL];
        const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/;
        const match = (pullRequestUrl as string).match(regex);

        if (match) {
            const prDetails = {
                owner: match[1],
                repository: match[2],
                prNumber: match[3]
            };
            await processSinglePullRequest(dataOnSheet, i, prDetails);
        } else {
            console.error(`Row ${i + 1}: URL is not a valid GitHub pull request URL.`);
        }
    }
}

const processSinglePullRequest = async (dataOnSheet, rowIndex: number, prDetails) => {
    const pullRequest: PullRequest = await fetchPullRequest(prDetails);
    const prUrl = dataOnSheet[rowIndex][COLUMN.PR_URL];
    const authorLogin = dataOnSheet[rowIndex][COLUMN.PR_OWNER] || pullRequest.user.login;
    const lastestFetchedAt = dataOnSheet[rowIndex][COLUMN.FETCHED_AT];

    if (pullRequest.state === 'closed') {
        activeSheet.deleteRow(rowIndex + 1);

        const slackUserId = await findSlackUserIdByGithubAccount(authorLogin);
        notify(slackUserId, 'プルリクエストがクローズされました。', prUrl);
    } else if (!dataOnSheet[rowIndex][COLUMN.PR_OWNER]) {
        activeSheet.getRange(rowIndex + 1, 4).setValue(pullRequest.user.login);
    }

    const comments = await fetchPullRequestComments(prDetails, lastestFetchedAt ? `since=${lastestFetchedAt}` : undefined);
    const exceptedOwnComments = comments.filter(comment => comment.user.login !== authorLogin);

    console.log('exceptedOwnComments', exceptedOwnComments.length);

    let latestComments = dataOnSheet[rowIndex][COLUMN.REVIEW_COMMENT] || 0;

    if (!latestComments) {
        activeSheet.getRange(rowIndex + 1, 2).setValue(0);
    }
    // 日付を更新
    activeSheet.getRange(rowIndex + 1, 3).setValue(new Date().toISOString());

    if (exceptedOwnComments.length !== latestComments) {
        activeSheet.getRange(rowIndex + 1, 2).setValue(latestComments += exceptedOwnComments.length);

        if (exceptedOwnComments.length > 0) {
            const slackUserId = await findSlackUserIdByGithubAccount(authorLogin);
            notify(slackUserId, `新しいコメントが${exceptedOwnComments.length}件あります`, prUrl);
            console.log('新しいコメントがあります');
        }
    }

    const requestedReviewer = pullRequest.requested_reviewers.length > 0 ? pullRequest.requested_reviewers[0].login : '';

    if (requestedReviewer && !dataOnSheet[rowIndex][5]) {
        activeSheet.getRange(rowIndex + 1, 5).setValue(requestedReviewer);
        activeSheet.getRange(rowIndex + 1, 6).setValue(1);
        const slackUserId = await findSlackUserIdByGithubAccount(requestedReviewer);
        notify(slackUserId, 'レビュワーにアサインされました', prUrl);
        console.log('レビュワーにアサインされました');
    }
    // } else if (requestedReviewer && dataOnSheet[rowIndex][5]) {
    //     const slackUserId = await findSlackUserIdByGithubAccount(requestedReviewer);
    //     // notify(slackUserId, 'レビュワーが変更されました', prUrl);
    //     console.log('再度レビュワーにアサインされました');
    // }
}