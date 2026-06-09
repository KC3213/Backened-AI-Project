import { GoogleGenerativeAI } from "@google/generative-ai"
import http from 'node:http'
import tls from 'node:tls'


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `You are an expert in MERN and Development. You have an experience of 10 years in the development. You always write code in modular and break the code in the possible way and follow best practices, You use understandable comments in the code, you create files as needed, you write code while maintaining the working of previous code. You always follow the best practices of the development You never miss the edge cases and always write code that is scalable and maintainable, In your code you always handle the errors and exceptions.
    
    Examples: 

    <example>
 
    response: {

    "text": "this is you fileTree structure of the express server",
    "fileTree": {
        "app.js": {
            file: {
                contents: "
                const express = require('express');

                const app = express();


                app.get('/', (req, res) => {
                    res.send('Hello World!');
                });


                app.listen(3000, () => {
                    console.log('Server is running on port 3000');
                })
                "
            
        },
    },

        "package.json": {
            file: {
                contents: "

                {
                    "name": "temp-server",
                    "version": "1.0.0",
                    "main": "index.js",
                    "scripts": {
                        "test": "echo \"Error: no test specified\" && exit 1"
                    },
                    "keywords": [],
                    "author": "",
                    "license": "ISC",
                    "description": "",
                    "dependencies": {
                        "express": "^4.21.2"
                    }
}

                
                "
                
                

            },

        },

    },
    "buildCommand": {
        mainItem: "npm",
            commands: [ "install" ]
    },

    "startCommand": {
        mainItem: "node",
            commands: [ "app.js" ]
    }
}

    user:Create an express application 
   
    </example>


    
       <example>

       user:Hello 
       response:{
       "text":"Hello, How can I help you today?"
       }
       
       </example>
    
 IMPORTANT : don't use file name like routes/index.js
       
       
    `
});

const groqChatCompletionsUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions'
const groqProjectAssistantModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
const projectAssistantSystemInstruction = `You are a concise project management assistant for a Jira-style team workspace. Summarize project conversation, identify the most important tickets, and suggest practical next steps. Return only valid JSON that matches the requested shape.`

const getProxyUrl = () => process.env.GROQ_PROXY_URL
    || process.env.HTTPS_PROXY
    || process.env.HTTP_PROXY
    || process.env.https_proxy
    || process.env.http_proxy

const getErrorMessage = (error) => {
    if (!error) {
        return 'Unknown error (empty rejection)'
    }

    if (typeof error === 'string') {
        return error
    }

    const cause = error.cause?.message || error.cause?.code

    if (cause) {
        return `${error.message}: ${cause}`
    }

    if (error.message) {
        return error.message
    }

    try {
        return JSON.stringify(error)
    } catch {
        return 'Unknown error'
    }
}

const createProxyAuthHeader = (proxyUrl) => {
    if (!proxyUrl.username) {
        return {}
    }

    const credentials = `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`

    return {
        'Proxy-Authorization': `Basic ${Buffer.from(credentials).toString('base64')}`,
    }
}

const createResponseLike = ({ statusCode, statusMessage, body }) => ({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
    statusText: statusMessage,
    text: async () => body,
    json: async () => JSON.parse(body),
})

const decodeChunkedBody = (bodyBuffer) => {
    let offset = 0
    const chunks = []

    while (offset < bodyBuffer.length) {
        const lineEnd = bodyBuffer.indexOf('\r\n', offset, 'ascii')

        if (lineEnd === -1) {
            throw new Error('Invalid chunked response from Groq')
        }

        const sizeText = bodyBuffer.subarray(offset, lineEnd).toString('ascii').split(';')[ 0 ]
        const chunkSize = Number.parseInt(sizeText, 16)

        if (!Number.isFinite(chunkSize)) {
            throw new Error('Invalid chunk size in Groq response')
        }

        if (chunkSize === 0) {
            break
        }

        const chunkStart = lineEnd + 2
        const chunkEnd = chunkStart + chunkSize
        chunks.push(bodyBuffer.subarray(chunkStart, chunkEnd))
        offset = chunkEnd + 2
    }

    return Buffer.concat(chunks).toString('utf8')
}

const parseHttpResponse = (responseBuffer) => {
    const headerEnd = responseBuffer.indexOf('\r\n\r\n', 0, 'ascii')

    if (headerEnd === -1) {
        throw new Error('Groq response did not include HTTP headers')
    }

    const headerText = responseBuffer.subarray(0, headerEnd).toString('utf8')
    const bodyBuffer = responseBuffer.subarray(headerEnd + 4)
    const [ statusLine, ...headerLines ] = headerText.split('\r\n')
    const statusMatch = statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d+)\s*(.*)$/)

    if (!statusMatch) {
        throw new Error(`Invalid Groq response status line: ${statusLine}`)
    }

    const responseHeaders = headerLines.reduce((headers, line) => {
        const separatorIndex = line.indexOf(':')

        if (separatorIndex !== -1) {
            headers[ line.slice(0, separatorIndex).trim().toLowerCase() ] = line.slice(separatorIndex + 1).trim()
        }

        return headers
    }, {})
    const body = responseHeaders[ 'transfer-encoding' ]?.toLowerCase().includes('chunked')
        ? decodeChunkedBody(bodyBuffer)
        : bodyBuffer.toString('utf8')

    return createResponseLike({
        statusCode: Number.parseInt(statusMatch[ 1 ], 10),
        statusMessage: statusMatch[ 2 ],
        body,
    })
}

const postJsonThroughHttpProxy = ({ targetUrl, proxyUrl, headers, body }) => {
    return new Promise((resolve, reject) => {
        let settled = false
        const settleResolve = (value) => {
            if (!settled) {
                settled = true
                resolve(value)
            }
        }
        const settleReject = (error) => {
            if (!settled) {
                settled = true
                reject(error)
            }
        }
        const connectRequest = http.request({
            host: proxyUrl.hostname,
            port: proxyUrl.port || 80,
            method: 'CONNECT',
            path: `${targetUrl.hostname}:${targetUrl.port || 443}`,
            headers: createProxyAuthHeader(proxyUrl),
            timeout: 15000,
        })

        connectRequest.on('connect', (connectResponse, proxySocket) => {
            if (connectResponse.statusCode !== 200) {
                proxySocket.destroy()
                settleReject(new Error(`Proxy CONNECT failed with status ${connectResponse.statusCode}`))
                return
            }

            const secureSocket = tls.connect({
                socket: proxySocket,
                servername: targetUrl.hostname,
            }, () => {
                const requestHeaders = {
                    Host: targetUrl.host,
                    Connection: 'close',
                    ...headers,
                }
                const requestHeaderText = Object.entries(requestHeaders)
                    .map(([ key, value ]) => `${key}: ${value}`)
                    .join('\r\n')

                secureSocket.write(`POST ${targetUrl.pathname}${targetUrl.search} HTTP/1.1\r\n${requestHeaderText}\r\n\r\n`)
                secureSocket.write(body)
                secureSocket.end()
            })
            const responseChunks = []

            secureSocket.on('data', chunk => {
                responseChunks.push(chunk)
            })
            secureSocket.on('end', () => {
                try {
                    settleResolve(parseHttpResponse(Buffer.concat(responseChunks)))
                } catch (error) {
                    settleReject(error)
                }
            })
            secureSocket.on('timeout', () => {
                secureSocket.destroy(new Error('Groq request timed out after proxy CONNECT'))
            })
            secureSocket.setTimeout(30000)
            secureSocket.on('error', settleReject)
            proxySocket.on('error', settleReject)
        })

        connectRequest.on('timeout', () => {
            connectRequest.destroy(new Error('Proxy CONNECT timed out'))
        })
        connectRequest.on('error', settleReject)
        connectRequest.end()
    })
}

const postJson = async (url, payload, headers) => {
    const body = JSON.stringify(payload)
    const requestHeaders = {
        ...headers,
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
        'Content-Length': Buffer.byteLength(body),
    }
    const proxy = getProxyUrl()

    if (proxy) {
        return postJsonThroughHttpProxy({
            targetUrl: new URL(url),
            proxyUrl: new URL(proxy),
            headers: requestHeaders,
            body,
        })
    }

    return fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body,
    })
}

export const generateResult = async (prompt) => {

    const result = await model.generateContent(prompt);

    return result.response.text()
}

export const generateProjectAssistantResult = async (prompt) => {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not configured')
    }

    let response

    try {
        response = await postJson(groqChatCompletionsUrl, {
            model: groqProjectAssistantModel,
            messages: [
                {
                    role: 'system',
                    content: projectAssistantSystemInstruction,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.2,
            max_tokens: 450,
            response_format: {
                type: 'json_object',
            },
        }, {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        })
    } catch (error) {
        throw new Error(`Groq request failed before response: ${getErrorMessage(error)}`)
    }

    if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Groq request failed with status ${response.status}: ${errorBody}`)
    }

    const result = await response.json()
    const content = result.choices?.[ 0 ]?.message?.content

    if (!content) {
        throw new Error('Groq response did not include assistant content')
    }

    return content
}
