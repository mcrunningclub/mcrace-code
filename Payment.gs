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

/** SENDER INFORMATION AND MAILBOX LABELS */
const ZEFFY_EMAIL = 'contact@zeffy.com';
const INTERAC_EMAIL = 'interac.ca';    // Interac email addresses end in "interac.ca"

const ZEFFY_LABEL = 'Fee Payments/Zeffy Emails';
const INTERAC_LABEL = 'Fee Payments/Interac Emails';


// Helper function for Interac and Zeffy cases
function checkPayment_({ fName, lName, email, paymentMethod }) {
  if (paymentMethod.includes('CC')) {
    return checkZeffyPayment_({ firstName: fName, lastName: lName, email: email });
  }
  else if (paymentMethod.includes('Interac')) {
    return checkInteracPayment_({ firstName: fName, lastName: lName });
  }

  return false;
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
 * @update Mar 21, 2025
 * 
 */

function createSearchTerms_(member) {
  const lastNameHyphenated = (member.lastName).replace(/[-\s]/, '[-\\s]?'); // handle hyphenated last names
  const fullName = `${member.firstName}\\s+${lastNameHyphenated}`;

  const searchTerms = [
    fullName,
    removeDiacritics(fullName),
    member.email,
  ].filter(Boolean); // Removes undefined, null, or empty strings

  return searchTerms;
}


/// 1️⃣  👉 FUNCTIONS HANDLING ZEFFY TRANSACTIONS 👈  \\\

function checkZeffyPayment_(member) {
  const sender = ZEFFY_EMAIL;
  const maxMatches = 3;
  const threads = getMatchingPayments_(sender, maxMatches);

  // Return true if email matching member found
  return threads.some(thread => processZeffyThread_(thread, member));
}


/**
 * Process a single Gmail thread to find a matching member's payment.
 */

function processZeffyThread_(thread, member) {
  const messages = thread.getMessages();
  let starredCount = 0;
  let isFoundInMessage = false;

  const searchTerms = createSearchTerms_(member);

  for (const message of messages) {
    if (message.isStarred()) {
      starredCount++; // Already processed, skip
      continue;
    }

    const emailBody = message.getPlainBody();
    isFoundInMessage = matchMemberInPaymentEmail_(searchTerms, emailBody);

    if (isFoundInMessage) {
      message.star();
      starredCount++;
    }
  }

  if (starredCount === messages.length) {
    const zeffyLabel = getGmailLabel_(ZEFFY_LABEL);
    cleanUpMatchedThread_(thread, zeffyLabel);
  }

  return isFoundInMessage;
}


/**
 * Marks a fully processed thread as read, archives it, and moves it to the `label` folder.
 */

function cleanUpMatchedThread_(thread, label) {
  thread.markRead();
  thread.moveToArchive();
  thread.addLabel(label);

  console.log('Thread cleaned up. Now removed from inbox');
}



/// 2️⃣  👉 FUNCTIONS HANDLING INTERAC TRANSACTIONS 👈  \\\

/**
 * Look for new emails from Interac starting yesterday (cannot search from same day) and extract ref number.
 * 
 * @trigger  New member registration.
 * @error  Send notification email to McRUN if no ref number found.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Oct 1, 2023
 * @update  Apr 21, 2025
 */

function checkInteracPayment_(member) {
  const sender = INTERAC_EMAIL;
  const maxMatches = 10;
  const threads = getMatchingPayments_(sender, maxMatches);
  let isFound = false;

  // Most Interac email threads only have 1 message, so O(n) instead of O(n**2). Coded as safeguard.
  for (const thread of threads) {
    isFound = processInteracThreads_(thread, member);
  }

  return isFound;
}

// Interac e-Transfer emails can be matched by a member's full name
function processInteracThreads_(thread, member) {
  const messages = thread.getMessages();

  const searchTerms = createSearchTerms_(member);

  for (message of messages) {
    const emailBody = message.getPlainBody();

    // Try matching Interac e-Transfer email with member's reference number or name
    const isFoundInMessage = matchMemberInPaymentEmail_(searchTerms, emailBody);

    if (isFoundInMessage) {
      cleanUpMatchedThread_(thread, getGmailLabel_(INTERAC_LABEL));
      return true;
    }
  }

  return false;
}


/** 3️⃣ HELPER FUNCTIONS FOR ZEFFY AND INTERAC */


function getGmailLabel_(labelName) {
  return GmailApp.getUserLabelByName(labelName);
}

// Get threads from search (from:sender, starting:minDate, in:inbox)
function getGmailSearchString_(sender, offset) {
  const minDate = new Date(Date.now() - offset);
  const formattedDate = Utilities.formatDate(minDate, TIMEZONE, 'yyyy/MM/dd');
  return `from:(${sender}) in:inbox after:${formattedDate}`;
}


/**
 * Checks if a member's information is present in the email body.
 * 
 * @param {string[]}  searchTerms. Search terms for match regex.
 * @param {string} emailBody  The body of the payment.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 15, 2025
 * @update Apr 21, 2025
 * 
 */

function matchMemberInPaymentEmail_(searchTerms, emailBody) {
  if (searchTerms.length === 0) return false; // Prevent empty regex errors

  const formatedBody = emailBody.replace(/\*/g, '');    // Remove astericks around terms
  const searchPattern = new RegExp(`\\b(${searchTerms.join('\\b|\\b')})\\b`, 'i');
  return searchPattern.test(formatedBody);
}


/**
 * Return latest emails of payment notification.
 * 
 * If not found, wait multiple times for email to arrive in McRUN inbox.
 * 
 * @param {string} sender  Email of sender (Interac or Zeffy).
 * @param {number} maxMatches  Number of max tries.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 16, 2025
 * @update  Mar 16, 2025
 */

function getMatchingPayments_(sender, maxMatches) {
  // Ensure that correct mailbox is used
  if (getCurrentUserEmail_() !== CLUB_EMAIL) {
    throw new Error('Wrong account! Please switch to McRUN\'s Gmail account');
  }
  
  const dateOffset = 2 * 24 * 60 * 60 * 1000;   // 2 days in milliseconds
  const searchStr = getGmailSearchString_(sender, dateOffset);
  let threads = [];
  let delay = 10 * 1000; // Start with 10 seconds

  // Search inbox until successful (max 3 tries)
  for (let tries = 0; tries < 3 && threads.length === 0; tries++) {
    if (tries > 0) Utilities.sleep(delay);  // Wait only on retries
    threads = GmailApp.search(searchStr, 0, maxMatches);
    delay *= 2; // Exponential backoff (10s → 20s → 40s)
  }

  return threads;
}


function notifyUnidentifiedPayment_(name) {
  const emailBody =
    `
  Cannot find the payment notification for member: ${name}
      
  Please manually check the inbox and updated membership registry as required.

  If email not found, please notify member of outstanding member fee.
      
  Automatic email created by 'McRace Code' bounded by ${SHEET_NAME} sheet.
  `

  const email = {
    to: INTERNAL_EMAIL,
    subject: 'ATTENTION: Missing Member Payment!',
    body: emailBody,
    options: {
      cc: CLUB_EMAIL
    }
  };

  GmailApp.sendEmail(email.to, email.subject, email.body, email.options);
}
