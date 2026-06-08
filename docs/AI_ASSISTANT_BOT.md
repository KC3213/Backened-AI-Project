# Project Assistant Bot

## What Was Added

The project workspace now has an Assistant tab. It helps a project member quickly understand:

- what the recent group conversation is about
- which tickets need the most attention
- what the next practical steps should be

The assistant is available inside a project, next to the Chat and Work tabs.

## Backend Flow

The frontend calls:

```text
POST /projects/:projectId/assistant/summary
```

This route is protected by the normal auth middleware. The service loads the project through the same membership check used by the project details endpoint, so users can only summarize projects they belong to.

The backend then builds a compact project payload:

- recent 40 chat messages
- all project tickets
- ticket title, description, priority, status, assignee, submissions, and timestamps
- counts for messages, tickets, and open tickets

If `GROQ_API_KEY` is configured, the backend asks Groq for JSON in this shape:

```json
{
  "conversationSummary": "short summary",
  "importantTickets": [
    {
      "ticketId": "id",
      "title": "ticket title",
      "priority": "urgent",
      "status": "review",
      "assignee": "person",
      "reason": "why it matters"
    }
  ],
  "recommendedNextSteps": ["step"]
}
```

The response is normalized before sending it to the frontend. If Groq is unavailable, not configured, or returns invalid JSON, the backend falls back to a local heuristic summary instead of failing the feature.

## Local Fallback Logic

The local assistant ranks open tickets using simple project-management signals:

- urgent and high priority tickets score higher
- review and in-progress tickets score higher than todo tickets
- unassigned open tickets get extra attention
- tickets with submissions are highlighted because they may need review

This fallback is useful for development, demos, and environments without a Groq key.

## Frontend Flow

The Project screen now has a third tab:

```text
Chat | Work | Assistant
```

The Assistant tab shows:

- project intelligence header with message/ticket/open-ticket counts
- source badge showing Groq or Local analysis
- conversation summary
- recommended next steps
- important tickets with priority, status, assignee, and reason

The assistant summary is invalidated when project chat or ticket work changes, and users can refresh it manually.

## Bottlenecks

The current implementation reads the project document and summarizes recent messages on demand. This is fine for the current app size, but the main bottlenecks are:

- very large projects with many stored messages
- large ticket descriptions increasing prompt size
- repeated manual refreshes calling Groq
- AI latency if the Groq API is slow

The service already limits recent messages and truncates text before sending it to Groq, which keeps the prompt controlled.

## Scaling Plan

For larger teams, the assistant can be improved with:

- cached assistant summaries per project
- automatic regeneration after a meaningful chat/ticket change
- message pagination instead of storing and reading all messages from the project document
- separate message collection for better indexing
- background jobs for AI summarization
- embeddings or search for long-term conversation memory
- sprint-aware ticket ranking
- role-aware recommendations for admins, assignees, and reviewers

## Files Changed

- `backend/services/ai.service.js`
- `backend/services/project.service.js`
- `backend/controllers/project.controller.js`
- `backend/routes/project.routes.js`
- `frontend/src/screens/Project.jsx`
- `README.md`
