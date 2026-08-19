export type Assistant = {
  id: string
  slug: string
  name: string
  description: string
  system_prompt: string
  conversation_starters: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Conversation = {
  id: string
  assistant_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type MessageRole = "system" | "user" | "assistant" | "tool"

export type DBMessage = {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tool_name: string | null
  tool_input: Record<string, unknown> | null
  tool_output: Record<string, unknown> | null
  created_at: string
}
