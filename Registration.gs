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
 * Returns last valid row in `Registration`.
 * 
 * @return Last non-empty row.
 */
function getLastRowInReg_() {
  return GET_REGISTRATION_SHEET_().getLastRow();
}

/**
 * Functions to apply on new registrations.
 *
 * @param {object} this Input obj with following properties.
 * @param {integer} this.row  New added row in `Registrations`.
 * @param {object} this.member  Formatted member values added in `Registrations`.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */

function onNewRegistration_({ newRow : row, member : memberArr }) {
  const paymentInfo = extractPaymentInfo_(memberArr);
  checkAndSetPayment(row, paymentInfo);
  formatSpecificColumns();
}


function addNewRegistration_(registrationObj) {
  const sheet = GET_REGISTRATION_SHEET_();
  const entries = Object.entries(COL_MAP);

  // Push values to respective index using key-index mapping
  const formatted = entries.reduce((acc, [key, i]) => {
    acc[i] = format(key);
    return acc;
  }, new Array(entries.length));

  // Set formatted values in registration sheet
  const newRow = getLastRowInReg_() + 1;
  const numCol = formatted.length;
  sheet.getRange(newRow, 1, 1, numCol).setValues([formatted]);

  // Return GSheet row and values for payment
  Logger.log(`Set following values in Registrations (row ${newRow}): ${formatted}`);
  return { newRow : newRow, member : formatted };

  /** Helper functions */
  function format(key) {
    if (key === 'submissionTime') {
      return formatTimestamp(registrationObj?.[key]);
    }
    const val = registrationObj?.[key] ?? '';   // Prevent storing undefined
    return (typeof val === "string" ? val.trim() : val);
  }

  function formatTimestamp(raw) {
    const timestamp = new Date(raw);
    return Utilities.formatDate(timestamp,TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  }
}

/** Helper Function */
function extractPaymentInfo_(memberArr) {
  const getValue = (index) => memberArr[index];

  // Get individual names, then construct full name
  const firstName = getValue(COL_MAP.firstName);
  const lastName = getValue(COL_MAP.lastName);

  return {
    fName : firstName,
    lName : lastName,
    fullName : `${firstName} ${lastName}`,
    email : getValue(COL_MAP.email),
    paymentMethod : getValue(COL_MAP.paymentMethod),
  };
}


function checkAndSetPayment(row = getLastRowInReg_(), feeDetails) {
  // Get values from info or from sheet, and concatenate full name
  feeDetails = feeDetails ?? extractFromSheet();
  
  // Find member transaction using packaged info (name, payment method, ...)
  const isFound = checkPayment_(feeDetails);
  if (isFound) { 
    setFeePaid_(row);
    console.log(`Successfully found transaction email for ${feeDetails.fullName}!`);  // Log success message;
  }
  else {
    // 1) Create a scheduled trigger to recheck email inbox
    // 2) After max tries, send an email notification to McRUN for missing payment
    console.error(`Unable to find payment confirmation for '${feeDetails.fullName}'. Creating new scheduled trigger to check later.`);
    createNewFeeTrigger_(row, feeDetails);
  }

  return isFound;

  /** Helper Function */
  function extractFromSheet() {
    const sheet = GET_REGISTRATION_SHEET_();
    memberArr = sheet.getSheetValues(row, 1, 1, -1)[0];
    return extractPaymentInfo_(memberArr);
  }
}


/**
 * Returns a packaged obj to use as test.
 */

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


function test() {
  //addTriggerForNewRegistration_(4);
  //createPostTemplate();

  function createPostTemplate() {
    const keys = Object.keys(COL_MAP);
    const str = keys.reduce((acc, key) => {
      acc += `"${key}" : "",\n`;
      return acc;
    }, "");

    console.log(str);
  }

  const emailBody =
  `
  Cannot find the payment notification for member: Bob Burger
  
  Please manually check the inbox and update registration as required.

  If email not found, please notify member of outstanding member fee.
        
  Automatic email created by 'McRace Code' in '${SHEET_NAME}' sheet.
  `

  console.log(emailBody.replace(/[ \t]{2,}/g, ''));

  
  //const dataStr = GET_IMPORT_SHEET_().getSheetValues(1, 1, 1, -1)[0];  //createTestObj_(8);
  //const ret = addNewRegistration_(JSON.parse(dataStr));
}
