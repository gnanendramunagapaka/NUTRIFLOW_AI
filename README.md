# NutriFlow AI

> **AI-powered nutrition and wellness copilot that helps users make
> personalized food, grocery, and dining decisions through a unified
> experience.**

NutriFlow AI combines a personalized nutrition profile, recommendation
engine, conversational AI, and real-time Swiggy MCP integrations to help
users discover food, groceries, and dining options that align with their
goals, preferences, dietary restrictions, and budget.

## 🚀 Project Overview

NutriFlow is designed around one central idea:

**Personalization should follow the user everywhere.**

A user's nutrition profile becomes the foundation for recommendations
across:

-   🍽️ Food delivery
-   🛒 Grocery shopping through Instamart
-   🍴 Dining out through Dineout
-   🤖 AI-powered conversational assistance
-   🏠 Personalized home/dashboard recommendations
-   📋 Meal plans and wellness tracking

Rather than building three independent recommendation systems, NutriFlow
uses a shared personalization and recommendation layer that can be
consumed by the Home experience, Explore sections, and AI Copilot.

------------------------------------------------------------------------

## 🎯 Problem

Food delivery and grocery platforms primarily optimize for discovery and
convenience. NutriFlow focuses on the user's **personal nutrition
context**.

A user may have:

-   A specific health or fitness goal
-   Dietary preferences
-   Foods they like or avoid
-   Allergies or dietary restrictions
-   Activity level
-   Meal preferences
-   Food and grocery budgets

NutriFlow uses this context to make recommendations more relevant and
consistent across different food-related activities.

For example, a user pursuing a muscle-building goal should receive
recommendations that reflect that goal across food discovery, grocery
shopping, dining out, and AI conversations---not just on a single
screen.

------------------------------------------------------------------------

## ✨ Core Features

### 1. Personalized Onboarding

NutriFlow collects a structured nutrition and lifestyle profile
including:

-   Age
-   Height and weight
-   Primary goal
-   Diet type
-   Preferred foods
-   Foods to avoid
-   Allergies
-   Dietary restrictions
-   Activity level
-   Exercise preferences
-   Daily routine
-   Food budget
-   Grocery budget

This profile becomes the foundation for personalization throughout the
application.

### 2. Unified Food Discovery

Users can discover real restaurant options through Swiggy Food MCP.

The Food integration supports read-only discovery flows including:

-   Saved addresses
-   Restaurant search
-   Restaurant menus
-   Menu search
-   Restaurant/menu details

### 3. Personalized Grocery Discovery

NutriFlow integrates with Swiggy Instamart to discover real grocery
products.

The integration supports:

-   Saved addresses
-   Product search
-   Product/variant discovery
-   Personalized grocery recommendation workflows

### 4. Dining Out

Dineout is treated as a separate but connected part of the nutrition
journey.

Users can:

-   Discover nearby restaurants
-   View restaurant details
-   See cuisines, ratings, pricing and timings
-   Check dining availability
-   Receive recommendations based on their profile

NutriFlow does not assume that restaurant-level information is
equivalent to verified nutritional information. Recommendations
therefore distinguish between available facts and inferred suitability.

### 5. AI Copilot

The planned AI Copilot provides a conversational interface for nutrition
and food-related decisions.

Example interactions:

``` text
"What should I eat for dinner?"

"Find me a high-protein meal under ₹300."

"What groceries do I need for this week's meal plan?"

"I don't want delivery today. Find a place nearby where I can eat."

"What should I buy from Instamart to support my meal plan?"
```

The AI layer is designed to use NutriFlow's recommendation services and
controlled backend tools rather than directly accessing external
commerce systems.

### 6. Cross-Application Personalization

The same user profile drives recommendations across:

``` text
Home
  ├── Food recommendations
  ├── Grocery recommendations
  └── Dining recommendations

AI Copilot
  └── Profile-aware conversations

Explore
  ├── Food
  ├── Instamart
  └── Dineout
```

Changing a user's goal, dietary preference, restriction, or budget
should eventually affect recommendations throughout the application.

### 7. Mobile-First Experience

NutriFlow is being developed as a responsive, mobile-first web
application with an app-like experience.

The architecture is designed to support a future Progressive Web App
(PWA) experience without requiring a separate native mobile codebase.

------------------------------------------------------------------------

# 🏗️ Architecture

``` text
                         NUTRIFLOW
                            │
             ┌──────────────┴──────────────┐
             │                             │
        React Frontend                 AI Copilot
             │                             │
             │                          Gemini
             │                             │
             │                    Tool / Function Calling
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │ NutriFlow Backend   │
                  │ Node.js / TypeScript│
                  └──────────┬──────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
          Profile Context  Recommendation  AI
             Service          Engine      Services
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
                  ▼             ▼             ▼
                Food        Instamart      Dineout
                  │             │             │
                  ▼             ▼             ▼
              Swiggy MCP    Swiggy MCP    Swiggy MCP
                  │             │             │
                  └─────────────┼─────────────┘
                                │
                                ▼
                         Supabase PostgreSQL
```

### Architectural Principles

#### Frontend → NutriFlow Backend → Swiggy MCP

The React frontend does **not** directly call Swiggy MCP.

Instead:

``` text
React
  ↓
NutriFlow API
  ↓
Authenticated Swiggy MCP
  ↓
Swiggy response
  ↓
NutriFlow backend
  ↓
React
```

This keeps authentication, business logic, personalization, validation,
and external integrations server-side.

#### Shared Recommendation Layer

Food, Instamart, Dineout, Home, and AI Copilot are designed to consume a
common recommendation layer.

``` text
User Profile
     ↓
Profile Context
     ↓
Safety / Constraint Filtering
     ↓
Recommendation Scoring
     ↓
Domain Adapter
     ↓
Swiggy MCP
     ↓
Normalized Results
     ↓
Ranked Recommendations
```

------------------------------------------------------------------------

# 🧠 Recommendation Engine

The recommendation engine is designed as a hybrid, explainable system
rather than relying on an LLM for every recommendation.

### Candidate factors

Recommendations can consider:

-   Goal alignment
-   Diet compatibility
-   Food preferences
-   Foods to avoid
-   Allergies and restrictions
-   Budget
-   Availability
-   Location/distance
-   User history
-   Current nutrition context

Conceptually:

``` text
Recommendation Score
=
Goal Match
+ Diet Match
+ Preference Match
+ Constraint Safety
+ Budget Match
+ Availability
+ Context
+ User History
```

Hard constraints such as allergies and explicit foods to avoid should be
handled by deterministic backend rules rather than allowing an LLM to
override them.

### Domain adapters

The recommendation layer is designed to normalize different external
data models:

``` text
Swiggy Food
     ↓
Food Adapter
     ↓
Normalized Food Result

Swiggy Instamart
     ↓
Grocery Adapter
     ↓
Normalized Grocery Result

Swiggy Dineout
     ↓
Dineout Adapter
     ↓
Normalized Dining Result
```

This keeps the frontend independent of raw MCP response structures.

------------------------------------------------------------------------

# 🤖 AI Architecture

The AI Copilot is designed as a conversational layer on top of
NutriFlow's controlled backend services.

``` text
User
 ↓
AI Chat UI
 ↓
NutriFlow AI API
 ↓
Gemini
 ↓
Tool / Function Calling
 ↓
NutriFlow Services
 ├── Profile Context
 ├── Recommendation Engine
 ├── Food
 ├── Instamart
 └── Dineout
 ↓
Gemini
 ↓
User
```

Gemini is responsible for conversational understanding and response
generation.

The recommendation engine is responsible for consistent personalization
and constraint handling.

External commerce APIs are accessed through NutriFlow backend services
rather than directly by the model.

------------------------------------------------------------------------

# 🛠️ Technology Stack

## Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   shadcn/ui
-   Responsive/mobile-first UI
-   Progressive Web App support planned

## Backend

-   Node.js
-   TypeScript
-   Vercel Serverless Functions
-   REST APIs
-   Zod validation

## Database

-   Supabase
-   PostgreSQL
-   Drizzle ORM
-   Row Level Security (RLS)

## AI

-   Google Gemini API
-   Function/tool calling
-   Structured outputs
-   Streaming responses

> Gemini integration is part of the planned AI layer; the initial
> implementation prioritizes the production Swiggy integration and
> deterministic recommendation architecture.

## External Integration

-   Swiggy MCP
    -   Food
    -   Instamart
    -   Dineout
-   OAuth 2.1 + PKCE
-   Dynamic Client Registration

## Deployment

-   Vercel
-   Supabase

------------------------------------------------------------------------

# 🔐 Authentication & Security

NutriFlow uses Swiggy authentication for the connected commerce
experience.

The current architecture includes:

-   OAuth 2.1 + PKCE
-   Dynamic Client Registration
-   Server-side Swiggy access-token storage
-   HttpOnly session cookie
-   Secure / SameSite cookie configuration
-   Server-side MCP requests
-   Supabase Row Level Security
-   Environment-based secret management

Sensitive credentials are not exposed to the React client.

------------------------------------------------------------------------

# 🔌 Swiggy MCP Integration

NutriFlow has a production Swiggy MCP integration.

### Food

Validated production flows:

``` text
get_addresses
     ↓
search_restaurants
     ↓
get_restaurant_menu
     ↓
search_menu
```

### Instamart

Validated production flows:

``` text
get_addresses
     ↓
search_products
```

### Dineout

Validated production flows:

``` text
get_saved_locations
     ↓
search_restaurants_dineout
     ↓
get_restaurant_details
     ↓
get_available_slots
```

The integration uses Streamable HTTP and authenticated server-side
requests.

------------------------------------------------------------------------

# 📱 Product Structure

The planned product experience is organized into:

### Onboarding

``` text
Welcome
  ↓
Swiggy Connection
  ↓
Personal Profile
  ↓
Goal
  ↓
Diet & Preferences
  ↓
Allergies & Restrictions
  ↓
Activity & Routine
  ↓
Budget
  ↓
Profile Summary
```

### Main Application

``` text
Home
AI Copilot
Explore
 ├── Food
 ├── Instamart
 └── Dineout
Profile
```

### Details

``` text
Restaurant Details
Product Details
Meal Plans
Nutrition Analyzer
Saved Items
Notifications
```

### Commerce

Each Swiggy domain maintains its own appropriate transaction flow:

``` text
Food
  → Food Cart
  → Food Checkout
  → Food Order

Instamart
  → Grocery Cart
  → Grocery Checkout
  → Grocery Order

Dineout
  → Restaurant
  → Availability
  → Table Booking
```

NutriFlow does not assume that Food, Instamart, and Dineout should share
a single underlying Swiggy transaction.

------------------------------------------------------------------------

# 📊 Data Model

The application uses Supabase/PostgreSQL for NutriFlow-owned application
data.

Core entities include:

``` text
user_profiles
onboarding_preferences
wellness_tracking
ai_conversations
ai_messages
saved_meals
grocery_plans
grocery_plan_items
cart_items
user_swiggy_tokens
app_settings
```

The data model separates NutriFlow application state from external
Swiggy authentication and commerce data.

------------------------------------------------------------------------

# 🗺️ Development Roadmap

## Phase 1 --- Platform Foundation

-   [x] React/Vite application
-   [x] Supabase/PostgreSQL
-   [x] NutriFlow backend
-   [x] Swiggy OAuth integration
-   [x] Server-side MCP architecture
-   [x] Production authentication
-   [x] Food MCP validation
-   [x] Instamart MCP validation
-   [x] Dineout MCP validation

## Phase 2 --- Product UI

-   [ ] Mobile-first application shell
-   [ ] Onboarding flow
-   [ ] Profile management
-   [ ] Home dashboard
-   [ ] Explore experience
-   [ ] Food experience
-   [ ] Instamart experience
-   [ ] Dineout experience
-   [ ] Product/restaurant detail pages

## Phase 3 --- Recommendation Engine

-   [ ] Profile context service
-   [ ] Dietary constraint engine
-   [ ] Allergy filtering
-   [ ] Goal matching
-   [ ] Budget matching
-   [ ] Food recommendation scoring
-   [ ] Grocery recommendation scoring
-   [ ] Dineout recommendation scoring
-   [ ] Normalized recommendation models
-   [ ] Cross-application personalization

## Phase 4 --- AI Copilot

-   [ ] Gemini integration
-   [ ] Streaming AI responses
-   [ ] Tool/function calling
-   [ ] Profile-aware conversations
-   [ ] Recommendation tools
-   [ ] Food search tools
-   [ ] Instamart search tools
-   [ ] Dineout search tools
-   [ ] Conversational meal planning

## Phase 5 --- Commerce

-   [ ] Food cart flow
-   [ ] Food checkout/order flow
-   [ ] Instamart cart flow
-   [ ] Instamart checkout/order flow
-   [ ] Dineout availability
-   [ ] Dineout booking
-   [ ] Order/booking history

## Phase 6 --- Advanced Personalization

-   [ ] User feedback signals
-   [ ] Recommendation history
-   [ ] Behavioral personalization
-   [ ] Nutrition knowledge base
-   [ ] pgvector/embeddings
-   [ ] RAG for nutrition knowledge
-   [ ] Advanced personalization models

------------------------------------------------------------------------

# 📁 High-Level Repository Structure

``` text
Asset-Manager/
├── artifacts/
│   ├── nutriflow/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── ...
│   │   └── ...
│   │
│   └── api-server/
│       └── src/
│           ├── routes/
│           ├── lib/
│           ├── services/
│           └── ...
│
├── ...
└── README.md
```

The exact structure may evolve as the recommendation and AI services are
introduced.

------------------------------------------------------------------------

# 🧪 Current Integration Status

NutriFlow's external Swiggy integration has been validated against
production MCP endpoints.

### Verified

  Integration                  Status
  ---------------------------- --------
  Swiggy OAuth                 ✅
  Food MCP                     ✅
  Food restaurant search       ✅
  Food menu discovery          ✅
  Instamart MCP                ✅
  Instamart product search     ✅
  Dineout MCP                  ✅
  Dineout restaurant search    ✅
  Dineout restaurant details   ✅
  Dineout availability         ✅

The project is currently transitioning from a prototype/mock-data
experience toward the full personalized architecture described above.

------------------------------------------------------------------------

# 🎓 AI Engineering Focus

NutriFlow is being designed as more than a UI project. The AI
engineering focus includes:

-   Hybrid rule-based + AI recommendation architecture
-   Profile-aware personalization
-   Deterministic safety and dietary constraints
-   LLM tool/function calling
-   AI orchestration
-   Structured outputs
-   External MCP tool integration
-   Real-time data retrieval
-   Domain-specific adapters
-   Recommendation scoring
-   Conversational AI
-   Future RAG/embedding-based knowledge retrieval
-   Future behavioral personalization

The goal is to build an AI system where the LLM is **grounded in user
context and controlled application services**, rather than acting as an
isolated chatbot.

------------------------------------------------------------------------

# ⚠️ Disclaimer

NutriFlow is a technology project focused on personalized food and
lifestyle recommendations. Recommendations are intended as
decision-support and should not be treated as medical diagnosis or
professional medical advice.

------------------------------------------------------------------------

# 📌 Project Status

**Status:** Active Development

Current priority:

``` text
Production Swiggy MCP
        ↓
Mobile-first NutriFlow UI
        ↓
Central Recommendation Engine
        ↓
Gemini AI Copilot
        ↓
Commerce & Dining Flows
        ↓
Advanced Personalization
```

------------------------------------------------------------------------

## Author

**Sai Uma Devi Munagapaka**

B.Tech --- Computer Science & Engineering (AI & ML)

Interested in:

-   Artificial Intelligence
-   Machine Learning
-   Generative AI
-   AI Agents
-   Backend Engineering
-   Intelligent Recommendation Systems
-   Full-Stack AI Applications


