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

/** SHEET CONSTANTS */
const SHEET_NAME = 'Registrations';
const SHEET_ID = 0;
const REGISTRATION_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

const IMPORT_NAME = 'Import';
const IMPORT_SHEET_ID = 1261031931;
const IMPORT_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(IMPORT_NAME);

// Returns the `Registration` sheet, falling back to the sheet ID if the name is unavailable.
const GET_REGISTRATION_SHEET_ = () => REGISTRATION_SHEET || SpreadsheetApp.getActiveSpreadsheet().getSheetById(SHEET_ID);

// Returns the `Import` sheet, falling back to the sheet ID if the name is unavailable.
const GET_IMPORT_SHEET_ = () => IMPORT_SHEET || SpreadsheetApp.getActiveSpreadsheet().getSheetById(IMPORT_SHEET_ID);

const TIMEZONE = Session.getScriptTimeZone();

/**
 * Maps column names to their respective indices in the `Registration` sheet.
 * Keys must match the post data from the form submission.
 * 
 * @constant {Object<string, number>}
 */
const COL_MAP = {
  submissionTime: 0,
  firstName: 1,
  lastName: 2,
  age: 3,
  gender: 4,
  phoneNumber: 5,
  email: 6,
  emergencyName: 7,
  emergencyPhoneNumber: 8,
  level: 9,
  isMember: 10,
  school: 11,
  signature: 12,
  signatureDate: 13,
  guardianSignature: 14,
  guardianDate: 15,
  paymentMethod: 16,
  comments: 17,
  paymentAmount: 18,
  /** COLUMNS NOT IN POST DATA */
  paymentConfirmed: 19,
  paymentDate: 20,
  emailLog: 21,
}


/**
 * Returns email of current user executing Google Apps Script functions.
 * 
 * Prevents incorrect account executing Google automations (e.g. McRUN bot.)
 * 
 * @return {string}  Email of current user.
 */
const getCurrentUserEmail_ = () => Session.getActiveUser().getEmail();
