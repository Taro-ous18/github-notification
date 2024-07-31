const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

export const activeSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("シート1");
export const mappingSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("シート2");

export const BASE_URL = 'https://api.github.com/';
export const OWNER = PropertiesService.getScriptProperties().getProperty('OWNER');

//　シートのカラム定義
export const COLUMN = {
    PR_URL: 0,
    REVIEW_COMMENT: 1,
    FETCHED_AT: 2,
    PR_OWNER: 3,
    PR_REVIEWER:4
}

export const SUB_SHEET_COLUMN = {
    GITHUB_ACCOUNT: 0,
    SLACK_USER_ID: 1
}