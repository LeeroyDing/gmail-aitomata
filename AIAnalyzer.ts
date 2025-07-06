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

import { Config } from "./Config";

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
  confidence: {
    score: number;
    reasoning: string;
    not_higher_reasoning: string;
    not_lower_reasoning: string;
  };
}

export class AIAnalyzer {
  /**
   * Reads the user's context from the 'AI_Context' sheet.
   * @returns {string} The context as a single string.
   */
  public static getContext(): string {
    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AI_Context");
    if (!sheet) {
      throw new Error("Sheet 'AI_Context' not found. Please create it.");
    }
    const range = sheet.getDataRange();
    const values = range.getDisplayValues();

    // Remove header row and join rows into a single string.
    // Assumes a two-column format (Category, Guideline)
    const header = `| ${values[0][0]} | ${values[0][1]} |`;
    const separator = "|---|---|";
    const context = values
      .slice(1)
      .map((row) => `| ${row[0]} | ${row[1]} |`)
      .join("\n");
    return `${header}\n${separator}\n${context}`;
  }

  private static formatMessagesForAI(
    messages: GoogleAppsScript.Gmail.GmailMessage[]
  ): string {
    return messages
      .map((msg) => {
        return `From: ${msg.getFrom()}\nTo: ${msg.getTo()}\nSubject: ${msg.getSubject()}\nDate: ${msg.getDate()}\n\n${msg.getPlainBody()}`;
      })
      .join("\n\n---\n\n");
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
  ): PlanOfAction[] {
    if (!config.GEMINI_API_KEY) {
      throw new Error(
        "Config 'GEMINI_API_KEY' not found. Please set it in the 'configs' sheet."
      );
    }
    if (threads.length === 0) {
      return [];
    }

    const apiKey = config.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini_model}:generateContent?key=${apiKey}`;

    const threadsContent = threads.map((thread) => {
      const messages = thread.getMessages();
      const messageContent = this.formatMessagesForAI(messages);
      return `
        **EMAIL THREAD: ${thread.getFirstMessageSubject()}**
        ---
        ${messageContent}
        ---
      `;
    });

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
      If an email thread is actionable, create a task. Otherwise, do not include the "task" object for that thread.`;

    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: threadsContent.map((threadContent) => {
              return { text: threadContent };
            }),
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              title: "Plan of Action",
              description:
                "A structured plan of action for each email thread, including a task if applicable.",
              properties: {
                task: {
                  type: "OBJECT",
                  nullable: true,
                  properties: {
                    title: {
                      type: "STRING",
                      title: "Task Title",
                      description:
                        "A short, easily glanceable summary of the required action.",
                      example: "Reply to Jane about the project deadline",
                      maxLength: 100,
                      minLength: 20,
                      nullable: false,
                    },
                    notes: {
                      type: "STRING",
                      title: "Task Notes",
                      description:
                        "Detailed notes about the task, in proper Markdown format.",
                      example:
                        "Discuss project details with Jane. Because she has been waiting for a response since last week.",
                      nullable: false,
                    },
                    due_date: {
                      type: "STRING",
                      title: "Due Date",
                      description:
                        "The due date for the task in YYYY-MM-DD format or natural language.",
                      example: "2024-12-31",
                      nullable: true,
                    },
                    priority: {
                      type: "NUMBER",
                      title: "Task Priority",
                      description:
                        "The priority of the task, from 1 (Urgent) to 4 (Normal).",
                      example: 1,
                      nullable: true,
                    },
                  },
                },
                confidence: {
                  type: "OBJECT",
                  nullable: false,
                  description:
                    "Confidence score of the decision over whether to create a task or not.",
                  properties: {
                    score: {
                      type: "NUMBER",
                      title: "Confidence Score",
                      description:
                        'A score from 0 to 100 indicating the AI\'s confidence in the task creation decision. 0 means "No need to bother me", 100 means "I should 100% create a task"',
                      example: 85,
                      nullable: false,
                    },
                    reasoning: {
                      type: "STRING",
                      title: "Reasoning",
                      description:
                        "The AI's reasoning for the confidence score.",
                      example:
                        "The email is from a colleague about an important project deadline, which is why I gave it a high score.",
                      nullable: false,
                    },
                    not_higher_reasoning: {
                      type: "STRING",
                      title: "Why Not Higher Reasoning",
                      description:
                        "The AI's reasoning for why the confidence score is not higher.",
                      example:
                        "The email is important, but it has nothing to do with my responsiblities and tasks.",
                      nullable: false,
                    },
                    not_lower_reasoning: {
                      type: "STRING",
                      title: "Why Not Lower Reasoning",
                      description:
                        "The AI's reasoning for why the confidence score is not lower.",
                      example:
                        "There is no action point but might still be good to know about.",
                      nullable: false,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, requestOptions);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (responseCode === 200) {
        const jsonResponse = JSON.parse(responseBody);
        if (jsonResponse.candidates && jsonResponse.candidates.length > 0) {
          const plans = jsonResponse.candidates[0].content.parts[0].text;
          return JSON.parse(plans) as PlanOfAction[];
        } else {
          Logger.log(
            `AI API returned a 200 response, but no candidates were found. Response: ${responseBody}`
          );
          return [];
        }
      } else {
        console.error(
          `AI API request failed with code ${responseCode}: ${responseBody}`
        );
        Logger.log(
          `AI API request failed with code ${responseCode}: ${responseBody}`
        );
        return [];
      }
    } catch (e) {
      console.error(`Failed to call or parse AI API response: ${e}`);
      Logger.log(`Failed to call or parse AI API response: ${e}`);
      return [];
    }
  }
}
