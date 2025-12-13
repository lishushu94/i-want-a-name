export type OpenRouterModel = {
  id: string
}

export async function fetchOpenRouterModels(
  baseUrl: string,
  apiKey: string,
  extraHeaders?: Record<string, string>,
): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    },
  })

  if (!response.ok) {
    let message = `OpenRouter models request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.error?.message) message = body.error.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const data = await response.json()
  const models: unknown = data?.data ?? data?.models ?? data

  const list = Array.isArray(models) ? models : []
  const ids = list
    .map((m: any) => (typeof m?.id === "string" ? m.id : ""))
    .filter((id) => id.trim().length > 0)

  // De-dupe + stable sort
  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b))
}

