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

import './jest.setup.js';
import { Mocks } from './Mocks';
import { AIAnalyzer, PlanOfAction } from './AIAnalyzer';
import { Config } from './Config';

jest.mock('./Config');

describe('AIAnalyzer Tests', () => {
  const mockConfig = {
    GEMINI_API_KEY: 'test-api-key',
    gemini_model: 'gemini-2.5-flash',
    unprocessed_label: 'unprocessed',
    processed_label: 'processed',
    processing_failed_label: 'error',
    processing_frequency_in_minutes: 5,
    hour_of_day_to_run_sanity_checking: 0,
    go_link: '',
    max_threads: 50,
    default_task_list_name: 'My Tasks',
    task_service: 'Google Tasks',
    todoist_api_key: '',
    todoist_project_id: '',
  } as Config;

  beforeEach(() => {
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
    global.SpreadsheetApp = {
      getActiveSpreadsheet: jest.fn(),
    } as any;
    global.UrlFetchApp = {
      fetch: jest.fn(),
    } as any;
  });

  it('should read context from the AI_Context sheet', () => {
    const mockSheet = Mocks.getMockSheet([
      ['Category', 'Guideline'],
      ['My Role', 'Project Manager'],
      ['Key Projects', 'Project Phoenix'],
    ]);
    (global.SpreadsheetApp.getActiveSpreadsheet as jest.Mock).mockReturnValue(
      Mocks.getMockSpreadsheet({ 'AI_Context': mockSheet })
    );

    const context = AIAnalyzer.getContext();
    expect(context).toBe('| Category | Guideline |\n|---|---|\n| My Role | Project Manager |\n| Key Projects | Project Phoenix |');
  });

  it('should throw an error if the AI_Context sheet is not found', () => {
    (global.SpreadsheetApp.getActiveSpreadsheet as jest.Mock).mockReturnValue(
      Mocks.getMockSpreadsheet({})
    );
    expect(() => AIAnalyzer.getContext()).toThrow("Sheet 'AI_Context' not found. Please create it.");
  });

  it('should generate a plan by calling the AI API', () => {
    const mockContext = 'Test Context';
    const mockPlan: PlanOfAction = {
      task: { title: 'Test Task', notes: 'Test Notes', due_date: '2025-12-31', priority: 1 },
      confidence: {
        score: 85,
        reasoning: 'This email requires action',
        not_higher_reasoning: 'The email is important, but it has nothing to do with my responsibilities and tasks.',
        not_lower_reasoning: 'There is no action point but it might still be good to know about.'
      }
    };

    (global.UrlFetchApp.fetch as jest.Mock).mockImplementation((url, params) => {
      expect(url).toContain('gemini-2.5-flash:generateContent');
      const payload = JSON.parse(params.payload as string);
      expect(payload.system_instruction.parts[0].text).toContain('Test Context');
      expect(payload.contents[0].parts[0].text).toContain('Test Subject');
      
      return Mocks.getMockUrlFetchResponse(200, JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify([mockPlan]) }] } }],
      }));
    });

    const plan = AIAnalyzer.generatePlans([Mocks.getMockThread({ getFirstMessageSubject: () => 'Test Subject' })], mockContext, mockConfig);
    expect(plan[0]).toEqual(mockPlan);
  });

  it('should generate a plan without a task if the email is not actionable', () => {
    const mockContext = 'Test Context';
    const mockPlan: PlanOfAction = {
      confidence: {
        score: 0,
        reasoning: 'Non-actionable email',
        not_higher_reasoning: 'No clear action required',
        not_lower_reasoning: 'Email was processed successfully',
      },
    };

    (global.UrlFetchApp.fetch as jest.Mock).mockImplementation((url, params) => {
      return Mocks.getMockUrlFetchResponse(200, JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify([mockPlan]) }] } }],
      }));
    });

    const plan = AIAnalyzer.generatePlans([Mocks.getMockThread({})], mockContext, mockConfig);
    expect(plan[0]).toEqual(mockPlan);
    expect(plan[0]?.task).toBeUndefined();
  });

  it('should handle AI API errors gracefully', () => {
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(
      Mocks.getMockUrlFetchResponse(500, 'Internal Server Error')
    );

    expect(() => AIAnalyzer.generatePlans([Mocks.getMockThread({})], 'context', mockConfig)).toThrow('Failed to call or parse AI API response: Error: AI API request failed with code 500: Internal Server Error');
  });

  it('should throw an error if GEMINI_API_KEY is missing', () => {
    const emptyConfig = { ...mockConfig, GEMINI_API_KEY: '' };
    expect(() => AIAnalyzer.generatePlans([Mocks.getMockThread({})], 'context', emptyConfig)).toThrow("Config 'GEMINI_API_KEY' not found. Please set it in the 'configs' sheet.");
  });
});






