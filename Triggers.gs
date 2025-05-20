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
 * Handler function for time-based trigger to check fee payment.
 * 
 * No arguments allowed since trigger does not accept any.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  May 20, 2025
 * @update  May 20, 2025
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
    feeDetails: feeDetails,
    rowNum: row,
  });

  // Label trigger key with member name, and log trigger data
  const key = TRIGGER_BASE_ID + (feeDetails.fullName).replace(' ', '');
  
  scriptProperties.setProperty(key, triggerData);
  Logger.log(`Created new trigger '${key}', running every ${TRIGGER_FREQUENCY} min.\n\n${triggerData}`);
}


/**
 * Handler function for time-based trigger to check fee payment.
 * 
 * No arguments allowed since trigger does not accept any.
 * Workaround: store member details in script properties.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  May 20, 2025
 * @update  May 20, 2025
 */

function runFeeChecker() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProps = scriptProperties.getProperties();

  for (let key in allProps) {
    if (!key.startsWith(TRIGGER_BASE_ID)) continue;

    const triggerData = JSON.parse(allProps[key]);
    const { tries, triggerId, feeDetails, rowNum } = triggerData;
    
    if (isPaymentFound(rowNum)) {
      // If found, clean up trigger and data in script properties
      cleanUpTrigger(key, triggerId);
      Logger.log(`✅ Payment found for '${feeDetails.fullName}' after ${tries} tries`);
    }
    else if (tries <= FEE_MAX_CHECKS) {
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

  /** Helper: check if payment already found */
  function isPaymentFound(memberRow) {
    const sheet = GET_REGISTRATION_SHEET_();
    const confirmedCol = COL_MAP.paymentConfirmed + 1;
    const currentFeeValue = sheet.getRange(memberRow, confirmedCol).getValue().toString();
    return currentFeeValue.trim() == true;
  }

  /** Helper: increment tries and log data */
  function incrementTries(key, triggerData) {
    Logger.log(`Fee payment check #${triggerData.tries} for '${triggerData.feeDetails.fullName}'`);
    triggerData.tries++;
    scriptProperties.setProperty(key, JSON.stringify(triggerData));
  }

  /** Helper: check for payment again */
  function checkThisFeeAgain(feeDetails) {
    const isPaid = checkPayment_(feeDetails);
    if (isPaid) {
      setFeePaid_(row);
    }
    Logger.log(`➡️ Payment verification for '${feeDetails.fullName}' returned: ${isPaid}`);
  }

  /** Helper: remove trigger and data in script properties */
  function cleanUpTrigger(key, triggerId) {
    deleteTriggerById(triggerId);
    scriptProperties.deleteProperty(key);
  }

  /** Helper: delete a trigger by ID */
  function deleteTriggerById(triggerId) {
    const triggers = ScriptApp.getProjectTriggers();
    let isFound = false;

    for (let trigger of triggers) {
      if (trigger.getUniqueId() === triggerId) {
        isFound = true;
        ScriptApp.deleteTrigger(trigger);
        break;
      }
    }
    // Log success or throw error if not found
    const raiseError = () => { throw new Error(`⚠️ Trigger with id ${triggerId} not found`) }
    isFound ? Logger.log(`Trigger with id ${triggerId} deleted!`) : raiseError();
  }
}

