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

import Utils from './utils';

export interface MutableConfig {
    unprocessed_label: string;
    processed_label: string;
    processing_failed_label: string;
    processing_frequency_in_minutes: number;
    hour_of_day_to_run_sanity_checking: number;
    go_link: string;
    max_threads: number;
    default_task_list_name: string;
    GEMINI_API_KEY: string;
    task_service: string;
    todoist_api_key: string;
    todoist_project_id: string;
    gemini_model: string;
}

export class Config implements Readonly<MutableConfig> {
    public readonly unprocessed_label: string;
    public readonly processed_label: string;
    public readonly processing_failed_label: string;
    public readonly processing_frequency_in_minutes: number;
    public readonly hour_of_day_to_run_sanity_checking: number;
    public readonly go_link: string;
    public readonly max_threads: number;
    public readonly default_task_list_name: string;
    public readonly GEMINI_API_KEY: string;
    public readonly task_service: string;
    public readonly todoist_api_key: string;
    public readonly todoist_project_id: string;
    public readonly gemini_model: string;

    private static validate(config: Config) {
        Utils.assert(config.unprocessed_label.length > 0, "unprocessed_label can't be empty");
        Utils.assert(config.max_threads <= 100, "max_threads can't be greater than 100");
    }

    public static getConfig(): Config {
        let config: MutableConfig = {
            unprocessed_label: "unprocessed",
            processed_label: "processed",
            processing_failed_label: "error",
            processing_frequency_in_minutes: 5,
            hour_of_day_to_run_sanity_checking: 0,
            go_link: "",
            max_threads: 50,
            default_task_list_name: "My Tasks",
            GEMINI_API_KEY: "",
            task_service: "Google Tasks",
            todoist_api_key: "",
            todoist_project_id: "",
            gemini_model: "gemini-2.5-flash",
        };

        const values = Utils.withTimer("GetConfigValues", () => {
            const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('configs');
            if (sheet === null) {
                throw "Active sheet 'configs' not found";
            }
            const num_rows = sheet.getLastRow();
            return sheet.getRange(1, 1, num_rows, 2).getDisplayValues().map(row => row.map(cell => cell.trim()));
        });
        const num_rows = values.length;

        for (let row = 0; row < num_rows; row++) {
            const [name, value] = values[row];
            if (name.length === 0) {
                continue;
            }

            // Allow string configs to be empty, but skip numeric configs if empty.
            if (value.length === 0) {
                switch (name) {
                    case "processing_frequency_in_minutes":
                    case "hour_of_day_to_run_sanity_checking":
                    case "max_threads":
                        continue;
                }
            }

            switch (name) {
                case "processing_frequency_in_minutes":
                case "hour_of_day_to_run_sanity_checking":
                case "max_threads": {
                    const result = parseInt(value);
                    if (isNaN(result)) {
                        throw `Unrecognized config value of ${name}`;
                    }
                    config[name] = result;
                    break;
                }
                case "unprocessed_label":
                case "processed_label":
                case "processing_failed_label":
                case "go_link":
                case "default_task_list_name":
                case "GEMINI_API_KEY":
                case "task_service":
                case "todoist_api_key":
                case "todoist_project_id":
                case "gemini_model": {
                    config[name] = value;
                    break;
                }
                default: {
                    console.error(`Invalid config: ${name}`);
                }
            }
        }

        Config.validate(config);
        return config as Config;
    }
}
