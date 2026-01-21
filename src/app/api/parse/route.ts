import { NextRequest, NextResponse } from 'next/server';
import { ParsedTask, AIParseResponse } from '@/types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a productivity assistant that helps parse and organize daily tasks.

Given a raw list of tasks (which may be messy, unstructured, or contain shorthand), extract and structure them.

For each task, determine:
1. title: A clean, concise title for the task
2. group: Categorize as one of: "deep-work" (coding, writing, creating), "admin" (emails, calls, paperwork), "personal" (family, errands), "meetings" (scheduled calls/meetings), "health" (exercise, meals), or "other"
3. priority: Score 1-5 based on (impact × urgency) ÷ effort
   - 5 = High impact, urgent, low effort
   - 1 = Low impact, not urgent, high effort
4. estimatedMinutes: Realistic time estimate. Use only: 15, 30, 60, 90, or 120
5. fixedTime: If a specific time is mentioned (e.g., "lunch at 12:30", "call at 3pm"), extract as "HH:MM" format. Otherwise null.

Guidelines:
- Prioritize deep work and high-impact tasks higher
- Keep admin tasks batched and lower priority unless urgent
- Be realistic with time estimates (most tasks take longer than people think)
- Preserve any time constraints mentioned

Respond ONLY with valid JSON in this exact format:
{
  "tasks": [
    {
      "title": "string",
      "group": "deep-work" | "admin" | "personal" | "meetings" | "health" | "other",
      "priority": 1-5,
      "estimatedMinutes": 15 | 30 | 60 | 90 | 120,
      "fixedTime": "HH:MM" | null
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: text is required' },
        { status: 400 }
      );
    }

    // If no API key, use mock response for development
    if (!ANTHROPIC_API_KEY) {
      console.log('No ANTHROPIC_API_KEY found, using mock response');
      const mockResponse = generateMockResponse(text);
      return NextResponse.json(mockResponse);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Parse these tasks:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'Failed to parse tasks' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const parsed: AIParseResponse = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse tasks' },
      { status: 500 }
    );
  }
}

// Mock response for development without API key
function generateMockResponse(text: string): AIParseResponse {
  const lines = text.split('\n').filter(line => line.trim());
  const tasks: ParsedTask[] = [];

  const groups = ['deep-work', 'admin', 'personal', 'meetings', 'health', 'other'] as const;
  const durations = [15, 30, 60, 90, 120] as const;

  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, '').trim();
    if (!cleaned) continue;

    // Check for time mentions
    const timeMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let fixedTime: string | null = null;
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      fixedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Simple heuristics for grouping
    let group: typeof groups[number] = 'other';
    const lower = cleaned.toLowerCase();
    if (lower.includes('email') || lower.includes('invoice') || lower.includes('call') || lower.includes('reply')) {
      group = 'admin';
    } else if (lower.includes('gym') || lower.includes('workout') || lower.includes('run') || lower.includes('lunch') || lower.includes('eat')) {
      group = 'health';
    } else if (lower.includes('meeting') || lower.includes('sync') || lower.includes('standup')) {
      group = 'meetings';
    } else if (lower.includes('code') || lower.includes('write') || lower.includes('design') || lower.includes('build') || lower.includes('review') || lower.includes('finish') || lower.includes('pitch') || lower.includes('deck')) {
      group = 'deep-work';
    } else if (lower.includes('mom') || lower.includes('dad') || lower.includes('family') || lower.includes('personal')) {
      group = 'personal';
    }

    tasks.push({
      title: cleaned.replace(/\s*(at|@)\s*\d{1,2}(:\d{2})?\s*(am|pm)?/i, '').trim(),
      group,
      priority: Math.floor(Math.random() * 3) + 3, // 3-5 for mock
      estimatedMinutes: durations[Math.floor(Math.random() * durations.length)],
      fixedTime,
    });
  }

  return { tasks };
}
