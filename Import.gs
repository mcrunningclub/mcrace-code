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


function doPost(e) {
  const data = e.postData.contents;
  let outputMessage = 'Starting doPost...';

  try {
    // STEP 1 : Add to import sheet as backup
    const newRow = appendToImport(data);
    addToMsg(`Appended following post contents in Import (row ${newRow}): ${data}`);

    // STEP 2 : Add processed post data in Registration
    const registrationObj = JSON.parse(data);
    const ret = addNewRegistration_(registrationObj);
    addToMsg(`Added formatted data in Registration (row ${ret.newRow}): \n[${prettifyArr(ret.member)}\n]`);

    // STEP 3 : Invoke post-processing functions i.e. payment verification, sheet formatting, etc.
    onNewRegistration_(ret);
    addToMsg(`Completed 'onNewRegistration' successfully!`);
  }
  catch (error) {
    addToMsg('Error! Could not complete doPost');
    addToMsg(error.message);
  }
  finally {
    return ContentService.createTextOutput(outputMessage);
  }

  function addToMsg(str) {
    outputMessage += '\n---\n' + str;
  }

  function prettifyArr(arr){
    const keys = Object.keys(COL_MAP);

    return keys.reduce((acc, label, i ) => { 
      acc.push(`  (Col ${i}) ${label}: ${arr[i]}`);
      return acc;
    }, []).join('\n');
  }
}
