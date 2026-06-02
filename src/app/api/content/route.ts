import { NextRequest, NextResponse } from 'next/server';
import { ContentPolish, ContentType } from '@/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function systemPrompt(type: ContentType): string {
  if (type === 'youtube') {
    return `You are a YouTube strategist. The user drops in a rough video idea or title. Turn it into a production-ready brief.

Respond ONLY with valid JSON (no markdown, no explanation) in this exact shape:
{
  "title": "a punchy, curiosity-driven YouTube title under 70 characters",
  "hook": "the first 5-10 seconds spoken hook + a thumbnail concept, 1-2 sentences",
  "outline": "a beat-by-beat script outline: an intro hook, 3-5 numbered sections, and a closing call-to-action. Use newlines between beats."
}

Keep it concrete and specific to the idea. Do not invent a different topic.`;
  }
  return `You are a short-form (Instagram Reels / TikTok) strategist. The user drops in a rough reel idea. Turn it into a production-ready brief for a 20-45 second vertical video.

Respond ONLY with valid JSON (no markdown, no explanation) in this exact shape:
{
  "title": "a short, scroll-stopping title/caption",
  "hook": "the first 1-2 seconds: the spoken or on-screen text hook that stops the scroll",
  "outline": "a tight shot list of 3-5 quick beats that fit in under 45 seconds, plus the on-screen text per beat. Use newlines between beats."
}

Keep it punchy and specific to the idea. Do not invent a different topic.`;
}

export async function POST(request: NextRequest) {
  try {
    const { rawTitle, type, context } = await request.json();

    if (!rawTitle || typeof rawTitle !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: rawTitle is required' },
        { status: 400 }
      );
    }
    const contentType: ContentType = type === 'reel' ? 'reel' : 'youtube';

    if (!OPENAI_API_KEY) {
      return NextResponse.json(mockPolish(rawTitle, contentType));
    }

    let userMessage = `Idea: ${rawTitle}`;
    if (context && typeof context === 'string' && context.trim()) {
      userMessage = `CREATOR CONTEXT (their goals/projects — align the angle to these):\n${context}\n\n---\n\nIdea: ${rawTitle}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt(contentType) },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return NextResponse.json({ error: 'Failed to polish idea' }, { status: 500 });
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
    const parsed: ContentPolish = JSON.parse(jsonContent);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Content polish error:', error);
    return NextResponse.json({ error: 'Failed to polish idea' }, { status: 500 });
  }
}

// Fallback so the board still works without an API key.
function mockPolish(rawTitle: string, type: ContentType): ContentPolish {
  const clean = rawTitle.trim().replace(/^[-•*]\s*/, '');
  if (type === 'youtube') {
    return {
      title: clean,
      hook: `Open on the single most surprising claim about "${clean}", then promise the payoff.`,
      outline: [
        '0:00 Hook — the surprising promise',
        '0:30 Context — why this matters now',
        '1. The core idea / demo',
        '2. The mistake most people make',
        '3. The better approach, step by step',
        'CTA — subscribe + next video',
      ].join('\n'),
    };
  }
  return {
    title: clean,
    hook: `On-screen text: "${clean}" — say the boldest line in the first second.`,
    outline: [
      'Beat 1 (0-2s): Hook line + bold on-screen text',
      'Beat 2 (2-10s): The point, fast',
      'Beat 3 (10-25s): One quick example / proof',
      'Beat 4 (25-35s): Payoff + CTA ("follow for more")',
    ].join('\n'),
  };
}
