# Project Xeno - CRM & Gemini-Powered Marketing Platform

## Overview

Project Xeno is a comprehensive Customer Relationship Management (CRM) and AI-powered marketing automation platform. It enables businesses to manage customer relationships, orchestrate targeted marketing campaigns with sophisticated audience segmentation, and leverage Google Gemini for advanced content creation, audience generation, scheduling suggestions, and campaign insights. The system features a Next.js client for a rich user experience and a robust Node.js/Express/MongoDB backend for API services and data management, with Redis used for asynchronous task processing.

**Job Selection Note:** This README has been significantly updated based on newly provided files, detailing the integrated AI functionalities.

## Architecture

The platform consists of two main parts:

1.  **Client Application (Next.js):** Provides the user interface for all platform functionalities.
2.  **Server Application (Node.js/Express):** Handles core business logic, data storage, and serves the main API, including integrated AI capabilities powered by Google Gemini via the `@google/genai` SDK.

## 1. Client Application (Frontend)

Located in the `client/` directory.

-   **Framework:** Next.js 15+
-   **Language:** TypeScript
-   **UI:** React, Tailwind CSS, Shadcn UI components (e.g., `label.tsx`, `separator.tsx`, `table.tsx`, `dialog.tsx` etc.)
-   **State Management:** Zustand (`client/src/store/` for `auth`, `campaign`, `customer`, `order`, `ui` stores).
-   **API Interaction:** Axios (`client/src/lib/api/`)
-   **Key Features Implemented:**
    *   User Authentication.
    *   Dashboard (likely utilizing data from `/api/dashboard` endpoints).
    *   Campaign Creation & Management:
        *   Drag-and-Drop Rule Builder for audience segmentation.
        *   Audience preview.
    *   Order Management (e.g., `client/src/components/orders/create-order-dialog.tsx`).
    *   **AI-Assisted Features (Interacting with `/api/ai` on the main server):**
        *   Natural Language to Segment Rules (`NLRuleGenerator.tsx`).
        *   AI Message Suggestions (`MessageGenerator.tsx`).
        *   Campaign Performance Insights (`CampaignInsights.tsx`).
        *   (Potentially UIs for new AI features: scheduling, lookalike audiences, auto-tagging, image suggestions).
-   **Build & Run:** Standard Next.js (`npm install`, `npm run dev`, etc.).

## 2. Server Application (Backend)

Located in the `server/` directory.

-   **Framework:** Node.js with Express.js
-   **Language:** TypeScript
-   **AI Integration:** Google Gemini via `@google/genai` SDK (`server/src/services/geminiService.ts`). Model used: `gemini-2.0-flash`.
-   **Database:** MongoDB.
-   **Asynchronous Processing:** Redis.
-   **Validation:** Joi & Zod.
-   **Authentication:** JWT, Google OAuth.
-   **API Base Path:** `/api` (e.g., `/api/auth`, `/api/campaigns`, `/api/ai`).

### Server-Side Key Features & Modules:

*   **Core CRM & Campaign Modules (Paths: `/api/auth`, `/api/customers`, `/api/orders`, `/api/campaigns`, `/api/communication`):**
    *   Authentication, Customer Management, Order Processing (event-driven via Redis), Campaign Orchestration, Communication Tracking.
    *   (Functionality largely as previously described in the README).
*   **Dashboard Module (`/api/dashboard`):**
    *   Provides data for the client-side dashboard (details of specific endpoints not analyzed but router is present).
*   **User Management (Partially Implemented/Mounted):**
    *   `user.router.ts` exists but is **not mounted** in `server/src/api/index.ts`. Endpoints for user profile CRUD are inactive.

*   **AI Module (`/api/ai`) - Powered by `geminiService.ts`:**
    *   **`POST /segment-rules`**: Converts natural language to JSON segment rules.
        *   Input: `{ prompt: string }`
        *   Output: `{ rules: object }`
    *   **`POST /message-suggestions`**: Generates personalized marketing message templates.
        *   Input: `{ objective: string, audience?: string }`
        *   Output: `{ suggestions: string[] }`
    *   **`POST /campaign-insights`**: Analyzes campaign stats and generates insights/recommendations.
        *   Input: `{ campaignId?: string, stats?: object }` (fetches stats if not provided)
        *   Output: `{ insights: string }`
    *   **`GET /scheduling-suggestions`**: Recommends optimal campaign sending times.
        *   Input: Query param `campaignType?: string`
        *   Output: `{ bestDays, bestTimes, reasoning, audienceSpecific }`
    *   **`POST /lookalike-audience`**: Generates new segment rules for lookalike audiences from source rules.
        *   Input: `{ sourceRules: object }`
        *   Output: `{ rules: object }` (new rules)
    *   **`POST /auto-tag`**: Generates descriptive tags for campaigns.
        *   Input: `{ name?: string, segmentRules?: object, messageTemplate?: string }`
        *   Output: `{ tags: string[] }` (likely used for the `aiTags` field on campaigns)
    *   **`POST /image-suggestions`**: Suggests image concepts for campaigns.
        *   Input: `{ messageTemplate: string, audience?: string }`
        *   Output: `{ suggestions: [{ concept, rationale, colorScheme }, ...] }`

### Gemini Service (`server/src/services/geminiService.ts`):
-   Initializes `GoogleGenAI` with an API key (`config.gemini.apiKey`).
-   Uses `gemini-2.0-flash` model for content generation.
-   `generateText(prompt)`: Returns raw text output from Gemini.
-   `generateStructuredData(prompt)`: Appends "Please respond in JSON format only." to the prompt and attempts to parse the Gemini response as JSON, including handling markdown code blocks.

## Data Flow for AI Features (Examples)

1.  **Natural Language to Segment Rule:**
    *   Client (`NLRuleGenerator.tsx`) sends `{ prompt }` to `POST /api/ai/segment-rules`.
    *   Server (`ai.router.ts`) constructs a detailed system prompt (including JSON schema, field definitions) and the user's prompt.
    *   Calls `geminiService.generateStructuredData()`.
    *   Returns the JSON rules to the client.
2.  **Campaign Auto-Tagging:**
    *   Client (likely during campaign creation/update) sends campaign details to `POST /api/ai/auto-tag`.
    *   Server constructs a prompt for Gemini to categorize the campaign.
    *   Calls `geminiService.generateStructuredData()`.
    *   Returns `{ tags: [...] }` which can be saved with the campaign.

## Key Updates from New Files:

*   **Integrated AI Backend:** The AI features are now confirmed to be part of the main server application, using the `ai.router.ts` and `geminiService.ts`.
*   **Gemini Powered:** Google Gemini (`gemini-2.0-flash` model) is the core AI engine.
*   **New AI Capabilities:**
    *   Smart Scheduling Suggestions.
    *   Lookalike Audience Generation.
    *   Campaign Auto-Tagging.
    *   Product/Offer Image Suggestions.
*   **New Server Modules:** `dashboard.router.ts` is now present.
*   **Client-Side Expansion:** New UI components and Zustand stores (`customer-store.ts`, `order-store.tsx`) indicate a more feature-complete client.

## Potential Areas for Further Exploration & Improvement

*   **User Module Activation:** The `userRouter` needs to be mounted in `server/src/api/index.ts` for full user profile management.
*   **Gemini Model Choice:** While `gemini-2.0-flash` is specified, evaluate if more advanced Gemini models (e.g., `gemini-pro`) would provide better quality responses for complex generation tasks, balancing cost and capability.
*   **Prompt Engineering:** The prompts in `ai.router.ts` are well-defined. Continuous refinement and testing of these prompts will be key to AI feature quality.
*   **Error Handling in `geminiService`:** Robustly handle potential errors from the Gemini API and ensure graceful degradation if the AI service is unavailable.
*   **Security & Rate Limiting:** Especially for AI endpoints which can be resource-intensive.
*   **Client-Side UI for New AI Features:** Ensure intuitive UIs are built for the new AI capabilities like scheduling, lookalike audiences, etc.

This updated README reflects the new AI capabilities and provides a more accurate picture of Project Xeno's advanced functionalities.
