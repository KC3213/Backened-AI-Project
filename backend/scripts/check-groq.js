import 'dotenv/config'
import { generateProjectAssistantResult } from '../services/ai.service.js'

const getProxyHost = () => {
    const proxy = process.env.GROQ_PROXY_URL
        || process.env.HTTPS_PROXY
        || process.env.HTTP_PROXY
        || process.env.https_proxy
        || process.env.http_proxy

    if (!proxy) {
        return ''
    }

    try {
        return new URL(proxy).host
    } catch {
        return 'invalid-proxy-url'
    }
}

const startedAt = Date.now()

try {
    const result = await generateProjectAssistantResult(
        'Return JSON only: {"conversationSummary":"Groq connectivity works","importantTickets":[],"recommendedNextSteps":[]}'
    )

    console.log(JSON.stringify({
        ok: true,
        provider: 'groq',
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        proxyHost: getProxyHost(),
        ms: Date.now() - startedAt,
        preview: result.slice(0, 160),
    }, null, 2))
} catch (error) {
    console.error(JSON.stringify({
        ok: false,
        provider: 'groq',
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        hasGroqKey: Boolean(process.env.GROQ_API_KEY),
        proxyHost: getProxyHost(),
        ms: Date.now() - startedAt,
        errorName: error.name,
        errorMessage: error.message,
    }, null, 2))

    process.exitCode = 1
}
