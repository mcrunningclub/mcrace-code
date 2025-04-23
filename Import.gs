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

const IMPORT_STORE = {
  name : 'ROWS_TO_IMPORT',
  delimeter : ';',
  funcName: processLastImport.name,
  // template : [targetRow; ...]
};

const TRIGGER_STORE = {
  name : 'TRIGGERS',
  delimeter : ';',
  innerDelimeter : ':',
  // template : [id:time; ....]
}

function appendToImport(reg) {
  const importSheet = GET_IMPORT_SHEET_();
  importSheet.appendRow([reg]);
  return importSheet.getLastRow();
}

function processLastImport() {
  const sheet = GET_IMPORT_SHEET_();
  const targetRow = getNextRowInQueue_();

  if (!targetRow) throw Error('Invalid target row in Import to process!');

  // STEP 1 : Get value of last import
  const data = sheet.getRange(targetRow, 1).getValue();
  const registrationObj = JSON.parse(data);

  // STEP 2 : Add processed post data in Registration
  const processed = addNewRegistration_(registrationObj);
  
  // STEP 3 : Process registration
  onNewRegistration_(processed);
  console.log(`Completed 'processLastImport' successfully!`);
}


function doPost(e) {
  const data = e.postData.contents;
  
  // Preparing return message
  let outputMessage = 'Starting doPost...';
  const addToMsg = (str) => outputMessage += '\n---\n' + str;

  try {
    // STEP 1 : Add to import sheet as backup
    const newRow = appendToImport(data);
    addToMsg(`Appended following post contents in Import (row ${newRow}): ${data}`);

    // STEP 2 : Set trigger to process new registration (doPost cannot log messages or access McRUN inbox)
    // This includes: payment verification, sheet formatting, etc.
    addTriggerForNewRegistration_(newRow);
    addToMsg('New trigger added');

    // STEP 3 : Log current user for debugging purposes
    const user = getCurrentUserEmail_();
    addToMsg(`Current user: ${user}`);
    addToMsg(`Completed 'onNewRegistration' successfully!`);
  }
  catch (error) {
    addToMsg(`Error! Could not complete doPost\n${error.message}`);
  }
  finally {
    return ContentService.createTextOutput(outputMessage);
  }
}


function addTriggerForNewRegistration_(targetRow) {
  const lock = LockService.getScriptLock();
  const offset = 15 * 1000;   // 15 seconds
  const triggerTime = new Date(Date.now() + offset);

  try {
    // Try getting lock for 20 seconds
    if (lock.tryLock(20000)) {
      Logger.log("Acquired lock in " + addTriggerForNewRegistration_.name);
      pushStore_(targetRow, IMPORT_STORE);

      // Create new trigger from 'offset'
      const trigger = ScriptApp.newTrigger(IMPORT_STORE.funcName)
      .timeBased()
      .at(triggerTime)
      .create();

      // Store trigger as 'id:time' to delete once expired
      const triggerInfo = trigger.getUniqueId() + TRIGGER_STORE.innerDelimeter + triggerTime.getTime();
      pushStore_(triggerInfo, TRIGGER_STORE);
    }

    // Log trigger time and target row
    Logger.log(`Trigger created for Import (row ${targetRow}) Import at ${triggerTime}`);
  }
  catch (error) {
    throw error;
  }
  finally {
    lock.releaseLock(); // Correct method to release the lock
    Logger.log("Lock released in " + addTriggerForNewRegistration_.name);
  }
}


function getNextRowInQueue_() {
  const lock = LockService.getScriptLock();

  if (lock.tryLock(10000)) { // Try getting lock for 10 seconds
    try {
      Logger.log("Acquired lock in " + getNextRowInQueue_.name);
      const targetRow = popStore_(IMPORT_STORE);
      if (!targetRow || targetRow.length < 1) return;

      return targetRow;

    } finally {
      lock.releaseLock(); // Correct method to release the lock
      Logger.log("Lock released in " + getNextRowInQueue_.name);
    }
  } else {
    Logger.log("Unable to get lock. Exiting...");
  }
}

function deleteOldTriggers() {
  const props = PropertiesService.getScriptProperties();
  const triggers = ScriptApp.getProjectTriggers();

  const store = TRIGGER_STORE;
  const queue =  getStoreQueue_(store, props);

  if(queue.length === 0) return;
  const storeObj = arrToObj_(queue);

  const now = new Date();
  const updated = {};

  triggers.forEach(trigger => {
    const id = trigger.getUniqueId();
    const scheduledTime = storeObj[id] ? new Date(Number(storeObj[id])) : null;

    if (scheduledTime && scheduledTime < now) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log(`Deleted expired calendar trigger: ${id} for ${scheduledTime}`);
    } else if (scheduledTime) {
      updated[id] = storeObj[id];
    }
  });

  const updatedArr = objToArr_(updated);
  props.setProperty(store.name, updatedArr.join(store.delimeter));
  console.log(`Updated store ${store.name} with values`, updated);
}


/** Helper functions to transform trigger stor */
  function arrToObj_(queue, delimiter = TRIGGER_STORE.innerDelimeter) {
    return queue.reduce((acc, e) => {
      const [key, value] = e.split(delimiter);
      acc[key] = value;
      return acc;
    }, {});
  }

  function objToArr_(obj, delimiter = TRIGGER_STORE.innerDelimeter) {
    return Object.keys(obj).reduce((acc, key) => {
      acc.push(key + delimiter + obj[key]);
      return acc;
    }, []);
  }

