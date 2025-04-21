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


function doPost(e) {
  const contents = e.postData.contents;
  appendNewRegistration(contents);
}


function appendNewRegistration(postData) {
  const sheet = GET_REGISTRATION_SHEET_();
  const entries = Object.entries(COL_MAP);

  const values = entries.reduce((acc, [key, i]) => {
    acc[i] = postData?.[key] ?? '';   // Prevent storing undefined
    return acc;
  }, new Array(entries.length));

  sheet.appendRow(values);
}

