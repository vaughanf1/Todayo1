import { NextRequest, NextResponse } from 'next/server';
import { PlannedMilestone, TaskGroup, WarmupPlanResponse } from '@/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a backward-planning coach. Given a project, its objective ("done" state), and a target date, reverse-engineer a concrete 30-day plan that works backward from the objective into the next 30 days.

Rules:
- Produce 6-12 milestones. Each is a single concrete work session the user can actually sit down and do — not a vague theme.
- Spread them realistically across the 30-day window. dayOffset is days from today: 0 = today, up to 29.
- Front-load discovery/setup; put integration, review, and launch tasks later.
- estimatedMinutes must be one of: 15, 30, 60, 90, 120.
- group must be one of: "deep-work", "admin", "personal", "meetings", "health", "other".
- If a target date is given and is sooner than 30 days, compress the plan to finish by then.

Respond ONLY with valid JSON (no markdown, no explanation) in this exact shape:
{
  "milestones": [
    { "title": "string", "dayOffset": 0-29, "estimatedMinutes": 15|30|60|90|120, "group": "deep-work" }
  ]
}`;

const VALID_GROUPS: TaskGroup[] = [
  'deep-work',
  'admin',
  'personal',
  'meetings',
  'health',
  'other',
];
const VALID_MINUTES = [15, 30, 60, 90, 120];

export async function POST(request: NextRequest) {
  try {
    const { projectName, objective, targetDate, context } = await request.json();

    if (!projectName || typeof projectName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: projectName is required' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(mockPlan());
    }

    const userMessage = [
      `Project: ${projectName}`,
      objective ? `Objective (done state): ${objective}` : null,
      targetDate ? `Target date: ${targetDate}` : null,
      context ? `\nCreator context:\n${context}` : null,
      '\nReverse-engineer the 30-day plan.',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return NextResponse.json({ error: 'Failed to build plan' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    const parsed = JSON.parse(jsonContent) as WarmupPlanResponse;
    return NextResponse.json(sanitize(parsed));
  } catch (error) {
    console.error('Warmup plan error:', error);
    return NextResponse.json({ error: 'Failed to build plan' }, { status: 500 });
  }
}

// Clamp the model's output to the shapes the UI expects.
function sanitize(plan: WarmupPlanResponse): WarmupPlanResponse {
  const milestones = (plan.milestones ?? [])
    .filter(m => m && typeof m.title === 'string' && m.title.trim())
    .map<PlannedMilestone>(m => ({
      title: m.title.trim(),
      dayOffset: Math.max(0, Math.min(29, Math.round(Number(m.dayOffset) || 0))),
      estimatedMinutes: VALID_MINUTES.includes(m.estimatedMinutes)
        ? m.estimatedMinutes
        : 60,
      group: VALID_GROUPS.includes(m.group) ? m.group : 'deep-work',
    }));
  return { milestones };
}

function mockPlan(): WarmupPlanResponse {
  const milestones: PlannedMilestone[] = [
    { title: 'Define the objective + success criteria', dayOffset: 0, estimatedMinutes: 60, group: 'deep-work' },
    { title: 'Break the objective into 3 workstreams', dayOffset: 2, estimatedMinutes: 60, group: 'deep-work' },
    { title: 'First deliverable: rough draft', dayOffset: 6, estimatedMinutes: 120, group: 'deep-work' },
    { title: 'Mid-point review + adjust', dayOffset: 14, estimatedMinutes: 60, group: 'admin' },
    { title: 'Second deliverable: build it out', dayOffset: 20, estimatedMinutes: 120, group: 'deep-work' },
    { title: 'Polish + integrate everything', dayOffset: 26, estimatedMinutes: 90, group: 'deep-work' },
    { title: 'Final review + ship', dayOffset: 29, estimatedMinutes: 60, group: 'admin' },
  ];
  return { milestones };
}
