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

import { Config } from './Config';

/**
 * Defines the structure of the "Plan of Action" that the AI should return.
 */
export interface PlanOfAction {
  task?: {
    title: string;
    notes: string;
    due_date?: string; // YYYY-MM-DD format or natural language
    priority?: number; // 1 (Urgent) to 4 (Normal)
  };
}

export class AIAnalyzer {
  /**
   * Reads the user's context from the 'AI_Context' sheet.
   * @returns {string} The context as a single string.
   */
  public static getContext(): string {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AI_Context');
    if (!sheet) {
      throw new Error("Sheet 'AI_Context' not found. Please create it.");
    }
    const range = sheet.getDataRange();
    const values = range.getDisplayValues();
    
    // Remove header row and join rows into a single string.
    // Assumes a two-column format (Category, Guideline)
    const context = values.slice(1).map(row => `${row[0]}: ${row[1]}`).join('\n');
    
    return context;
  }

  private static formatMessagesForAI(messages: GoogleAppsScript.Gmail.GmailMessage[]): string {
    return messages.map(msg => {
      return `From: ${msg.getFrom()}\nTo: ${msg.getTo()}\nSubject: ${msg.getSubject()}\nDate: ${msg.getDate()}\n\n${msg.getPlainBody()}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Generates a plan of action for a given set of messages using an AI model.
   * @param {GoogleAppsScript.Gmail.GmailMessage[]} messages - The messages to analyze.
   * @param {string} context - The user's context to guide the AI.
   * @returns {PlanOfAction | null} A structured plan of action, or null if an error occurs.
   */
  public static generatePlans(
    threads: GoogleAppsScript.Gmail.GmailThread[],
    context: string,
    config: Config
  ): (PlanOfAction | null)[] {
    if (threads.length === 0) {
      return [];
    }

    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Config 'GEMINI_API_KEY' not found. Please set it in the 'configs' sheet.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini_model}:generateContent?key=${apiKey}`;

    const threadsContent = threads.map(thread => {
      const messages = thread.getMessages();
      const messageContent = this.formatMessagesForAI(messages);
      return `
        **EMAIL THREAD: ${thread.getFirstMessageSubject()}**
        ---
        ${messageContent}
        ---
      `;
    }).join('\n\n');

    const systemPrompt = `
      **SYSTEM PROMPT:**
      You are an assistant helping me manage my email. Analyze the following email threads based on my personal context and generate a "Plan of Action" for each thread.
      Return an array of "Plan of Action" objects, one for each thread.

      **MY CONTEXT:**
      ---
      ${context}
      ---

      **YOUR TASK:**
      Generate an array of "Plan of Action" objects.
      If an email thread is actionable, create a task. Otherwise, do not include the "task" object for that thread.
      The "title" should be a very short, easily glanceable summary of the required action (e.g., "Reply to Jane about the project deadline").
      The "notes" fields must not be null or empty if the task is present.
      The "due_date" should be in YYYY-MM-DD format.
      The "priority" should be an integer from 1 (Urgent) to 4 (Normal).
      ${config.task_service === 'Todoist' ? 'The "notes" field should be in proper Markdown format.' : ''}
    `;

    const userPrompt = `
      **EMAIL THREADS:**
      ---
      ${threadsContent}
      ---
    `;

    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                task: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    notes: { type: "STRING" },
                    due_date: { type: "STRING" },
                    priority: { type: "NUMBER" },
                  },
                },
              },
            },
          },
        }
      }),
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, requestOptions);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (responseCode === 200) {
        const jsonResponse = JSON.parse(responseBody);
        const plans = jsonResponse.candidates[0].content.parts[0].text;
        return JSON.parse(plans) as (PlanOfAction | null)[];
      } else {
        console.error(`AI API request failed with code ${responseCode}: ${responseBody}`);
        Logger.log(`AI API request failed with code ${responseCode}: ${responseBody}`);
        return [];
      }
    } catch (e) {
      console.error(`Failed to call AI API: ${e}`);
      Logger.log(`Failed to call AI API: ${e}`);
      return [];
    }
  }
}

