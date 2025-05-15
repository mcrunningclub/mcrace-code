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

const CLUB_EMAIL = 'mcrunningclub@ssmu.ca';
const INTERNAL_EMAIL = 'mcrunningclubinternal@ssmu.ca';

/** SENDER INFORMATION */
const ZEFFY_EMAIL = 'contact@zeffy.com';
const INTERAC_EMAIL = 'interac.ca';    // Interac email addresses end in "interac.ca"
const STRIPE_EMAIL = 'stripe.com';


// Helper function for Interac and Zeffy cases
function checkPayment_({ fName, lName, email, paymentMethod }) {
  if (paymentMethod.includes('CC')) {
    return checkOnlinePayment_({ firstName: fName, lastName: lName, email: email });
  }
  else if (paymentMethod.includes('Interac')) {
    return checkInteracPayment_({ firstName: fName, lastName: lName });
  }

  return false;
}


function checkOnlinePayment_(member) {
  const sender = `${ZEFFY_EMAIL} OR ${STRIPE_EMAIL}`;
  const maxMatches = 3;
  const threads = getMatchingPayments_(sender, maxMatches);

  // Generate search terms
  const searchTerms = createSearchTerms_(member);

  // Return true if email matching member found
  return threads.some(thread => processOnlineThread_(thread, searchTerms));
}


/**
 * Look for new emails from Interac starting yesterday (cannot search from same day) and extract ref number.
 * 
 * @trigger  New member registration.
 * @error  Send notification email to McRUN if no ref number found.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Oct 1, 2023
 * @update  Apr 23, 2025
 */

function checkInteracPayment_(member) {
  const sender = INTERAC_EMAIL;
  const maxMatches = 10;
  const threads = getMatchingPayments_(sender, maxMatches);

  // Get search terms for email
  const searchTerms = createSearchTerms_(member);

  // Most Interac email threads only have 1 message, so O(n) instead of O(n**2). Coded as safeguard.
  // Exits for first returned true
  return threads.some(thread => processInteracThreads_(thread, searchTerms));
}


/**
 * Updates member's fee information.
 * 
 * @param {number} Row index to enter information.
 * @param {string} listItem  The list item in `Internal Fee Collection` to set in 'Collection Person' col.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Oct 1, 2023
 * @update  Apr 21, 2025
 */

function setFeePaid_(row) {
  const sheet = REGISTRATION_SHEET;
  const currentDate = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');

  // Get 1-index for GSheet using column map
  const IS_PAID_COL = COL_MAP.paymentConfirmed + 1;
  const PAYMENT_DATE_COL = COL_MAP.paymentDate + 1;
  
  sheet.getRange(row, IS_PAID_COL).setValue(true).insertCheckboxes();
  sheet.getRange(row, PAYMENT_DATE_COL).setValue(currentDate);
}


/**
 * Creates search terms for regex using member information.
 * 
 * Matches lastName whether hyphenated or not.
 * 
 * @param {Object}  Member information.
 * @param {string} member.firstName  Member's first name.
 * @param {string} member.lastName  Member's last name.
 * @param {string} [member.email]  Member's email address (if applicable).
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 21, 2025
 * @update  Apr 21, 2025
 */

function createSearchTerms_(member) {
  const lastNameHyphenated = (member.lastName).replace(/[-\s]/, '[-\\s]?'); // handle hyphenated last names
  const fullName = `${member.firstName}\\s+${lastNameHyphenated}`;

  const searchTerms = [
    fullName,
    removeDiacritics_(fullName),
    member.email,
  ].filter(Boolean); // Removes undefined, null, or empty strings

  return searchTerms;
}

