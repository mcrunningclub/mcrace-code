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


function doPost(e) {
  const contents = e.postData.contents;
  const { newRow : row, member : member } = appendNewRegistration_(contents);
  
  const isPaid = checkAndSetPayment_(row, member);
  const fullName = `${member.firstName} ${member.lastName}`;
  notifyPaymentStatus_(isPaid, fullName);

  formatSpecificColumns();
}


function getLastRow_() {
  return GET_REGISTRATION_SHEET_().getLastRow();
}


function appendNewRegistration_(postData) {
  const sheet = GET_REGISTRATION_SHEET_();
  const entries = Object.entries(COL_MAP);

  // Push values to respective index using key-index mapping
  const formatted = entries.reduce((acc, [key, i]) => {
    acc[i] = format(key);
    return acc;
  }, new Array(entries.length));

  // Set formatted values in sheet
  const newRow = getLastRow_() + 1;
  const numCol = formatted.length;
  sheet.getRange(newRow, 1, 1, numCol).setValues([formatted]);

  // Return GSheet row and values for payment
  return { newRow : newRow, member : formatted };

  /** Helper functions */
  function format(key) {
    if (key === 'submissionTime') {
      return formatTimestamp(postData?.[key]);
    }
    const val = postData?.[key] ?? '';   // Prevent storing undefined
    return (typeof val === "string" ? val.trim() : val);
  }

  function formatTimestamp(raw) {
    const timestamp = new Date(raw);
    return Utilities.formatDate(timestamp,TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  }
}


function checkAndSetPayment_(row = getLastRow_(), info) {
  // Get values from info or from sheet, and concatenate full name
  info = info ? extractFromObj() : extractFromSheet()
  
  // Find member transaction using packaged info (name, payment method, ...)
  const isPaid = checkPayment_(info);
  if (isPaid) { setFeePaid_(row) };

  // Return true if member paid
  return isPaid;

  /** Helper Functions */
  function extractFromObj() {
    return {
      fName : info.firstName, 
      lName : info.lastName, 
      email : info.email, 
      paymentMethod : info.paymentMethod,
    }
  }

  function extractFromSheet() {
    const sheet = GET_REGISTRATION_SHEET_();
    info = sheet.getSheetValues(row, 1, 1, -1)[0];

    const getInfo = (index) => info[index];

    return {
      fName : getInfo(COL_MAP.firstName), 
      lName : getInfo(COL_MAP.lastName), 
      email : getInfo(COL_MAP.email), 
      paymentMethod : getInfo(COL_MAP.paymentMethod),
    }
  }
}


function notifyPaymentStatus_(isPaid, fullName) {
  if (isPaid) {
    console.log(`Successfully found transaction email for ${fullName}!`);  // Log success message;
  }
  else {
    // Notify McRUN of missing payment
    notifyUnidentifiedPayment_(fullName);  
    console.error(`Unable to find payment confirmation email for ${fullName}. Please verify again.`);
  }
}


/**
 * Returns normalize str without accents.
 * 
 * @param {string} str  String to normalize.
 * @return {string}  Stripped str.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 5, 2025
 */

function removeDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  //const contents = createTestObj_(8);
  checkAndSetPayment_(9, null);
  
  //const {newRow : row, fullName : name} = appendNewRegistration_(contents);
}
