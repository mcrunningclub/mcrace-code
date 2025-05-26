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

const TRIGGER_FUNC = runFeeChecker.name;
const TRIGGER_BASE_ID = 'feeCheckTrigger';
const FEE_MAX_CHECKS = 2;
const TRIGGER_FREQUENCY = 5;  // Minutes

/**
 * Creates a new time-based trigger to check fee payment for a specific member.
 * 
 * The trigger runs periodically and stores the member's details in script properties.
 * If the payment is not found after a maximum number of attempts, an email notification is sent.
 * 
 * @param {number} row  The row number in the `Registration` sheet for the member.
 * @param {Object} feeDetails  The member's payment details.
 * @param {string} feeDetails.fullName  The member's full name.
 * @param {string} feeDetails.email  The member's email address.
 * @param {string} feeDetails.paymentMethod  The payment method used by the member.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  May 20, 2025
 * @update  May 23, 2025
 */

function createNewFeeTrigger_(row, feeDetails) {
  const scriptProperties = PropertiesService.getScriptProperties();

  const trigger = ScriptApp.newTrigger(TRIGGER_FUNC)
    .timeBased()
    .everyMinutes(TRIGGER_FREQUENCY)
    .create();

  // Store trigger details using 'fullName' as key
  const triggerData = JSON.stringify({
    tries: 1,
    triggerId: trigger.getUniqueId(),
    feeDetails,
    rowNum: row,
  });

  const key = `${TRIGGER_BASE_ID}${feeDetails.fullName.replace(' ', '')}`;
  scriptProperties.setProperty(key, triggerData);
  Logger.log(`Created new trigger '${key}', running every ${TRIGGER_FREQUENCY} min.\n\n${triggerData}`);
}


/**
 * Handler function for time-based triggers to check fee payment.
 * 
 * This function processes all active triggers, checking if the payment has been confirmed.
 * If the payment is found, the trigger is cleaned up. If the maximum number of attempts is reached,
 * an email notification is sent to notify about the unidentified payment.
 * 
 * @throws {Error} If a trigger cannot be deleted or script properties cannot be updated.
 * 
 * @trigger Time-based trigger.
 * 
 * @see createNewFeeTrigger_
 * @see notifyUnidentifiedPayment_
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  May 20, 2025
 * @update  May 23, 2025
 */

function runFeeChecker() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProps = scriptProperties.getProperties();

  for (const key in allProps) {
    if (!key.startsWith(TRIGGER_BASE_ID)) continue;

    const triggerData = JSON.parse(allProps[key]);
    const { tries, triggerId, feeDetails, rowNum } = triggerData;

    if (isPaymentFound(rowNum)) {
      // If found, clean up trigger and data in script properties
      cleanUpTrigger(key, triggerId);
      Logger.log(`✅ Payment found for '${feeDetails.fullName}' after ${tries} tries`);
    } else if (tries <= FEE_MAX_CHECKS) {
      // Limit not reach, check again and increment 'tries'
      incrementTries(key, triggerData);
      checkThisFeeAgain(feeDetails);
    }
    else {
    // Send email notification if limit is reached
      cleanUpTrigger(key, triggerId);
      notifyUnidentifiedPayment_(feeDetails.fullName);
      Logger.log(`❌ Max tries reached for '${feeDetails.fullName}', sending email and stopping checks`);
    }
  }

  /**
   * Checks if the payment has already been confirmed for a member.
   * 
   * @param {integer} memberRow  The row number in the `Registration` sheet for the member.
   * @returns {boolean}  True if the payment is confirmed, otherwise false.
   */
  function isPaymentFound(memberRow) {
    const sheet = GET_REGISTRATION_SHEET_();
    const confirmedCol = COL_MAP.paymentConfirmed + 1;
    const currentFeeValue = sheet.getRange(memberRow, confirmedCol).getValue().toString();
    return currentFeeValue.trim() == true;
  }

  /**
   * Increments the number of attempts for a trigger and updates the script properties.
   * 
   * @param {string} key  The key for the trigger in script properties.
   * @param {Object} triggerData  The trigger data to update.
   */
  function incrementTries(key, triggerData) {
    Logger.log(`Fee payment check #${triggerData.tries} for '${triggerData.feeDetails.fullName}'`);
    triggerData.tries++;
    scriptProperties.setProperty(key, JSON.stringify(triggerData));
  }

  /**
   * Checks the payment status for a member again.
   * 
   * @param {Object} feeDetails  The member's payment details.
   */
  function checkThisFeeAgain(feeDetails) {
    const isPaid = checkPayment_(feeDetails);
    if (isPaid) {
      setFeePaid_(row);
    }
    Logger.log(`➡️ Payment verification for '${feeDetails.fullName}' returned: ${isPaid}`);
  }

  /**
   * Cleans up a trigger by deleting it and removing its data from script properties.
   * 
   * @param {string} key  The key for the trigger in script properties.
   * @param {string} triggerId  The unique ID of the trigger to delete.
   */
  function cleanUpTrigger(key, triggerId) {
    deleteTriggerById(triggerId);
    scriptProperties.deleteProperty(key);
  }

  /**
   * Deletes a trigger by its unique ID.
   * 
   * @param {string} triggerId  The unique ID of the trigger to delete.
   * @throws {Error}  If the trigger cannot be found.
   */
  function deleteTriggerById(triggerId) {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      if (trigger.getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(trigger);
        Logger.log(`Trigger with id ${triggerId} deleted!`);
        return;
      }
    }
    throw new Error(`⚠️ Trigger with id ${triggerId} not found`);
  }
}