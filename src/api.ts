import { BASE_URL, mappingSheet, OWNER } from "./constants";
import { PullRequest } from "./interfaces";



const getToken = (): string => {
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');

    if (!token) {
        console.error('Token is not set, please set it in the script properties from project settings.');
        return;
    }
    return token;
}

const fetchPullRequest = async (endpoint: string, queryParams?: string) => {
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

export const fetchPullRequestComments = async (pullRequest, queryParams?) => {
    const endpoint = `repos/${pullRequest.owner}/${pullRequest.repository}/pulls/${pullRequest.prNumber}/comments`;

    return fetchPullRequest(endpoint, queryParams);
};

export const fetchPullRequestDetails = async (pullRequest) => {
    const endpoint = `repos/${pullRequest.owner}/${pullRequest.repository}/pulls/${pullRequest.prNumber}`;

    return fetchPullRequest(endpoint);
};

export const getFileList = async (pullRequest) => {
    const endpoint = `repos/${pullRequest.owner}/${pullRequest.repository}/pulls/${pullRequest.prNumber}/files`;

    return fetchPullRequest(endpoint);
}

export const fetchAllOpenPullRequests = async () => {
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

export const createComment = async (pullRequest, body) => {
    const endpoint = `repos/${pullRequest.owner}/${pullRequest.repository}/issues/${pullRequest.prNumber}/comments`;
    const token = getToken();
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'post' as GoogleAppsScript.URL_Fetch.HttpMethod,
        'headers': {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        'payload': JSON.stringify({
            body: body
        })
    };

    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(`${BASE_URL}${endpoint}`, options);

    return response.getResponseCode();
}