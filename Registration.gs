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
 * Returns the last valid row in the `Registration` sheet.
 * 
 * @return {integer}  The last non-empty row in the `Registration` sheet.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */

function getLastRowInReg_() {
  return GET_REGISTRATION_SHEET_().getLastRow();
}


/**
 * Processes a new registration by extracting payment information, verifying payment, 
 * and formatting the registration sheet.
 * 
 * @param {Object} this  Input object with the following properties.
 * @param {integer} this.newRow  The new row added in the `Registration` sheet.
 * @param {Object[]} this.member  The formatted member values added in the `Registration` sheet.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */
function onNewRegistration_({ newRow: row, member: memberArr }) {
  const paymentInfo = extractPaymentInfo_(memberArr);
  checkAndSetPayment(row, paymentInfo);
  formatSpecificColumns();
}


/**
 * Adds a new registration to the `Registration` sheet.
 * 
 * Formats the registration data and appends it to the sheet. Returns the new row and formatted member data.
 * 
 * @param {Object} registrationObj  The registration data to add.
 * @returns {Object}  An object containing the new row and formatted member data.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Aug 26, 2025
 */
function addNewRegistration_(registrationObj) {
  const sheet = GET_REGISTRATION_SHEET_();
  const entries = Object.entries(COL_MAP);

  // 1. Push values to respective index using key-index mapping
  const formatted = entries.reduce((acc, [key, i]) => {
    acc[i] = format(key);
    return acc;
  }, new Array(entries.length));

  // 2a. Set formatted values in registration sheet
  const newRow = getLastRowInReg_() + 1;
  sheet.getRange(newRow, 1, 1, formatted.length).setValues([formatted]);

  // 2b. Add verification formula for McRUN membership
  setMemberCheckFormula(newRow);

  // 3. Return GSheet row and values for payment
  Logger.log(`Set following values in Registrations (row ${newRow}): ${formatted}`);
  return { newRow, member: formatted };

  /** Helper functions */
  function format(key) {
    if (key === 'submissionTime') {
      return formatTimestamp(registrationObj?.[key]);
    }
    else if (key === 'paymentAmount') {
      return validatePaymentAmount(key);
    }
    const val = registrationObj?.[key] ?? '';   // Prevent storing undefined
    return (typeof val === "string" ? val.trim() : val);
  }

  function formatTimestamp(raw) {
    const timestamp = new Date(raw);
    return Utilities.formatDate(timestamp, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  }

  // Stripe amount may differ due to coupons
  function validatePaymentAmount(key) {
    return registrationObj?.['stripeAmount'] || registrationObj?.[key];
  }

  // Add formula in `Verify if Member` col
  function setMemberCheckFormula(row) {
    const isMemberCheckCell = sheet.getRange(row, COL_MAP.isMemberVerified + 1);  // 0-indexed to 1-indexed
    isMemberCheckCell.setFormula(isMemberCheckFormula);
  }
}


/**
 * Extracts payment information from a member array.
 * 
 * @param {Object[]} memberArr  The array of member data.
 * @returns {Member}  A Member object containing the payment information.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */
function extractPaymentInfo_(memberArr) {
  const getValue = (index) => memberArr[index];

  // Get individual names, then construct full name
  const firstName = getValue(COL_MAP.firstName);
  const lastName = getValue(COL_MAP.lastName);

  return {
    fName: firstName,
    lName: lastName,
    fullName: `${firstName} ${lastName}`,
    email: getValue(COL_MAP.email),
    paymentMethod: getValue(COL_MAP.paymentMethod),
  };
}

/** Helper Function */
function extractFromSheet_(row) {
  const sheet = GET_REGISTRATION_SHEET_();
  const memberArr = sheet.getSheetValues(row, 1, 1, -1)[0];
  return extractPaymentInfo_(memberArr);
}


function test() {
  //addTriggerForNewRegistration_(4);
  //createPostTemplate();

  //checkAndSetPayment(130);
  //processThisImport(122);

  function createPostTemplate() {
    const keys = Object.keys(COL_MAP);
    const str = keys.reduce((acc, key) => {
      acc += `"${key}" : "",\n`;
      return acc;
    }, "");

    console.log(str);
  }

  function createTestObj_(row) {
    const val = GET_REGISTRATION_SHEET_().getSheetValues(row, 1, 1, 19)[0];
    const entries = Object.entries(COL_MAP);

    const obj = entries.reduce((acc, [key, i]) => {
      if (i < val.length) {
        acc[key] = val[i];
      }
      return acc;
    }, {});

    console.log(obj);
    return obj;
  }
}