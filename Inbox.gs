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
 * Marks a fully processed thread as read, archives it, and moves it to the `label` folder.
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
 * Process a single Gmail thread to find a matching member's payment.
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

// Interac e-Transfer emails can be matched by a member's full name
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


/** EMAIL NOTIFICATION */

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

