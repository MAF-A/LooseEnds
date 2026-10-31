export async function runEngine(payload) {
  const { apiKey, ...body } = payload
  const headers = { 'Content-Type': 'application/json' }
  
  if (apiKey) {
    headers['X-Custom-Api-Key'] = apiKey
  }

  let res
  try {
    res = await fetch('/api/review/', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Network error. Is the Django server running?')
  }

  if (res.status === 429) {
    throw new Error('Rate limit reached. Please wait a minute before reviewing again.')
  }

  if (!res.ok) {
    let detail = `Request failed (HTTP ${res.status})`
    try {
      const data = await res.json()
      if (data.code && Array.isArray(data.code)) detail = data.code[0]
      else if (data.error) detail = data.error
      else if (data.detail) detail = data.detail
    } catch {}
    throw new Error(detail)
  }

  return res.json()
}

export async function sendFeedback(originalCode, aiFinalCode, userCorrectedCode, reason) {
  let res
  try {
    res = await fetch('/api/feedback/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        original_code: originalCode, 
        ai_final_code: aiFinalCode, 
        user_corrected_code: userCorrectedCode, 
        reason 
      }),
    })
  } catch {
    throw new Error('Network error. Could not save feedback.')
  }

  if (!res.ok) {
    throw new Error('Failed to save feedback.')
  }

  return res.json()
}