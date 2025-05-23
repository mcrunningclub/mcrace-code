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

/** LABELS FOR GMAIL ACCOUNT */
const ONLINE_LABEL = 'Fee Payments/Online';
const INTERAC_LABEL = 'Fee Payments/Interac Emails';


/** 1️⃣ HELPER FUNCTIONS FOR ZEFFY AND INTERAC */

/**
 * Retrieves a Gmail label by its name.
 * 
 * @param {string} labelName  The name of the Gmail label to retrieve.
 * @returns {Gmail.GmailLabel}  The Gmail label object.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */
function getGmailLabel_(labelName) {
  return GmailApp.getUserLabelByName(labelName);
}


/**
 * Constructs a Gmail search string to find threads from a specific sender after a given date.
 * 
 * @param {string} sender  The email address of the sender.
 * @param {integer} offset  The time offset in milliseconds to calculate the minimum date.
 * @returns {string}  The Gmail search string.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date Apr 21, 2025  (Apr 23, 2025)
 */
function getGmailSearchString_(sender, offset) {
  const minDate = new Date(Date.now() - offset);
  const formattedDate = Utilities.formatDate(minDate, TIMEZONE, 'yyyy/MM/dd');
  return `from:(${sender}) in:inbox after:${formattedDate}`;  // Search string `(from:sender, starting:minDate, in:inbox)`
}


/**
 * Marks a Gmail thread as read, archives it, and moves it to a specified label.
 * 
 * @param {Gmail.GmailThread} thread  The Gmail thread to process.
 * @param {Gmail.GmailLabel} label  The Gmail label to apply to the thread.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  Apr 23, 2025
 */

function cleanUpMatchedThread_(thread, label) {
  thread.markRead();
  thread.moveToArchive();
  thread.addLabel(label);

  console.log('Thread cleaned up. Now removed from inbox');
}


/**
 * Checks if a member's information is present in the email body.
 * 
 * @param {string[]} searchTerms  Search terms for match regex.
 * @param {string} emailBody  The body of the payment.
 * @returns {boolean}  True if a match is found, false otherwise.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 15, 2025
 * @update  Apr 21, 2025
 */

function matchMemberInPaymentEmail_(searchTerms, emailBody) {
  if (searchTerms.length === 0) return false; // Prevent empty regex errors

  const formatedBody = emailBody.replace(/\*/g, '');    // Remove astericks around terms
  const searchPattern = new RegExp(`\\b(${searchTerms.join('\\b|\\b')})\\b`, 'i');
  return searchPattern.test(formatedBody);
}


/**
 * Retrieves the latest payment notification emails from a specific sender.
 * 
 * If no emails are found, retries multiple times with exponential backoff.
 * 
 * @param {string} sender  The email address of the sender (e.g., Interac or Zeffy).
 * @param {integer} maxMatches  The maximum number of threads to retrieve.
 * @returns {Gmail.GmailThread[]}  An array of Gmail threads matching the search criteria.
 * 
 * @throws {Error} If the current user is not logged into the McRUN account.
 *  
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 16, 2025
 * @update  Apr 29, 2025
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
    delay *= 3; // Exponential backoff (10s → 30s → 90s)
  }

  return threads;
}



/** 2️⃣ 👉 FUNCTION HANDLING STRIPE OR ZEFFY TRANSACTIONS 👈  *\

/**
 * Processes a Gmail thread to find a matching member's payment email.
 * 
 * @param {Gmail.GmailThread} thread  The Gmail thread to process.
 * @param {string[]} searchTerms  An array of search terms to match against the email body.
 * @returns {boolean}  True if a match is found in the thread, otherwise false.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  May 15, 2025
 */

function processOnlineThread_(thread, searchTerms) {
  const messages = thread.getMessages();
  let starredCount = 0;
  let isFoundInMessage = false;

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
    const zeffyLabel = getGmailLabel_(ONLINE_LABEL);
    cleanUpMatchedThread_(thread, zeffyLabel);
  }

  return isFoundInMessage;
}



/**  3️⃣ 👉 FUNCTIONS HANDLING INTERAC TRANSACTIONS 👈  */

/**
 * Processes Interac e-Transfer threads to find a matching member's payment.
 * If found, it moves the thread to the specified label, else sends an email notification.
 * 
 * @param {Gmail.GmailThread} thread  The Gmail thread to process.
 * @param {string[]} searchTerms  An array of search terms to match against the email body.
 * @returns {boolean}  True if a match is found in the thread, otherwise false.
 */
function processInteracThreads_(thread, searchTerms) {
  const messages = thread.getMessages();

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


/**
 * Sends a notification email for an unidentified payment to the club's inbox.
 * 
 * @param {string} fullName  The full name of the member whose payment could not be identified.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  May 20, 2025
 */

function notifyUnidentifiedPayment_(fullName) {
  const emailBody = 
  `
  Cannot find the payment confirmation email for ${fullName}.
      
  Please manually check the inbox and update registration as required.

  If email not found, please notify member of outstanding member fee.
      
  Automatic email created by 'McRace Code' in Google Apps Script.
  `
  const email = {
    to: INTERNAL_EMAIL,
    subject: 'ATTENTION: Missing Member Payment for McRace 2025!',
    body: emailBody.replace(/[ \t]{2,}/g, ''),
    options: {
      cc: CLUB_EMAIL
    }
  };

  GmailApp.sendEmail(email.to, email.subject, email.body, email.options);
}

