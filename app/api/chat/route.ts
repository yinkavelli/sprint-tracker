import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const systemPrompt = `You are a helpful AI assistant for the Sprint Tracker app. Your role is to help users set up and define their sprints/goals by asking relevant, clarifying questions.

When a user wants to create a sprint, guide them through the process by:
1. Understanding their goal/sprint objective
2. Asking about scope and deliverables
3. Clarifying timeline and deadlines
4. Identifying key metrics for success
5. Breaking down into actionable items

Be conversational, encouraging, and help users think through their goals clearly. Keep responses concise and actionable. At the end, summarize what they want to create and ask for confirmation.`

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 500,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
