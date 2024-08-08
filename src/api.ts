import { BASE_URL, DIFY_API_KEY, DIFY_URL, DIFY_USER_NAME, mappingSheet, OWNER } from "./constants";
import { PullRequest, PullRequestMeta } from "./interfaces";
import { sendMail } from "./mail";
import { deserializeArray, serializeArray } from "./util";

const getToken = (): string => {
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');

    if (!token) {
        console.error('Token is not set, please set it in the script properties from project settings.');
        return;
    }
    return token;
}

const postRequest = async (endpoint: string, payload: object) => {
    const token = getToken();
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'post' as GoogleAppsScript.URL_Fetch.HttpMethod,
        'headers': {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        'payload': JSON.stringify(payload)
    };

    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(`${BASE_URL}${endpoint}`, options);

    return JSON.parse(response.getContentText());
}

const getRequest = async (endpoint: string, queryParams?: string) => {
    const token = getToken();
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'get' as GoogleAppsScript.URL_Fetch.HttpMethod,
        'headers': {
            'Authorization': `Bearer ${token}`,
        }
    };

    const requestUrl = `${BASE_URL}${endpoint}${queryParams ? `?${queryParams}` : ''}`;
    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(requestUrl, options);
    
    return JSON.parse(response.getContentText());
};

const patchRequest = async (endpoint: string, payload: object) => {
    const token = getToken();
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'patch' as GoogleAppsScript.URL_Fetch.HttpMethod,
        'headers': {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        'payload': JSON.stringify(payload)
    };

    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(`${BASE_URL}${endpoint}`, options);

    return JSON.parse(response.getContentText());
}

const deleteRequest = async (endpoint: string) => {
    const token = getToken();
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'delete' as GoogleAppsScript.URL_Fetch.HttpMethod,
        'headers': {
            'Authorization': `Bearer ${token}`,
        }
    };

    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(`${BASE_URL}${endpoint}`, options);

    return response.getResponseCode();
}


/**
 * API DOC 
 * https://docs.github.com/ja/rest/pulls/comments?apiVersion=2022-11-28#list-review-comments-on-a-pull-request
 */
export const fetchPullRequestComments = async (pullRequest: PullRequestMeta, queryParams?) => {
    return getRequest(`repos/${pullRequest.owner}/${pullRequest.repository}/pulls/${pullRequest.number}/comments`, queryParams);
};

export const fetchPullRequest = async (pullRequest: PullRequestMeta) => {
    return getRequest(`repos/${pullRequest.owner}/${pullRequest.repository}/pulls/${pullRequest.number}`);
};

export const fetchPullRequestFiles = async (pullRequest: PullRequestMeta) => {
    return getRequest(`repos/${pullRequest.owner}/${pullRequest.repository}/pulls/${pullRequest.number}/files`);
}

export const createComment = async (pullRequest, body) => {
    const payload = {
        'body': body
    }
    return postRequest(`repos/${pullRequest.owner}/${pullRequest.repository}/issues/${pullRequest.number}/comments`, payload);
}

export const updateComment = async (pullRequest, commentId, body) => {
    const payload = {
        'body': body
    }
    return patchRequest(`repos/${pullRequest.owner}/${pullRequest.repository}/issues/comments/${commentId}`, payload);
}

export const fetchAllOpenPullRequestUrls = async () => {
    const repositoriesString = PropertiesService.getScriptProperties().getProperty('REPOSITORIES');
    const repositories = repositoriesString.split(',');

    const owner = OWNER;
    const targetAccounts = mappingSheet.getRange(1, 1, mappingSheet.getLastRow(), 1).getValues();
    const accountNames = targetAccounts.map(row => row[0]);
    const allFilteredPullRequests: PullRequest[] = [];
    const token = getToken();

    for (const repo of repositories) {
        try {
            const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
                'method': 'get' as GoogleAppsScript.URL_Fetch.HttpMethod,
                'headers': {
                    'Authorization': `Bearer ${token}`,
                }
            }
            const requestUrl = `${BASE_URL}repos/${owner}/${repo}/pulls?state=open`;
            const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(requestUrl, options);
            const openPullRequests = JSON.parse(response.getContentText()) as PullRequest[];
            const filteredPullRequestsByTargetAccounts = openPullRequests.filter(pr => accountNames.includes(pr.user.login));
            allFilteredPullRequests.push(...filteredPullRequestsByTargetAccounts);
        } catch (error) {
            console.error(`Error fetching PRs for repository ${repo}:`, error);
        }
    }

    const pullReuqestUrls: string[] = [];

    allFilteredPullRequests.map(pr => {
        const url = pr.html_url;
        pullReuqestUrls.push(url);
    });

    return pullReuqestUrls;
};


/**
 * This function is used to get the review comment from Dify
 */
export const getReviewCommentByDify = (payload) => {
	const payloadString = serializeArray(payload);
	const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
		'method': 'post' as GoogleAppsScript.URL_Fetch.HttpMethod,
		'headers': {
			'Authorization': `Bearer ${DIFY_API_KEY}`,
			'Content-Type': 'application/json',
		},
		'payload': JSON.stringify({
			'inputs': {
				'patch': payloadString
			},
			'response_mode': 'blocking',
			'user': DIFY_USER_NAME
		})
	}

	const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(DIFY_URL, options);
	const responseCode = response.getResponseCode();

	if (responseCode === 400) {
		sendMail(`Invalid request to Dify. status code: ${responseCode}`);
		return;
	}

	if (responseCode >= 500 && responseCode <= 504) {
		sendMail(`An error occurred on the Dify side. status code: ${responseCode}`);
		return;
	}

	const deserializedResponse = deserializeArray(response.getContentText());

	if (deserializedResponse.data.error !== null) {
		sendMail(`Error occured while fetching review comment from Dify: ${deserializedResponse.error}`);
	}

	return deserializeArray(response.getContentText()).data.outputs.data;
}