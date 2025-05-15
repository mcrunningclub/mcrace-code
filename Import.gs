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


function onChange(e) {
   // Get details of edit event's sheet
  console.log({
    authMode: e.authMode.toString(),
    changeType: e.changeType,
    user: e.user,
  });

  const thisSource = e.source;

  // Try-catch to prevent errors when sheetId cannot be found
  try {
    const thisSheetId = thisSource.getSheetId();
    const thisLastRow = thisSource.getLastRow();

    const thisChange = e.changeType;
    console.log(`Change Type: ${thisChange}`);

    if (thisSheetId === IMPORT_SHEET_ID && thisChange === 'INSERT_ROW') {
      console.log('Executing if block from onChange(e)...');
      
      // STEP 1 : Get new registration object
      const importSheet = thisSource.getSheetById(thisSheetId);
      const rawData = importSheet.getRange(thisLastRow, 1).getValue();
      console.log(`Received following data:\n${rawData}`);
      
      const registrationObj = JSON.parse(rawData);
      
      // STEP 2 : Add processed post data in Registration
      const processed = addNewRegistration_(registrationObj);
      console.log(`Completed ${addNewRegistration_.name} successfully!`);
      
      // STEP 3 : Process new registration
      onNewRegistration_(processed);
      console.log(`Completed ${onNewRegistration_.name} successfully!`);
    }
  }
  catch (error) {
    console.log('Whoops! Error raised in onChange(e)');
    Logger.log(error);
  }
}


/**
 * @deprecated  Use Zapier automation and `onChange` instead. (2025-04-29)
 */
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

