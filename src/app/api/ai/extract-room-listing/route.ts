import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { ROOM_EXTRACTION_TOOL, roomExtractionSchema, type RoomExtractionResult } from '@/features/rooms/ai/extractionSchema'

const bodySchema = z.object({
  text: z.string().min(20, 'Paste a bit more detail first.').max(4000),
})

// Bangladeshi mobile numbers, with or without +88/88 prefix — stripped from
// the model's output regardless of what the prompt asked for, since a listing
// description is public and shouldn't leak a phone number outside the
// platform's own (verified-user-gated) contact flow.
const BD_PHONE_RE = /(?:\+?88)?01[3-9]\d{8}/g

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !anthropicKey && 'ANTHROPIC_API_KEY',
  ].filter(Boolean)
  if (missing.length > 0) {
    return Response.json(
      { error: `AI-assisted posting is not configured — missing env var(s): ${missing.join(', ')}` },
      { status: 503 },
    )
  }

  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 5 extractions/hour/user — this hits a paid external API, unlike most
    // in-app actions, so the limit is tighter than e.g. send-email's 10/hour.
    const { allowed } = await rateLimit(`ai-extract:${user.id}`, 5, 60 * 60 * 1000)
    if (!allowed) {
      return Response.json({ error: 'Too many extraction attempts. Please wait before trying again.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    const parsedBody = bodySchema.safeParse(body)
    if (!parsedBody.success) {
      return Response.json({ error: parsedBody.error.issues[0].message }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const today = new Date().toISOString().slice(0, 10)

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        `You extract structured student-housing listing data from a raw post (Bangla and/or English, ` +
        `often copied from a Facebook "To-Let" group). Today's date is ${today} — use it to resolve ` +
        `relative dates like "from August" or "available from September" into a real yyyy-mm-dd date. ` +
        `Call the extract_room_listing tool exactly once with only the fields the text actually supports. ` +
        `Never include a phone number or "inbox/contact me" instruction in any field.`,
      tools: [ROOM_EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: ROOM_EXTRACTION_TOOL.name },
      messages: [{ role: 'user', content: parsedBody.data.text }],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return Response.json({ error: 'Could not extract details from that text' }, { status: 422 })
    }

    // Validate field-by-field rather than the whole object at once, so one
    // bad field (e.g. an enum value outside our fixed list) doesn't blank
    // out an otherwise-good extraction — the rest still merges into the form.
    const rawInput = (toolUse.input ?? {}) as Record<string, unknown>
    const data: Partial<RoomExtractionResult> = {}
    for (const [key, fieldSchema] of Object.entries(roomExtractionSchema.shape)) {
      if (!(key in rawInput)) continue
      const fieldResult = fieldSchema.safeParse(rawInput[key])
      if (fieldResult.success) (data as Record<string, unknown>)[key] = fieldResult.data
    }

    if (data.description) {
      data.description = data.description.replace(BD_PHONE_RE, '').trim()
    }

    return Response.json({ data })
  } catch (err) {
    console.error('[extract-room-listing]', err)
    return Response.json({ error: 'Failed to extract listing details' }, { status: 500 })
  }
}
