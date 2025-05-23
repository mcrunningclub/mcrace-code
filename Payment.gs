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

/**
 * @typedef {Object} Member
 * @property {string} firstName - The member's first name.
 * @property {string} lastName - The member's last name.
 * @property {string} email - The member's email address.
 * @property {string} paymentMethod - The payment method used by the member.
 */


/**
 * Checks the payment status for a member based on their payment method.
 * 
 * If the payment method includes "CC", it checks online payments (e.g., Zeffy or Stripe).
 * If the payment method includes "Interac", it checks Interac payments.
 * 
 * @param {Member} member  The member's information.
 * @returns {boolean}  True if the payment is found, otherwise false.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Oct 1, 2023
 * @update  Apr 23, 2025
 */
function checkPayment_({ fName, lName, email, paymentMethod }) {
  if (paymentMethod.includes('CC')) {
    return checkOnlinePayment_({ firstName: fName, lastName: lName, email: email });
  }
  else if (paymentMethod.includes('Interac')) {
    return checkInteracPayment_({ firstName: fName, lastName: lName });
  }

  return false;
}


/**
 * Checks for online payments (e.g., Zeffy or Stripe) for a member.
 * 
 * Searches for matching payment emails using the member's information.
 * 
 * @param {Member} member  The member's information.
 * @returns {boolean}  True if a matching payment email is found, otherwise false.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Oct 1, 2023
 * @update  Apr 23, 2025
 */
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
 * Checks for online payments (e.g., Zeffy or Stripe) for a member.
 * 
 * Searches for matching payment emails using the member's information.
 * 
 * @param {Member} member  The member's information.
 * @returns {boolean}  True if a matching payment email is found, otherwise false.
 * 
 * @trigger  New member registration.
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
 * Updates a member's fee information in the registration sheet.
 * 
 * Marks the payment as confirmed and sets the payment date to the current date.
 * 
 * @param {integer} row  The row index to update in the registration sheet.
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
 * Creates search terms for regex matching using a member's information.
 * 
 * Handles hyphenated last names and removes diacritics for better matching.
 * 
 * @param {Member} member  The member's information.
 * @returns {string[]}  An array of search terms for regex matching.
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


// /**
//  * Represents a member with their payment and contact information.
//  */
// class Member {
//   /**
//    * Creates a new Member instance.
//    * 
//    * @param {string} firstName - The member's first name.
//    * @param {string} lastName - The member's last name.
//    * @param {string} email - The member's email address.
//    * @param {string} paymentMethod - The payment method used by the member.
//    */
//   constructor(firstName, lastName, email, paymentMethod) {
//     this.firstName = firstName;
//     this.lastName = lastName;
//     this.email = email;
//     this.paymentMethod = paymentMethod;
//   }

//   /**
//    * Generates search terms for regex matching using the member's information.
//    * 
//    * @returns {string[]} An array of search terms for regex matching.
//    */
//   createSearchTerms() {
//     const lastNameHyphenated = this.lastName.replace(/[-\s]/, '[-\\s]?'); // Handle hyphenated last names
//     const fullName = `${this.firstName}\\s+${lastNameHyphenated}`;

//     return [
//       fullName,
//       removeDiacritics_(fullName),
//       this.email,
//     ].filter(Boolean); // Removes undefined, null, or empty strings
//   }
// }

// const member = new Member('John', 'Doe', 'john.doe@example.com', 'CC');
// const searchTerms = member.createSearchTerms();
// console.log(searchTerms);