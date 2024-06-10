let tokenClient;
let gapiInited = false;
let gisInited = false;
let sheetId;

/**
 * 初始化 Google Sheets API 客户端
 */
function initializeGoogleSheetsAPI(clientId, apiKey, callback) {
  const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

  /**
   * Callback after api.js is loaded.
   */
  function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
  }

  /**
   * Callback after the API client is loaded. Loads the
   * discovery doc to initialize the API.
   */
  async function initializeGapiClient() {
    await gapi.client.init({
      apiKey: apiKey,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
  }

  /**
   * Callback after Google Identity Services are loaded.
   */
  function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: callback,
    });
    gisInited = true;
    maybeEnableButtons();
  }

  /**
   * Enables user interaction after all libraries are loaded.
   */
  function maybeEnableButtons() {
    if (gapiInited && gisInited) {
      // Authorization buttons can be shown here
    }
  }

  // 加载 Google API 客户端库和 Google Identity Services
  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.onload = gapiLoaded;
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://accounts.google.com/gsi/client';
  script2.onload = gisLoaded;
  document.body.appendChild(script2);
}

/**
 * Handle sign-in and token refresh
 */
function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw (resp);
    }
    if (window.authCallback) {
      window.authCallback();
    }
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

/**
 * Handle sign-out
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken('');
    });
  }
}

/**
 * Get sheetId
 */
async function getSheetId(spreadsheetId, sheetTitle) {
  const response = await gapi.client.sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId,
  });

  const sheet = response.result.sheets.find(s => s.properties.title === sheetTitle);
  return sheet.properties.sheetId;
}

/**
 * List data from the Google Sheets
 */
async function listMajors(spreadsheetId, range) {
  let response;
  try {
    response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });
  } catch (err) {
    console.error(err.message);
    return [];
  }
  const rangeData = response.result;
  if (!rangeData || !rangeData.values || rangeData.values.length == 0) {
    console.log('No values found.');
    return [];
  }
  return rangeData.values;
}

/**
 * Add a new row to the spreadsheet
 */
async function addRow(spreadsheetId, range, values) {
  const body = {
    values: values
  };

  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: body
    });
    console.log(`${response.result.updates.updatedCells} cells appended.`);
  } catch (err) {
    console.error(err.message);
  }
}

/**
 * Delete a row from the spreadsheet
 */
async function deleteRow(spreadsheetId, sheetId, rowIndex) {
  const requests = [{
    deleteDimension: {
      range: {
        sheetId: sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex,
        endIndex: rowIndex + 1
      }
    }
  }];

  try {
    const response = await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: requests
      }
    });
    console.log(`${response.result.replies.length} row deleted.`);
  } catch (err) {
    console.error(err.message);
  }
}

async function getSheetId(spreadsheetId, sheetName) {
    let response;
    try {
      response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });
      const sheet = response.result.sheets.find(sheet => sheet.properties.title === sheetName);
      return sheet ? sheet.properties.sheetId : null;
    } catch (err) {
      console.error(err.message);
      return null;
    }
  }

/**
 * Update a specific cell in the spreadsheet
 */
async function updateCell(spreadsheetId, sheetId, cell, value) {
  const requests = [{
    updateCells: {
      range: {
        sheetId: sheetId,
        startRowIndex: cell.row,
        endRowIndex: cell.row + 1,
        startColumnIndex: cell.col,
        endColumnIndex: cell.col + 1
      },
      rows: [{
        values: [{
          userEnteredValue: { stringValue: value }
        }]
      }],
      fields: 'userEnteredValue'
    }
  }];

  try {
    const response = await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: requests
      }
    });
    console.log(`${response.result.replies.length} cell updated.`);
  } catch (err) {
    console.error(err.message);
  }
}

  
