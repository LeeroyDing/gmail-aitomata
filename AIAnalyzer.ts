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
import { InboxAction } from './Processor';

/**
 * Defines the structure of the "Plan of Action" that the AI should return.
 */
export interface PlanOfAction {
  action: {
    move_to: InboxAction;
    mark_read: boolean;
  };
  task?: {
    is_required: boolean;
    title: string;
    notes: string;
    due_date?: string; // YYYY-MM-DD format
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
  public static generatePlan(
    messages: GoogleAppsScript.Gmail.GmailMessage[],
    context: string,
    config: Config
  ): PlanOfAction | null {
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Config 'GEMINI_API_KEY' not found. Please set it in the 'configs' sheet.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const messageContent = this.formatMessagesForAI(messages);

    const prompt = `
      **SYSTEM PROMPT:**
      You are an assistant helping me manage my email. Analyze the following email conversation based on my personal context and generate a JSON "Plan of Action".

      **MY CONTEXT:**
      ---
      ${context}
      ---

      **EMAIL CONTENT:**
      ---
      ${messageContent}
      ---

      **YOUR TASK:**
      Respond ONLY with a valid JSON object in the following format. Do not include any other text or markdown formatting.
      {
        "action": {
          "move_to": "ARCHIVE" | "TRASH" | "INBOX",
          "mark_read": boolean
        },
        "task": {
          "is_required": boolean,
          "title": "A concise, action-oriented title" | null,
          "notes": "A detailed summary for the task body" | null,
          "due_date": "YYYY-MM-DD" | null
        }
      }
    `;

    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
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
        const plan = jsonResponse.candidates[0].content.parts[0].text;
        return JSON.parse(plan) as PlanOfAction;
      } else {
        console.error(`AI API request failed with code ${responseCode}: ${responseBody}`);
        Logger.log(`AI API request failed with code ${responseCode}: ${responseBody}`);
        return null;
      }
    } catch (e) {
      console.error(`Failed to call AI API: ${e}`);
      Logger.log(`Failed to call AI API: ${e}`);
      return null;
    }
  }

  public static testAIAnalyzer(it: Function, expect: (actual: any) => any) {
    const mockConfig = {
      GEMINI_API_KEY: 'test-api-key',
    } as Config;

    it('should read context from the AI_Context sheet', () => {
      const mockSheet = Mocks.getMockSheet([
        ['Category', 'Guideline'],
        ['My Role', 'Project Manager'],
        ['Key Projects', 'Project Phoenix'],
      ]);
      SpreadsheetApp.getActiveSpreadsheet = () => Mocks.getMockSpreadsheet({ 'AI_Context': mockSheet });

      const context = AIAnalyzer.getContext();
      expect(context).toBe('My Role: Project Manager\nKey Projects: Project Phoenix');
    });

    it('should throw an error if the AI_Context sheet is not found', () => {
      SpreadsheetApp.getActiveSpreadsheet = () => Mocks.getMockSpreadsheet({});
      expect(() => AIAnalyzer.getContext()).toThrow("Sheet 'AI_Context' not found. Please create it.");
    });

    it('should generate a plan by calling the AI API', () => {
      const mockMessages = [Mocks.getMockMessage({ subject: 'Test Subject', plainBody: 'Test Body' })];
      const mockContext = 'Test Context';
      const mockPlan: PlanOfAction = {
        action: { move_to: 'ARCHIVE', mark_read: true },
        task: { is_required: true, title: 'Test Task', notes: 'Test Notes' },
      };

      UrlFetchApp.fetch = (url, params) => {
        expect(url).toContain('gemini-pro:generateContent');
        const payload = JSON.parse(params.payload as string);
        expect(payload.contents[0].parts[0].text).toContain('Test Subject');
        expect(payload.contents[0].parts[0].text).toContain('Test Context');
        
        return Mocks.getMockUrlFetchResponse(200, JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockPlan) }] } }],
        }));
      };

      const plan = AIAnalyzer.generatePlan(mockMessages, mockContext, mockConfig);
      expect(plan).toEqual(mockPlan);
    });

    it('should handle AI API errors gracefully', () => {
      const mockMessages = [Mocks.getMockMessage({})];
      
      UrlFetchApp.fetch = () => Mocks.getMockUrlFetchResponse(500, 'Internal Server Error');

      const plan = AIAnalyzer.generatePlan(mockMessages, 'context', mockConfig);
      expect(plan).toBe(null);
    });

    it('should throw an error if GEMINI_API_KEY is missing', () => {
      const emptyConfig = { GEMINI_API_KEY: '' } as Config;
      expect(() => AIAnalyzer.generatePlan([], 'context', emptyConfig)).toThrow("Config 'GEMINI_API_KEY' not found. Please set it in the 'configs' sheet.");
    });
  }
}

  }
