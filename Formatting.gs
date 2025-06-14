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

/**
 * Removes diacritics (accents) from a given string.
 * 
 * @param {string} str  The string to normalize and strip of diacritics.
 * @return {string}  The normalized string without diacritics.
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Mar 5, 2025
 * @update  Apr 23, 2025
 */

function removeDiacritics_(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


/**
 * Formats the registration sheet by:
 * 1. Freezing panes
 * 2. Setting text wrapping
 * 3. Setting vertical alignment
 * 4. Setting number formatting
 * 5. Adding checkboxes to non-empty rows
 * 6. Updating banding by increasing range
 * 
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 21, 2025
 * @update  May 23, 2025
 */
function formatSpecificColumns() {
  const sheet = GET_REGISTRATION_SHEET_();

  // Helper fuction to improve readability
  const getThisRange = (ranges) =>
    Array.isArray(ranges) ? sheet.getRangeList(ranges) : sheet.getRange(ranges);

  // 1. Freeze panes
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);

  // 2. Text wrapping
  getThisRange('R2:R').setWrap(true);  // Comments

  // 3. Vertical alignment
  getThisRange([
    'D:D',
    'F:F',
    'I:I',
    'N:N',
    'P:P',
    'S:U',
  ]).setHorizontalAlignment('center');

  // 4. Set number formatting
  const dateTimeFormat = 'yyyy-mm-dd hh:MM:ss';
  getThisRange('A2:A').setNumberFormat(dateTimeFormat);

  const phoneFormat = '+0 (000) 000-0000';
  getThisRange(['F2:F', 'I2:I']).setNumberFormat([phoneFormat]);

  const dateFormat = 'yyyy-mm-dd';
  getThisRange(['N2:N', 'U2:U']).setNumberFormat([dateFormat]);

  // 5. Add checkboxes to non-empty rows
  addMissingCheckboxes_(sheet);

  // 6. Update banding by increasing range
  const banding = sheet.getRange(1, 1).getBandings()[0];
  banding.setRange(sheet.getDataRange());
}


/**
 * Adds checkboxes to the `paymentConfirmed` column for all non-empty rows.
 * 
 * @param {SpreadsheetApp.Sheet} [sheet=GET_REGISTRATION_SHEET_()]  The sheet to add checkboxes to.
 *                                                                  Defaults to the registration sheet.
 * @author [Andrey Gonzalez](<andrey.gonzalez@mail.mcgill.ca>)
 * @date  Apr 23, 2025
 * @update  May 23, 2025
 */
function addMissingCheckboxes_(sheet = GET_REGISTRATION_SHEET_()) {
  const lastRow = getLastRowInReg_();
  const numRows = lastRow - 1;    // Remove header
  sheet.getRange(2, COL_MAP.paymentConfirmed + 1, numRows).insertCheckboxes();
}
