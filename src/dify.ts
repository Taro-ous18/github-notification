import { DIFY_API_KEY, DIFY_URL, DIFY_USER_NAME } from "./constants"
import { sendMail } from "./mail";
import { deserializeArray, serializeArray } from "./util";

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
    const deserializedResponse = deserializeArray(response.getContentText());

    if (deserializedResponse.data.error !== null) {
        console.log(`Error occured while fetching review comment from Dify: ${deserializedResponse.error}`);
        sendMail('Error occured while fetching review comment from Dify');
    }
    
    return deserializeArray(response.getContentText()).data.outputs.data;
}