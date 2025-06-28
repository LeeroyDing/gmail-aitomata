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

import { AIAnalyzer, PlanOfAction } from './AIAnalyzer';
import { Config } from './Config';
import Mocks from './Mocks';

describe('AIAnalyzer', () => {
  const mockConfig = {
    GEMINI_API_KEY: 'test-api-key',
  } as Config;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    global.SpreadsheetApp = {
      getActiveSpreadsheet: jest.fn(() => Mocks.getMockSpreadsheet({}))
    } as any;
    global.UrlFetchApp = {
        fetch: jest.fn(),
        fetchAll: jest.fn(),
        getRequest: jest.fn(),
    } as any;
  });

  it('should read context from the AI_Context sheet', () => {
    const mockSheet = Mocks.getMockSheet([
      ['Category', 'Guideline'],
      ['My Role', 'Project Manager'],
      ['Key Projects', 'Project Phoenix'],
    ]);
    (SpreadsheetApp.getActiveSpreadsheet as jest.Mock).mockReturnValue(Mocks.getMockSpreadsheet({ 'AI_Context': mockSheet }));

    const context = AIAnalyzer.getContext();
    expect(context).toBe('My Role: Project Manager\nKey Projects: Project Phoenix');
  });

  it('should throw an error if the AI_Context sheet is not found', () => {
    (SpreadsheetApp.getActiveSpreadsheet as jest.Mock).mockReturnValue(Mocks.getMockSpreadsheet({}));
    expect(() => AIAnalyzer.getContext()).toThrow("Sheet 'AI_Context' not found. Please create it.");
  });

  it('should generate a plan by calling the AI API', () => {
    const mockMessages = [Mocks.getMockMessage({ getSubject: () => 'Test Subject', getPlainBody: () => 'Test Body' })];
    const mockContext = 'Test Context';
    const mockPlan: PlanOfAction = {
      action: { move_to: 'ARCHIVE', mark_read: true },
      task: { is_required: true, title: 'Test Task', notes: 'Test Notes' },
    };

    (UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(mockPlan) }] } }],
    })));

    const plan = AIAnalyzer.generatePlan(mockMessages, mockContext, mockConfig);
    
    expect(UrlFetchApp.fetch).toHaveBeenCalled();
    const fetchCall = (UrlFetchApp.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].payload);
    expect(payload.contents[0].parts[0].text).toContain('Test Subject');
    expect(payload.contents[0].parts[0].text).toContain('Test Context');
    expect(plan).toEqual(mockPlan);
  });

  it('should handle AI API errors gracefully', () => {
    const mockMessages = [Mocks.getMockMessage({})];
    (UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(500, 'Internal Server Error'));

    const plan = AIAnalyzer.generatePlan(mockMessages, 'context', mockConfig);
    expect(plan).toBe(null);
  });

  it('should throw an error if GEMINI_API_KEY is missing', () => {
    const emptyConfig = { GEMINI_API_KEY: '' } as Config;
    expect(() => AIAnalyzer.generatePlan([], 'context', emptyConfig)).toThrow("Config 'GEMINI_API_KEY' not found. Please set it in the 'configs' sheet.");
  });
});