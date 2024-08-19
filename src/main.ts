import {
	activeSheet,
	COLUMN,
} from "./constants";
import {
	createComment,
	fetchAllOpenPullRequestUrls,
	fetchPullRequest,
	fetchPullRequestComments,
	fetchPullRequestFiles,
	getReviewCommentByDify
} from "./api";
import {
	findSlackUserIdByGithubAccount,
	notify
} from "./notification";
import {
	NotifyParams,
	PullRequest,
	PullRequestComment,
	PullRequestMeta
} from "./interfaces";
import {
	getOwnerEmailAddress,
	sendMail
} from "./mail";

/**
 * 変更差分を要約してプルリクエスト上にコメントを追加する
 */
export const executePrReview = async () => {
	try {
		const dataOnSheet = activeSheet.getDataRange().getValues();

		for (let i = dataOnSheet.length - 1; i > 0; i--) {
			if (dataOnSheet[i][5]) {
				continue;
			}
			const pullRequestUrl = dataOnSheet[i][COLUMN.PR_URL];
			const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/;
			const match = (pullRequestUrl as string).match(regex);

			if (!match) {
				continue;
			}

			const prMeta: PullRequestMeta = {
				owner: match[1],
				repository: match[2],
				number: match[3]
			};

			const prFiles = await fetchPullRequestFiles(prMeta);
			const patches = prFiles.map(file => file.patch).join('\n');
			const response = await getReviewCommentByDify(patches);

			const createdComment = await createComment(prMeta, response.text);

			if (createdComment) {
				activeSheet.getRange(i + 1, 6).setValue(createdComment.id);

				const params = {
					slackUserId: null,
					message: 'Difyによって、要約・レビューされました。',
					pullRequestUrl: `${pullRequestUrl}#issuecomment-${createdComment.id}`
				}

				notify(params);
			} else {
				console.error(`Failed to create comment on PR: ${pullRequestUrl}`);
			}
		}
	} catch (error) {
		const ownerEmailAddress = getOwnerEmailAddress();
		const subject = '[Error] [Github-notification] Error occured while processing PR review';
		const body = `Error occured while processing PR review: ${error}`;
		sendMail(subject, body, ownerEmailAddress);
	}
}

/**
 *　コンフリクトを検知して通知する
 */
export const inspectMergeConflict = async () => {
	try {
		const data = activeSheet.getDataRange().getValues();

		for (let i = 1; i < data.length; i++) {
			const pullRequestUrl = data[i][COLUMN.PR_URL];
			const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/;
			const match = (pullRequestUrl as string).match(regex);

			if (!match) {
				continue;
			}

			const prMeta: PullRequestMeta = {
				owner: match[1],
				repository: match[2],
				number: match[3]
			};

			const pr = await fetchPullRequest(prMeta);

			if (pr.mergeable === false) {
				const slackUserId = await findSlackUserIdByGithubAccount(pr.user.login);

				const params = {
					slackUserId: slackUserId,
					message: 'コンフリクトを解消してください',
					pullRequestUrl: pullRequestUrl
				}

				notify(params);
			}
		}
	} catch (error) {
		const ownerEmailAddress = getOwnerEmailAddress();
		const subject = '[Error] [Github-notification] Error occured while inspecting merge conflict';
		const body = `Error occured while inspecting merge conflict: ${error}`;
		sendMail(subject, body, ownerEmailAddress);
	}
}

/**
 * レビュワーからのコメントを検知してSlackに通知する
 */
export const main = async () => {
	try {
		const dataTocheckExistingUrls = activeSheet.getDataRange().offset(1, 0, activeSheet.getLastRow() - 1).getValues();
		const existingPRUrlsOnSheet = dataTocheckExistingUrls.map((row) => row[0]);
		const pullRequestUrls = await fetchAllOpenPullRequestUrls();

		await addNewPullRequests(pullRequestUrls, existingPRUrlsOnSheet);
		await processPullRequests();
	} catch (error) {
		console.error(`Error occured while processing pull requests: ${error}`);

		const ownerEmailAddress = getOwnerEmailAddress();
		const subject = '[Error] [Github-notification] Error occured while processing pull requests';
		const body = `Error occured while processing pull requests: ${error}`;

		sendMail(subject, body, ownerEmailAddress);
	}
}

/**
 * シート状のプルリクURLと取得したプルリクURLを比較して新しいプルリクがあれば追加する
 */
const addNewPullRequests = async (pullRequestUrls: string[], existingPRUrlsOnSheet: string[]) => {
	await Promise.all(pullRequestUrls.map(async (url: string) => {
		if (!existingPRUrlsOnSheet.includes(url)) {
			activeSheet.appendRow([url]);
		}
	}));
}

const processPullRequests = async () => {
	const dataOnSheet = activeSheet.getDataRange().getValues();

	for (let i = dataOnSheet.length - 1; i > 0; i--) {
		const pullRequestUrl = dataOnSheet[i][COLUMN.PR_URL];
		const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/;
		const match = (pullRequestUrl as string).match(regex);

		if (!match) {
			console.error(`Row ${i + 1}: URL is not a valid GitHub pull request URL.`);
		}

		const prMeta: PullRequestMeta = {
			owner: match[1],
			repository: match[2],
			number: match[3]
		};

		await processSinglePullRequest(dataOnSheet, i, prMeta);
	}
}

const processSinglePullRequest = async (dataOnSheet, rowIndex: number, prDetails) => {
	const pullRequest: PullRequest = await fetchPullRequest(prDetails);
	const prUrl = dataOnSheet[rowIndex][COLUMN.PR_URL];
	const authorLogin = dataOnSheet[rowIndex][COLUMN.PR_OWNER] || pullRequest.user.login;
	const lastestFetchedAt = dataOnSheet[rowIndex][COLUMN.FETCHED_AT];

	// マージorクローズされたプルリクはシートから削除して通知する
	if (pullRequest.merged === true) {
		activeSheet.deleteRow(rowIndex + 1);

		const slackUserId = await findSlackUserIdByGithubAccount(authorLogin);
		const params: NotifyParams = {
			slackUserId: slackUserId,
			message: `${pullRequest.base.ref}ブランチに${pullRequest.head.ref}ブランチがマージされました。`,
			pullRequestUrl: prUrl
		}

		notify(params);
		return;
	} else if (pullRequest.state === 'closed') {
		activeSheet.deleteRow(rowIndex + 1);

		const slackUserId = await findSlackUserIdByGithubAccount(authorLogin);

		const params: NotifyParams = {
			slackUserId: slackUserId,
			message: 'プルリクエストがクローズされました。',
			pullRequestUrl: prUrl
		}

		notify(params);
		return;
	}

	if (!dataOnSheet[rowIndex][COLUMN.PR_OWNER]){
		activeSheet.getRange(rowIndex + 1, COLUMN.PR_OWNER + 1).setValue(authorLogin);
	}

	// レビュワー欄が空の場合、レビュワーをシートに書き込む
	if (!dataOnSheet[rowIndex][COLUMN.PR_REVIEWER] && pullRequest.requested_reviewers.length > 0) {
		console.log('yobareat');
		activeSheet.getRange(rowIndex + 1, COLUMN.PR_REVIEWER + 1).setValue(pullRequest.requested_reviewers[0].login);
		
		const params = {
			slackUserId: await findSlackUserIdByGithubAccount(pullRequest.requested_reviewers[0].login),
			message: 'レビュワーにアサインされました。',
			pullRequestUrl: prUrl
		}

		notify(params);
	}

	if (pullRequest.requested_reviewers.length === 0) {
		activeSheet.getRange(rowIndex + 1, COLUMN.PR_REVIEWER + 1).setValue('');
		console.log('レビュワーなし');
	}

	const comments: PullRequestComment[] = await fetchPullRequestComments(prDetails, lastestFetchedAt ? `since=${lastestFetchedAt}` : undefined);
	const newCommentDetails = comments.map(comment => ({ id: comment.id, user: comment.user.login }));

	const existingCommentDetails = dataOnSheet[rowIndex][COLUMN.REVIEW_COMMENT] ? JSON.parse(dataOnSheet[rowIndex][COLUMN.REVIEW_COMMENT]) : [];
	const addedCommentDetails = newCommentDetails.filter(detail => !existingCommentDetails.some(existing => existing.id === detail.id));

	if (addedCommentDetails.length > 0) {
		const updatedCommentDetails = [...existingCommentDetails, ...addedCommentDetails];
		activeSheet.getRange(rowIndex + 1, COLUMN.REVIEW_COMMENT + 1).setValue(JSON.stringify(updatedCommentDetails));
	}

	await Promise.all(comments.map(async (comment: PullRequestComment) => {
		if (existingCommentDetails.some(c => c.id === comment.id)) {
			return;
		}

		if (comment.hasOwnProperty('in_reply_to_id')) {
			const parentComment = existingCommentDetails.find(c => c.id === comment.in_reply_to_id);
			console.log('parentComment', parentComment);

			if (parentComment) {
				const params: NotifyParams = {
					slackUserId: await findSlackUserIdByGithubAccount(parentComment.user),
					message: 'コメントに返信があります。',
					pullRequestUrl: comment.html_url
				};
				notify(params);
			}
		} else {
			const params: NotifyParams = {
				slackUserId: await findSlackUserIdByGithubAccount(authorLogin),
				message: '新しいコメントがあります。',
				pullRequestUrl: prUrl
			};
			notify(params);
		}
	}));
	// // 日付を更新
	activeSheet.getRange(rowIndex + 1, 3).setValue(new Date().toISOString());
}