/*
Copyright 2025 Andrey Gonzalez (for McGill Students Running Club)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Creates custom menu to run frequently used scripts in Google App Script.
 *
 * Extracting function name using `name` property to allow for refactoring.
 *
 * @trigger Open Google Spreadsheet.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 21, 2025
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🏃‍♂️ McRace Menu')
    .addItem('📢  Click for help...', helpUI_.name)
    .addSeparator()

    .addSubMenu(ui.createMenu('Import Menu')
      .addItem('Process Import w/ Trigger', addImportTriggerUI_.name)
    )

    .addSubMenu(ui.createMenu('Registrations Menu')
      .addItem('Prettify Sheet', prettifySheetUI_.name)
      .addItem('Verify Payment', verifyPaymentUI_.name)
    )
    .addToUi();
}


/**
 * Displays a help message for the custom McRUN menu.
 */

function helpUI_() {
  const ui = SpreadsheetApp.getUi();

  const helpMessage = `
    📋 McRace Registration Menu Help

    - Scripts are applied to this sheet.

    - Please contact the admin if you need assistance.
  `;

  // Display the help message
  ui.alert("McRace Menu Help", helpMessage.trim(), ui.ButtonSet.OK);
}


/**
 * Boiler plate function to display custom UI to user.
 *
 * Executes function `functionName` with optional argument `funcArg`.
 *
 * @trigger User choice in custom menu.
 *
 * @param {string}  functionName  Name of function to execute.
 * @param {string}  [additionalMsg=""]  Custom message for executing function.
 *                                      Defaults to empty string.
 * @param {string}  [funcArg=""]  Function argument to pass with `functionName`.
 *                                Defaults to empty string.
 *
 * @return {string}  Return value of the executed function.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 21, 2025
 */

function confirmAndRunUserChoice_(functionName, additionalMsg = "", funcArg = "") {
  const ui = SpreadsheetApp.getUi();
  const userEmail = getCurrentUserEmail_();

  // Continue execution if user is authorized
  var message = `
    ⚙️ Now executing ${functionName}().

    🚨 Press cancel to stop.
  `;

  // Append additional message if non-empty
  message += additionalMsg ? `\n🔔 ${additionalMsg}` : "";

  // Save user response
  const response = ui.alert(message, ui.ButtonSet.OK_CANCEL);
  let retValue = "";

  if (response == ui.Button.OK) {
    // Execute function `functionName` (with arg if non-empty)
    retValue = funcArg ? this[functionName](funcArg) : this[functionName]();
  }
  else {
    ui.alert('Execution cancelled...');
  }

  // Log attempt in console using active user email
  Logger.log(`McRUN menu access attempt by: ${userEmail}`);

  // Return value from executed function if required
  return retValue;
}


/**
 * Helper functions to prompt user for row, and process response
 */

function requestRowInput_() {
  const ui = SpreadsheetApp.getUi();
  const headerMsg = "Which row do you want to target?";
  const textMsg = "Enter the row number, or leave empty for the last row.";

  const response = ui.prompt(headerMsg, textMsg, ui.ButtonSet.OK);
  const responseText = response.getResponseText().trim();

  return processRowInput_(responseText, ui);
}


/**
 * Returns result of reponse processing for row input.
 *
 * Helper function for UI functions for McRUN menu.
 *
 * @param {string} userResponse  User response text from `SpreadsheetApp.getUi().prompt`
 * @param {GoogleAppsScript.Base.Ui} ui  User interface in Google Sheets
 * @return {Result} `Result`  Packaged result of processing.
 * 
 * ### Properties of Return Object
 * - ```Result.row {integer}``` — Parsed integer value of `userResponse`.
 * 
 * - ```Result.msg {string}``` — Custom message to display to the user.
 * 
 * ### Metadata
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 24, 2025
 * @update  Mar 24, 2025
 */

function processRowInput_(userResponse, ui) {
  const rowNumber = Number.parseInt(userResponse);
  const returnObj = { row: null, msg: '' };

  if (userResponse === "") {
    // User did not enter a row number; check last row only.
    returnObj.row = '';
    returnObj.msg = "This will only target the last row.";
  }
  else if (isValidRow_(rowNumber)) {
    // Row is valid, can continue execution.
    returnObj.row = rowNumber;
    returnObj.msg = `This will only target row ${rowNumber}.`
  }
  else {
    // Input value is invalid row. Stop execution.
    ui.alert("Incorrect row number, please try again with a valid row number.");
  }

  return returnObj;
}


/**
 * Returns true if row is int and found in registration sheet.
 *
 * Helper function for UI functions for McRUN menu.
 *
 * @param {number}  The row number in sheet 1-indexed.
 * @return {boolean}  Returns true if valid row in sheet.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>) & ChatGPT
 * @date  Dec 6, 2024
 * @update  Apr 21, 2025
 */

function isValidRow_(row) {
  const sheet = GET_REGISTRATION_SHEET_();
  const lastRow = sheet.getLastRow();
  const rowInt = parseInt(row);

  return (Number.isInteger(rowInt) && rowInt >= 0 && rowInt <= lastRow);
}


/** IMPORT MENU FUNCTIONS */

function addImportTriggerUI_() {
  const result = requestRowInput_();  // {row : int, msg : string}
  const selectedRow = result.row;

  // Assemble notification message
  const firstMsg = "↪️ Preparing to import row from 'Import'...";
  const fullMsg = (result.msg ? `${result.msg}\n\n` : '') + firstMsg;

  // Execute Function with row input
  const functionName = addTriggerForNewRegistration_.name;
  confirmAndRunUserChoice_(functionName, fullMsg, selectedRow);
}

/** REGISTRATIONS MENU FUNCTIONS */

function prettifySheetUI_() {
  const functionName = formatSpecificColumns.name;
  const customMsg = "This will update the sheet's view"
  confirmAndRunUserChoice_(functionName, customMsg);
}

function verifyPaymentUI_() {
  const result = requestRowInput_();  // {row : int, msg : string}
  const selectedRow = result.row;

  // Assemble notification message
  const firstMsg = "↪️ Verifying payment status...";
  const fullMsg = (result.msg ? `${result.msg}\n\n` : '') + firstMsg;

  // Execute Function with row input
  const functionName = checkAndSetPayment.name;
  confirmAndRunUserChoice_(functionName, fullMsg, selectedRow);
}
