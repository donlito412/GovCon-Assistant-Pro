export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/assistant/analyze-document
// Accepts: multipart/form-data with file (PDF ≤20MB)
//          OR JSON { url: "https://sam.gov/..." }
// Returns: { analysis: string, title: string, char_count: number }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase';
import { DOCUMENT_ANALYSIS_PROMPT } from '@/lib/ai/prompts';

export const maxDuration = 120;
const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const MODEL     = 'claude-sonnet-4-5';

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  return parsed.text ?? '';
}

async function fetchSamGovText(url: string): Promise<string> {
  // Try to fetch the SAM.gov opportunity description via their public API
  // SAM.gov opportunity URLs look like:
  // https://sam.gov/opp/{noticeId}/view
  const match = url.match(/sam\.gov\/opp\/([^\/]+)/);
  if (!match) throw new Error('Not a valid SAM.gov opportunity URL');

  const noticeId = match[1];
  const apiUrl = `https://api.sam.gov/opportunities/v2/search?noticeid=${noticeId}&api_key=${process.env.SAMGOV_API_KEY ?? 'DEMO_KEY'}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`SAM.gov API error: HTTP ${res.status}`);

  const json = await res.json();
  const opp = json.opportunitiesData?.[0];
  if (!opp) throw new Error('Opportunity not found on SAM.gov');

  const parts: string[] = [
    `TITLE: ${opp.title ?? ''}`,
    `SOLICITATION NUMBER: ${opp.solicitationNumber ?? ''}`,
    `AGENCY: ${opp.organizationHierarchy?.map((o: any) => o.name).join(' / ') ?? ''}`,
    `TYPE: ${opp.type ?? ''}`,
    `NAICS CODE: ${opp.naicsCode ?? ''}`,
    `RESPONSE DEADLINE: ${opp.responseDeadLine ?? ''}`,
    `DESCRIPTION:\n${opp.description ?? ''}`,
    `ATTACHMENTS: ${opp.attachments?.map((a: any) => a.name).join(', ') ?? 'None'}`,
  ];

  return parts.join('\n\n');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();

  const contentType = req.headers.get('content-type') ?? '';
  let docText = '';
  let docTitle = 'Uploaded Document';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 400 });
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }
    docTitle = file.name.replace(/\.pdf$/i, '');
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      docText = await extractPdfText(buffer);
    } catch (err) {
      return NextResponse.json({ error: `PDF extraction failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 422 });
    }
  } else {
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    if (body.url) {
      try {
        docText = await fetchSamGovText(body.url);
        docTitle = 'SAM.gov Opportunity';
      } catch (err) {
        return NextResponse.json({ error: `SAM.gov fetch failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 422 });
      }
    } else if (body.text) {
      docText = body.text;
      docTitle = body.title ?? 'Pasted Document';
    } else {
      return NextResponse.json({ error: 'Provide file (multipart), url, or text' }, { status: 400 });
    }
  }

  if (docText.trim().length < 100) {
    return NextResponse.json({ error: 'Document text is too short to analyze' }, { status: 422 });
  }

  // Truncate to ~100K chars to stay within context window
  const truncatedText = docText.length > 100_000 ? docText.slice(0, 100_000) + '\n\n[Document truncated at 100,000 characters]' : docText;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model:      MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${DOCUMENT_ANALYSIS_PROMPT}\n\n---\n\nDOCUMENT TITLE: ${docTitle}\n\nDOCUMENT TEXT:\n\n${truncatedText}`,
      },
    ],
  });

  const analysis = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).text)
    .join('');

  return NextResponse.json({
    analysis,
    title: docTitle,
    char_count: docText.length,
    truncated: docText.length > 100_000,
  });
}
