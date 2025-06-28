// jest.setup.js

// Mocking Google Apps Script global objects for Jest environment

global.Logger = {
  log: jest.fn(),
  getLog: jest.fn(() => ''),
  clear: jest.fn(),
};

global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => ({
    getSheetByName: jest.fn(() => ({
      getDataRange: jest.fn(() => ({
        getDisplayValues: jest.fn(() => [[]]),
      })),
    })),
  })),
};

global.UrlFetchApp = {
  fetch: jest.fn(),
  fetchAll: jest.fn(),
  getRequest: jest.fn(),
};

global.Tasks = {
  Tasks: {
    list: jest.fn(() => ({ items: [] })),
    insert: jest.fn(),
    patch: jest.fn(),
  },
  Tasklists: {
    list: jest.fn(() => ({ items: [] })),
  },
};

global.GmailApp = {
    getUserLabelByName: jest.fn((name) => ({
        getThreads: jest.fn(() => []),
        getName: () => name,
    })),
    search: jest.fn(() => []),
};

global.PropertiesService = {
    getScriptProperties: jest.fn(() => ({
        getProperty: jest.fn(),
        getProperties: jest.fn(),
        setProperties: jest.fn(),
        setProperty: jest.fn(),
        deleteAllProperties: jest.fn(),
        getKeys: jest.fn(),
        deleteProperty: jest.fn(),
    })),
    getUserProperties: jest.fn(() => ({})),
    getDocumentProperties: jest.fn(() => ({})),
};

global.Session = {
    getActiveUser: jest.fn(() => ({
        getEmail: () => 'test@example.com',
    })),
    getActiveUserLocale: jest.fn(() => 'en'),
    getEffectiveUser: jest.fn(() => ({
        getEmail: () => 'test@example.com',
    })),
    getScriptTimeZone: jest.fn(() => 'UTC'),
    getTemporaryActiveUserKey: jest.fn(() => 'key'),
};

global.ScriptApp = {
    getProjectTriggers: jest.fn(() => []),
    deleteTrigger: jest.fn(),
    newTrigger: jest.fn(() => ({
        timeBased: jest.fn(() => ({
            everyMinutes: jest.fn(() => ({
                create: jest.fn(),
            })),
            atHour: jest.fn(() => ({
                everyDays: jest.fn(() => ({
                    create: jest.fn(),
                })),
            })),
        })),
        create: jest.fn(),
    })),
};