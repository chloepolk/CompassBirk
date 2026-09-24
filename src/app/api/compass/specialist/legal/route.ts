import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { LEGAL_SCHEMA } from "@/app/compass/agents/_tender-types"
import { TENDER_LEGAL_PROMPT, tenderLanguageInstruction } from "@/app/compass/agents/_tender-prompts"
import type { Locale } from "@/app/compass/_i18n/types"
import { componentById, documentById } from "@/app/compass/data/_documents"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const openai = getClient()
  const gemini = getGeminiClient()
  const client = openai || gemini
  if (!client) return fallbackResponse()

  try {
    const { componentId, locale: requestedLocale } = await req.json()
    const locale: Locale = requestedLocale === "de" ? "de" : "en"
    const spec = componentById(componentId)
    if (!spec) return errorResponse(new Error("Unknown component"))
    const terms = documentById("s7-scm-tc-2026")

    const userContent = `Component to tender: ${spec.name} (${spec.docRef}).
STANDARD TERMS AND CONDITIONS OF PROCUREMENT (source of truth):
${terms?.fullText ?? ""}
Assemble Section 4.0 Commercial & Legal Terms.`

    const response = await callWithRetry(
      client,
      {
        model: openai ? MODELS.openai : MODELS.gemini,
        temperature: 0.1,
        messages: [
          { role: "system", content: `${TENDER_LEGAL_PROMPT}\n\n${tenderLanguageInstruction(locale)}` },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_schema", json_schema: LEGAL_SCHEMA },
      },
      openai ? gemini : null,
      MODELS.gemini,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from legal agent"))

    return Response.json({ fallback: false, data: extractJson(content) })
  } catch (err) {
    return errorResponse(err)
  }
}
