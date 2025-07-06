/**
 * Copyright 2020 Google LLC
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

import {Config} from './Config';
import {Processor} from './Processor';

import Utils from './utils';




// String.startsWith polyfill
if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        value: function (search: string, rawPos: number) {
            const pos = rawPos > 0 ? rawPos | 0 : 0;
            return this.substring(pos, pos + search.length) === search;
        }
    });
}

// String.endsWith polyfill
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (search: string, this_len?: number) {
        if (this_len === undefined || this_len > this.length) {
            this_len = this.length;
        }
        return this.substring(this_len - search.length, this_len) === search;
    };
}

// Object.assign polyfill
if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target: object, ...sources: any[]) { // .length of function is 2
            if (target === null || target === undefined) {
                throw new TypeError('Cannot convert undefined or null to object');
            }

            const to = Object(target);

            for (const nextSource of sources) {

                if (nextSource !== null && nextSource !== undefined) {
                    for (const nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

// Top level functions

function ensurePermissionsEstablished() {
    // Some Gmail configurations do not initiate asking for Gmail
    // permissions when Gmail APIs are used behind withTimer(). See Issue#63.
    Session.getActiveUser();
}

// Triggered when Spreadsheet is opened

// @ts-ignore
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('Gmail Automata');
    if (e && e.authMode == ScriptApp.AuthMode.NONE) {
        menu.addItem('Configure this spreadsheet', 'configureSpreadsheets');
    } else {
        menu
            .addItem('Process now', 'processEmails')
            .addSeparator()
            .addItem('Start auto processing', 'setupTriggers')
            .addItem('Stop auto processing', 'stopAutoProcessing');
    }
    menu.addToUi();
}

// @ts-ignore
function processEmails() {
    ensurePermissionsEstablished();
    Utils.withFailureEmailed("processEmails", () => Processor.processAllUnprocessedThreads());
}

// @ts-ignore
function setupTriggers() {
    ensurePermissionsEstablished();

    // First, cancel all existing triggers to avoid duplicates.
    stopAutoProcessing();

    Utils.withFailureEmailed("setupTriggers", () => {
        const config = Utils.withTimer("getConfigs", () => Config.getConfig());
        Utils.withTimer("addingTriggers", () => {
            const trigger = ScriptApp.newTrigger('processEmails')
                .timeBased()
                .everyMinutes(config.processing_frequency_in_minutes)
                .create();
            Logger.log(`Created trigger ${trigger.getHandlerFunction()}: ${trigger.getUniqueId()}`);

            Utils.assert(ScriptApp.getProjectTriggers().length === 1,
                `Unexpected trigger lists: ${ScriptApp.getProjectTriggers()
                    .map(trigger => trigger.getHandlerFunction())}`);
        });
    });
}

function stopAutoProcessing() {
    // Deletes all triggers in the current project.
    const allTriggers = ScriptApp.getProjectTriggers();
    for (const trigger of allTriggers) {
        ScriptApp.deleteTrigger(trigger);
    }
    Logger.log('All triggers have been deleted.');
}





