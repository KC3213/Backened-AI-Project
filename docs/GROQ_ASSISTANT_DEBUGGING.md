# Groq Assistant Debugging Notes

## Problem

The Project Assistant was expected to call Groq, but the UI kept showing local fallback summaries instead of Groq-generated output.

The first visible symptom was:

```text
Local fallback: GROQ_API_KEY is not configured
```

After adding the key, the symptom changed to:

```text
Local fallback: fetch failed
```

This proved there were two separate issues:

- the backend initially did not have `GROQ_API_KEY`
- after the key was added, the backend still could not reliably reach Groq

## Error Timeline

### 1. Missing API Key

Observed output:

```text
Local fallback: GROQ_API_KEY is not configured
```

Meaning:

- the Assistant endpoint was running
- the fallback path was working
- Groq was not being called because `GROQ_API_KEY` was missing from `backend/.env`

Fix:

```env
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.1-8b-instant
```

### 2. Node Could Not Reach Groq

Observed output:

```text
fetch failed
Connect Timeout Error
```

Meaning:

- the key existed
- Node tried to call Groq
- the request failed before Groq returned a response

Important discovery:

```bash
curl -I https://api.groq.com
```

worked, but Node `fetch()` failed. This showed that the machine could reach Groq through the network/proxy, but Node's built-in `fetch()` was not using the proxy automatically.

### 3. Proxy Was Not Visible To Backend

Diagnostic output:

```json
{
  "hasGroqKey": true,
  "proxyHost": "",
  "errorMessage": "fetch failed: getaddrinfo ENOTFOUND api.groq.com"
}
```

Meaning:

- the key was loaded
- no proxy was available to the backend process
- Node could not resolve or reach `api.groq.com`

Fix:

- added `GROQ_PROXY_URL` support
- made the Groq helper also read `HTTP_PROXY` and `HTTPS_PROXY`

Example:

```env
GROQ_PROXY_URL=http://www-proxy-hqdc.us.oracle.com:80
```

### 4. Proxy Was Detected But Request Still Failed

Observed output:

```json
{
  "proxyHost": "www-proxy-hqdc.us.oracle.com",
  "errorMessage": "Groq request failed before response: Unknown error"
}
```

Meaning:

- backend could see the proxy
- the request was still failing before Groq returned data
- the error handling was not detailed enough

Fix:

- improved error messages
- added structured fallback logs
- added a direct Groq diagnostic script

Command:

```bash
npm run check:groq
```

### 5. Proxy Tunnel Opened But No HTTP Response Was Parsed

Observed output:

```text
Groq response did not include HTTP headers
```

Meaning:

- the proxy tunnel was opening
- TLS/request handling was incorrect
- the request likely closed before a valid HTTP response was received

Fix:

- replaced the brittle proxy request flow
- used explicit HTTP proxy `CONNECT`
- opened TLS once to `api.groq.com`
- wrote a raw HTTP/1.1 POST over the secure socket
- parsed the HTTP response manually
- avoided closing the TLS socket too early

## Final Working Flow

The final request path is:

```text
Project Assistant endpoint
  -> build project summary prompt
  -> Groq helper
  -> HTTP proxy CONNECT
  -> TLS connection to api.groq.com
  -> raw HTTP/1.1 POST /openai/v1/chat/completions
  -> parse Groq JSON response
  -> return Assistant tab result
```

## Debugging Tools Added

### `npm run check:groq`

This command tests the exact Groq Assistant code path without using the UI.

It prints:

- whether Groq succeeded
- selected model
- whether the key exists
- proxy host
- request duration
- safe error message

It does not print the API key.

Example successful result:

```json
{
  "ok": true,
  "provider": "groq",
  "model": "llama-3.1-8b-instant",
  "proxyHost": "www-proxy-hqdc.us.oracle.com",
  "ms": 1200
}
```

### Structured Backend Fallback Log

When Groq fails, the backend logs:

```json
{
  "event": "project_assistant_fallback",
  "provider": "groq",
  "model": "llama-3.1-8b-instant",
  "hasGroqKey": true,
  "proxyHost": "www-proxy-hqdc.us.oracle.com",
  "errorMessage": "..."
}
```

This made the fallback measurable and explainable.

## Final Fixes

- Added `GROQ_API_KEY` and `GROQ_MODEL` configuration.
- Added optional `GROQ_PROXY_URL` for corporate proxy environments.
- Switched Assistant summaries to `llama-3.1-8b-instant` for faster responses.
- Added `max_tokens` to keep responses bounded.
- Added `npm run check:groq` for direct backend diagnostics.
- Filtered old generated AI error messages from Assistant summaries.
- Stabilized the proxy transport by using `CONNECT + TLS + raw HTTP/1.1`.

## Interview Explanation

The issue was not simply an invalid key. I separated the problem into three layers:

1. Configuration: confirmed `GROQ_API_KEY` existed without exposing it.
2. Network: proved curl could reach Groq, but Node could not because proxy handling was different.
3. Transport: fixed the backend's proxy tunnel implementation so the Node service could send Groq requests reliably behind a corporate proxy.

The main engineering decision was to add a safe diagnostic command and structured fallback logs instead of guessing from the UI. That made each failure mode visible and allowed the final fix to be verified independently from the frontend.
