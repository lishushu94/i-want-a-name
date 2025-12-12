import type { Settings, Message, ToolCall } from "./types"
import { RECOMMEND_DOMAINS_TOOL } from "./types"

export const DEFAULT_SYSTEM_PROMPT = `你是一个专门帮助创业者推荐域名的AI助手，你的名字叫"i want a name"。

你的工作流程：
1. 通过对话了解用户的业务/产品类型
2. 询问他们的偏好（短域名、特定后缀、关键词、风格等）
3. 生成有创意且相关的域名建议

【重要】当推荐域名时，你必须在消息末尾使用以下JSON格式（包含每个域名的描述）：

\`\`\`domains
[
  {"domain": "RecipeAI.com", "description": "结合Recipe(食谱)和AI，直观传达产品是AI驱动的食谱助手"},
  {"domain": "CookSmart.io", "description": "Cook(烹饪)+Smart(智能)，体现智能烹饪理念，.io后缀适合技术产品"},
  {"domain": "ChefBot.app", "description": "Chef(厨师)+Bot(机器人)，暗示这是一个AI厨师助手"}
]
\`\`\`

域名推荐原则：
- 每次推荐5-8个域名
- 混合不同后缀（.com, .io, .co, .app, .dev, .ai）
- 注重品牌感和易记性
- 保持名称简短、易拼写
- 除非用户要求，否则避免连字符和数字
- description必须解释域名的含义、单词组合、为什么适合用户的产品

请用用户使用的语言回复。回复时先简短说明你的推荐思路，然后直接给出JSON格式的域名列表。

先问问用户他们的业务或产品想法是什么。`

export const DEFAULT_SYSTEM_PROMPT_WITH_TOOLS = `你是一个专门帮助创业者推荐域名的AI助手，你的名字叫"i want a name"。

你的工作流程：
1. 通过对话了解用户的业务/产品类型
2. 询问他们的偏好（短域名、特定后缀、关键词、风格等）
3. 使用 recommend_domains 工具推荐域名

【重要输出要求】
- 当推荐域名时，必须使用 recommend_domains 工具，但同时要输出可读的自然语言，不要只发送工具调用。
- 在调用工具前先用1-2句话总结你的推荐思路，并概括会提供的后缀/风格，例如“优先 .com，补充 .io/.app，突出科技和租赁调性”。
- 如果工具调用失败或不可用，仍需直接给出域名推荐的文本列表（保持同样的数量和描述）。

域名推荐原则：
- 每次推荐5-8个域名
- 混合不同后缀（.com, .io, .co, .app, .dev, .ai）
- 注重品牌感和易记性
- 保持名称简短、易拼写
- 除非用户要求，否则避免连字符和数字
- description必须解释域名的含义、单词组合、为什么适合用户的产品

请用用户使用的语言回复。

先问问用户他们的业务或产品想法是什么。`

/**
 * Check if the API supports OpenAI function calling
 */
function checkToolsSupport(settings: Settings): boolean {
  // User manually disabled
  if (settings.enableFunctionCalling === false) {
    return false
  }

  // Check endpoint (OpenAI or compatible)
  if (settings.apiEndpoint?.includes("openai.com")) {
    return true
  }

  // Check model name
  const supportedModels = ["gpt-4", "gpt-3.5-turbo", "gpt-4o"]
  if (supportedModels.some((m) => settings.model?.startsWith(m))) {
    return true
  }

  // User explicitly enabled
  return settings.enableFunctionCalling ?? false
}

export async function streamChat(
  messages: Message[],
  settings: Settings,
  onChunk: (chunk: string) => void,
  onToolCall: (toolCalls: ToolCall[]) => void,
  onComplete: () => void,
  onError: (error: string) => void,
): Promise<void> {
  if (!settings.apiKey) {
    onError("Please set your OpenAI API key in settings")
    return
  }

  const supportsTools = checkToolsSupport(settings)
  const systemPrompt =
    settings.systemPrompt?.trim() || (supportsTools ? DEFAULT_SYSTEM_PROMPT_WITH_TOOLS : DEFAULT_SYSTEM_PROMPT)

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const requestBody: any = {
    model: settings.model,
    messages: apiMessages,
    stream: true,
  }

  // Add tools parameter if supported
  if (supportsTools) {
    requestBody.tools = [RECOMMEND_DOMAINS_TOOL]
    requestBody.tool_choice = "auto"
  }

  try {
    const response = await fetch(`${settings.apiEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "API request failed" } }))
      onError(error.error?.message || "API request failed")
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError("Unable to read response")
      return
    }

    const decoder = new TextDecoder()

    // State for accumulating tool_calls
    interface StreamState {
      toolCallsMap: Map<number, ToolCall>
      currentContent: string
    }

    const state: StreamState = {
      toolCallsMap: new Map(),
      currentContent: "",
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n").filter((line) => line.trim() !== "")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") {
            // Trigger tool_call callback if we have accumulated tool calls
            if (state.toolCallsMap.size > 0) {
              const toolCalls = Array.from(state.toolCallsMap.values())
              onToolCall(toolCalls)
            }
            onComplete()
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta

            // Handle text content
            if (delta?.content) {
              state.currentContent += delta.content
              onChunk(delta.content)
            }

            // Handle tool_calls (accumulate arguments incrementally)
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index

                if (!state.toolCallsMap.has(index)) {
                  // First occurrence: initialize
                  state.toolCallsMap.set(index, {
                    id: toolCall.id || "",
                    type: "function",
                    function: {
                      name: toolCall.function?.name || "",
                      arguments: toolCall.function?.arguments || "",
                    },
                  })
                } else {
                  // Subsequent chunks: accumulate arguments
                  const existing = state.toolCallsMap.get(index)!
                  if (toolCall.function?.arguments) {
                    existing.function.arguments += toolCall.function.arguments
                  }
                  if (toolCall.id) existing.id = toolCall.id
                  if (toolCall.function?.name) existing.function.name = toolCall.function.name
                }
              }
            }
          } catch {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }
    }

    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error.message : "Unknown error")
  }
}

export function extractDomains(content: string): { domain: string; description?: string }[] {
  const match = content.match(/```domains\s*([\s\S]*?)```/)
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") {
              return { domain: item }
            } else if (typeof item === "object" && item.domain) {
              return { domain: item.domain, description: item.description }
            }
            return null
          })
          .filter(Boolean) as { domain: string; description?: string }[]
      }
    } catch (e) {
      console.log("[v0] Failed to parse domains JSON:", e)
      // Fallback: try to extract quoted strings
      const quoted = match[1].match(/"([^"]+\.(?:com|io|co|app|dev|ai|net|org))"/gi)
      if (quoted) {
        return quoted.map((q) => ({ domain: q.replace(/"/g, "") }))
      }
    }
  }
  return []
}

/**
 * Extract domains from tool_calls (function calling)
 */
export function extractDomainsFromToolCalls(toolCalls: ToolCall[]): { domain: string; description?: string }[] {
  const results: { domain: string; description?: string }[] = []

  for (const toolCall of toolCalls) {
    if (toolCall.function.name === "recommend_domains") {
      try {
        const args = JSON.parse(toolCall.function.arguments)
        if (Array.isArray(args.domains)) {
          results.push(...args.domains)
        }
      } catch (error) {
        console.error("[Function Call] Parse error:", error)
      }
    }
  }

  return results
}

/**
 * Unified extraction function (compatible with both new and old approaches)
 */
export function extractDomainsUnified(
  content: string,
  toolCalls?: ToolCall[],
): { domain: string; description?: string }[] {
  // Prioritize tool_calls
  if (toolCalls && toolCalls.length > 0) {
    const domains = extractDomainsFromToolCalls(toolCalls)
    if (domains.length > 0) {
      return domains
    }
  }

  // Fallback to text extraction (backward compatibility)
  return extractDomains(content)
}

export async function summarizeConversationTitle(firstMessage: string, settings: Settings): Promise<string> {
  if (!settings.apiKey) {
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "")
  }

  try {
    const response = await fetch(`${settings.apiEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: "system",
            content:
              "用10个字以内总结用户想要的域名类型，直接输出总结，不要任何解释或标点符号。例如：AI食谱助手、电商平台、社交APP",
          },
          { role: "user", content: firstMessage },
        ],
        max_tokens: 30,
      }),
    })

    if (!response.ok) {
      throw new Error("API request failed")
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim()
    return summary || firstMessage.slice(0, 30)
  } catch (error) {
    console.log("[v0] Failed to summarize title:", error)
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "")
  }
}
