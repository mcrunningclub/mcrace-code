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
 * Creates a custom menu to run frequently used scripts in Google Apps Script.
 *
 * The menu includes options for importing data, formatting sheets, and verifying payments.
 * Function names are extracted dynamically using the `name` property to allow for easier refactoring.
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
 *
 * The help message provides guidance on how to use the menu options and contact information for assistance.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  May 23, 2025
 */

function helpUI_() {
  const ui = SpreadsheetApp.getUi();

  const helpMessage = `
    📋 McRace Registration Menu Help

    - Scripts are applied to this sheet.

    - Please contact the admin if you need assistance.
  `;

  // Display the help message
  ui.alert('McRace Menu Help', helpMessage.trim(), ui.ButtonSet.OK);
}


/** 
 * Displays a confirmation dialog and executes a user-selected function.
 *
 * This function is used to confirm user actions before executing a specific function.
 * It dynamically calls the specified function by its name and passes an optional argument.
 *
 * @trigger User choice in custom menu.
 *
 * @param {string} functionName  The name of the function to execute.
 * @param {string} [additionalMsg=""]  A custom message to display during execution.
 *                                     Defaults to empty string.
 * @param {string} [funcArg=""]  An optional argument to pass to the function.
 *                               Defaults to empty string.
 *
 * @return {string}  Return value of the executed function.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  May 23, 2025
 */

function confirmAndRunUserChoice_(functionName, additionalMsg = '', funcArg = '') {
  const ui = SpreadsheetApp.getUi();
  const userEmail = getCurrentUserEmail_();

   // Continue execution if user is authorized
  let message = `⚙️ Now executing ${functionName}().\n\n🚨 Press cancel to stop.`;
  if (additionalMsg) message += `\n🔔 ${additionalMsg}`;

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
 * Prompts the user to input a row number and processes the response.
 *
 * This function is used to get user input for targeting a specific row in the sheet.
 *
 * @returns {Object} An object containing the row number and a message.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 24, 2025
 * @update  May 23, 2025
 */

function requestRowInput_() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Which row do you want to target?', 
    'Enter the row number, or leave empty for the last row.', ui.ButtonSet.OK);
  const responseText = response.getResponseText().trim();
  return processRowInput_(responseText, ui);
}


/**
 * Processes the user's row input and returns the result.
 *
 * This function validates the user's input and determines the row to target.
 *
 * @param {string} userResponse  User response text from `SpreadsheetApp.getUi().prompt`
 * @param {GoogleAppsScript.Base.Ui} ui  User interface in Google Sheets
 * @return {Object}  An object containing the parsed row number and a message.
 * 
 * ### Properties of Return Object
 * - ```Result.row {integer}``` — Parsed integer value of `userResponse`.
 * 
 * - ```Result.msg {string}``` — Custom message to display to the user.
 * 
 * ### Metadata
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 24, 2025
 * @update  May 23, 2025
 */

function processRowInput_(userResponse, ui) {
  const rowNumber = Number.parseInt(userResponse);
  if (userResponse === '') {
    // User did not enter a row number; check last row only.
    return { row: '', msg: 'This will only target the last row.' };
  } else if (isValidRow_(rowNumber)) {
    // Row is valid, can continue execution.
    return { row: rowNumber, msg: `This will only target row ${rowNumber}.` };
  } else {
    // Input value is invalid row. Stop execution.
    ui.alert('Incorrect row number, please try again with a valid row number.');
    return { row: null, msg: '' };
  }
}


/**
 * Validates if the given row number exists in the registration sheet.
 *
 * @param {integer} row   The row number to validate.
 * @returns {boolean}  True if the row is valid, otherwise false.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>) & ChatGPT
 * @date  Dec 6, 2024
 * @update  May 23, 2025
 */

function isValidRow_(row) {
  const sheet = GET_REGISTRATION_SHEET_();
  const lastRow = sheet.getLastRow();
  return Number.isInteger(row) && row > 0 && row <= lastRow;
}


/** IMPORT MENU FUNCTIONS */

/**
 * Adds a trigger to process a specific row from the import sheet.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */

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

/**
 * Prettifies the registration sheet by applying formatting rules.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 21, 2025
 */
function prettifySheetUI_() {
  const functionName = formatSpecificColumns.name;
  const customMsg = "This will update the sheet's view"
  confirmAndRunUserChoice_(functionName, customMsg);
}

/**
 * Verifies the payment status for a specific row in the registration sheet.
 *
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date Apr 21, 2025
 * @update Apr 21, 2025
 */
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
