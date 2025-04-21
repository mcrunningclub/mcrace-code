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

// SHEET CONSTANTS
const SHEET_NAME = 'Registrations';
const SHEET_ID = 0;
const REGISTRATION_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

// BACKUP USING SHEET ID
const GET_REGISTRATION_SHEET_ = () => {
  return (REGISTRATION_SHEET) ?? SpreadsheetApp.getActiveSpreadsheet().getSheetById(SHEET_ID);
}

const TIMEZONE = getUserTimeZone_();

/** KEYS MUST MATCH POST DATA FROM FILLOUT WITH SHEET COL */
const COL_MAP = {
  submissionTime : 0,
  firstName : 1,
  lastName : 2,
  age : 3,
  gender : 4,
  phoneNumber : 5,
  email : 6,
  emergencyName : 7,
  emergencyPhoneNumber : 8,
  level : 9,
  isMember : 10,
  school : 11,
  signature : 12,
  signatureDate : 13,
  guardianSignature : 14,
  guardianDate : 15,
  paymentMethod : 16,
  comments : 17,
  paymentAmount : 18,
  
  /** COLUMNS NOT IN POST DATA */
  paymentConfirmed : 19,
  paymentDate : 20,
  emailLog : 21,
}


/**
 * Returns timezone for currently running script.
 *
 * Prevents incorrect time formatting during time changes like Daylight Savings Time.
 *
 * @return {string}  Timezone as geographical location (e.g.`'America/Montreal'`).
 */

function getUserTimeZone_() {
  return Session.getScriptTimeZone();
}

