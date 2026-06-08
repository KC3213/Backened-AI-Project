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

const getProxyUrl = () => process.env.HTTPS_PROXY
    || process.env.HTTP_PROXY
    || process.env.https_proxy
    || process.env.http_proxy

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

const postJsonThroughHttpProxy = ({ targetUrl, proxyUrl, headers, body }) => {
    return new Promise((resolve, reject) => {
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
                reject(new Error(`Proxy CONNECT failed with status ${connectResponse.statusCode}`))
                return
            }

            const secureSocket = tls.connect({
                socket: proxySocket,
                servername: targetUrl.hostname,
            }, () => {
                const request = http.request({
                    host: targetUrl.hostname,
                    port: targetUrl.port || 443,
                    path: `${targetUrl.pathname}${targetUrl.search}`,
                    method: 'POST',
                    headers: {
                        Host: targetUrl.host,
                        ...headers,
                    },
                    agent: false,
                    createConnection: () => secureSocket,
                }, (response) => {
                    let responseBody = ''

                    response.setEncoding('utf8')
                    response.on('data', chunk => {
                        responseBody += chunk
                    })
                    response.on('end', () => {
                        resolve(createResponseLike({
                            statusCode: response.statusCode,
                            statusMessage: response.statusMessage,
                            body: responseBody,
                        }))
                    })
                })

                request.on('error', reject)
                request.write(body)
                request.end()
            })

            secureSocket.on('error', reject)
        })

        connectRequest.on('timeout', () => {
            connectRequest.destroy(new Error('Proxy CONNECT timed out'))
        })
        connectRequest.on('error', reject)
        connectRequest.end()
    })
}

const postJson = async (url, payload, headers) => {
    const body = JSON.stringify(payload)
    const requestHeaders = {
        ...headers,
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

    const response = await postJson(groqChatCompletionsUrl, {
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
