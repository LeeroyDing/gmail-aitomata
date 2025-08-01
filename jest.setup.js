/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Define mock objects for Google Apps Script services
global.Tasks = {
  Tasklists: {
    list: jest.fn(),
  },
  Tasks: {
    list: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
    update: jest.fn(),
  },
};

global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => ({
    getSheetByName: jest.fn(),
  })),
};

global.UrlFetchApp = {
  fetch: jest.fn(),
};

global.Logger = {
  log: jest.fn(),
};

global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

global.GmailApp = {
  getUserLabelByName: jest.fn(),
};

global.LockService = {
  getScriptLock: jest.fn(() => ({
    tryLock: jest.fn().mockReturnValue(true),
    releaseLock: jest.fn(),
  })),
};
