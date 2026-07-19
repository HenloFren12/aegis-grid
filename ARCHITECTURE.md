# Aegis Grid — Architecture

## 1. Architectural Objective

Aegis Grid is a real-time stadium safety decision-support system centered on the **Organizer / Safety Command Center** persona.

Its architecture separates four responsibilities:

1. **Data acquisition** — gate telemetry, CSV uploads, and public SOS reports.
2. **Deterministic computation** — risk features, clustering, prioritization, and routing algorithms.
3. **Contextual reasoning** — Gemini-based interpretation where ambiguity or cross-signal judgment is useful.
4. **Operational presentation** — protected real-time dashboard, incident details, maps, and audit views.

The guiding rule is:

> **Deterministic code establishes measurable facts. Generative AI interprets context and explains operational meaning.**

## 2. High-Level Architecture

```text
                ORGANIZER                         FAN / WITNESS
                    │                                  │
                    ▼                                  ▼
          Protected Command Center                 Public SOS
                    │                                  │
                    └──────────────┬───────────────────┘
                                   ▼
                            Firebase Layer
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
                 gates                           reports
                   │                               │
                   ▼                               ▼
            Cloud Functions                 Cloud Functions
                   │                               │
                   ▼                               ▼
          computeGateRisk()                 normalization
                   │                               │
                   ▼                               ▼
         deterministic facts                clusterReports()
                   │                               │
                   └──────────────┬────────────────┘
                                  ▼
                         Reasoning Boundary
                                  │
                              Gemini
                                  │
                       deterministic fallback
                                  │
                                  ▼
                       Operational Documents
                                  │
                                  ▼
                        Firestore onSnapshot
                                  │
                                  ▼
                         Real-Time Command UI
```

## 3. Frontend Architecture

### Stack

- React
- TypeScript
- Vite
- React Router
- Zustand utilities
- Firebase SDK
- React Leaflet
- PapaParse

The frontend handles presentation, authentication state, protected routing, real-time subscriptions, CSV ingestion UI, emergency SOS UI, and operational visualization.

Privileged incident processing and AI credentials remain outside the browser.

## 4. Backend Architecture

Firebase Cloud Functions provide the privileged event-processing boundary.

```text
Firestore event
      ↓
normalize / validate
      ↓
deterministic computation
      ↓
assemble structured context
      ↓
GenAI reasoning when justified
      ↓
validate response / fallback
      ↓
persist operational result
```

This reduces client-side trust and keeps privileged processing server-side.

## 5. Foresight Engine

`computeGateRisk()` converts gate readings into operational features including:

- `densityPct`
- `netFlowPerMin`
- `timeToCriticalSec`
- deterministic/rule-based risk level

Core per-reading complexity:

```text
O(1)
```

The deterministic stage handles arithmetic because an LLM is neither necessary nor desirable for predictable mathematical computation.

Structured facts can then support contextual reasoning where cross-gate interpretation is useful.

## 6. Fusion Queue

Emergency reports are inherently noisy and may describe the same event differently.

```text
Raw reports
     ↓
Normalization
     ↓
Spatial-temporal clustering
     ↓
Structured cluster evidence
     ↓
Contextual interpretation / fallback
     ↓
Incident
```

`clusterReports()` handles deterministic spatial-temporal grouping.

Generative AI is reserved for ambiguity such as mixed-category natural-language evidence and explainable interpretation.

## 7. Reasoning Boundary

### Deterministic responsibilities

- arithmetic;
- density and flow;
- time-to-critical;
- spatial/temporal grouping;
- heap operations;
- shortest-path computation.

### Generative AI responsibilities

- ambiguous natural-language interpretation;
- mixed-signal contextual reasoning;
- explainable operational narrative;
- reasoning over structured evidence.

This boundary improves testability, efficiency, predictability, graceful degradation, and evaluator traceability.

## 8. Deterministic Fallback

External AI availability must not determine whether basic safety computation works.

```text
Gemini succeeds
      ↓
validated contextual reasoning

Gemini unavailable / invalid
      ↓
deterministic fallback
      ↓
system remains operational
```

Reasoning provenance can distinguish AI-generated reasoning from fallback behavior.

## 9. Gate Telemetry Data Flow

```text
CSV / simulator / external reading
              ↓
        Firestore gates
              ↓
      Cloud Function trigger
              ↓
       computeGateRisk()
              ↓
 deterministic operational facts
              ↓
 contextual reasoning if required
              ↓
       updated gate document
              ↓
        onSnapshot listener
              ↓
          Dashboard
```

## 10. Emergency Report Data Flow

```text
Public SOS
    ↓
Firestore reports
    ↓
Cloud Function
    ↓
normalize / validate
    ↓
retrieve relevant evidence
    ↓
clusterReports()
    ↓
structured cluster
    ↓
reasoning / fallback
    ↓
incident document
    ↓
onSnapshot
    ↓
Incident Queue / Detail
```

## 11. Real-Time Synchronization

Aegis Grid uses Firestore `onSnapshot` subscriptions rather than client polling.

```text
Firestore mutation
      ↓
Realtime event
      ↓
UI synchronization
```

This reduces unnecessary repeated requests and provides low-latency command-center updates.

## 12. Real-Data Ingestion

External CSV input enters the operational pipeline rather than a demonstration-only path.

```text
Evaluator CSV
     ↓
Parse
     ↓
Validate
     ↓
Normalize canonical gate IDs
     ↓
Firestore
     ↓
Risk computation
     ↓
Real-time dashboard
```

Canonical gate normalization prevents repeated uploads from intentionally creating duplicate logical venue gates.

## 13. Algorithmic Infrastructure

| System | Approach | Complexity |
|---|---|---:|
| Gate risk | Direct feature computation | `O(1)` |
| Report clustering | Ordered spatial/temporal grouping | approximately `O(n log n)` |
| Priority queue | Binary heap | `O(log n)` insertion/extraction |
| Crowd-aware routing | Heap-based weighted shortest path | `O((V + E) log V)` |
| Live synchronization | Firestore listeners | No polling |

The congestion-aware routing algorithm models the difference between geometric proximity and operational travel time.

A longer but clearer corridor may produce a better route than a shorter highly congested corridor.

Routing and priority modules are documented as implemented/tested infrastructure unless their full runtime integration has been verified.

## 14. Truthful Operational State

A core architecture rule is:

> **Unknown operational data remains unknown rather than being fabricated for visual completeness.**

```text
No validated responder route
        ↓
"ETA awaiting validated responder route"

NOT

hardcoded "3 minutes"
```

This protects operational integrity and human trust.

## 15. Authentication Boundary

```text
PUBLIC

/login
/sos

──────── TRUST BOUNDARY ────────

AUTHENTICATED STAFF

/dashboard
/incident/:id
/upload
/audit
```

`AuthGuard` protects operational navigation while Firestore Security Rules provide the backend authorization boundary.

## 16. Project Structure

```text
functions/
  src/
    index.ts
    lib/
      callReasoningModel.ts
      clusterReports.ts
      computeGateRisk.ts
      priorityQueue.ts
      reasoningPromptBuilder.ts
      routeToResponder.ts

scripts/
  simulateGateReadings.ts

src/
  components/
    auth/
    dashboard/
    shared/
    sos/
  config/
  hooks/
  lib/
  store/
  styles/

tests/
  aegis-flow.spec.ts
```

Some deterministic modules exist in both browser and Functions source trees because they target separate TypeScript build/runtime environments.

A future shared-package extraction can reduce duplication while preserving deployment boundaries.

## 17. Security Architecture

The system separates:

```text
PUBLIC EMERGENCY INPUT
          ↓
controlled ingestion boundary
          ↓
server-side processing
          ↓
PROTECTED OPERATIONAL STATE
```

Security responsibilities include:

- Firebase Authentication;
- Firestore Security Rules;
- protected operational routes;
- server-side Cloud Functions;
- secrets/environment separation;
- defensive normalization and validation;
- constrained public SOS permissions;
- browser security headers;
- AI trust-boundary validation/fallback.

See `SECURITY.md`.

## 18. Accessibility Architecture

Operational state should never depend on color alone.

Risk states are intended to combine:

- text labels;
- iconography/symbols;
- visual styling.

Dynamic states use semantic/ARIA patterns where appropriate, emergency controls use large interaction targets, and keyboard/focus/contrast hardening remains part of the engineering lifecycle.

## 19. Testing Architecture

Core deterministic algorithms have dedicated unit suites:

- `computeGateRisk.test.ts`
- `clusterReports.test.ts`
- `priorityQueue.test.ts`
- `routeToResponder.test.ts`

Browser-level Playwright coverage provides an E2E/smoke-test foundation.

High-value continued expansion areas include:

- full SOS → incident flow;
- CSV ingestion → gate update flow;
- authentication boundaries;
- Firestore Rules emulator tests;
- accessibility regression tests;
- AI fallback behavior.

## 20. Scalability and Evolution

The architecture supports incremental extension:

```text
Current Firebase realtime foundation
        ↓
stricter schema validation
        ↓
role-based authorization
        ↓
App Check / abuse protection
        ↓
shared algorithm package
        ↓
live responder telemetry
        ↓
fully integrated crowd-aware routing
        ↓
multi-venue deployment
```

These are evolutionary improvements rather than architectural rewrites.

## 21. Architectural Differentiators

### Hybrid intelligence
Algorithms and GenAI each perform the tasks they are best suited for.

### Multi-signal reasoning
Machine telemetry and human emergency evidence contribute to one operational picture.

### Real-data pipeline
Evaluator data can feed the same operational system.

### Explainability
Evidence, confidence, provenance, and raw reports remain visible.

### Graceful degradation
Deterministic fallback keeps core computation useful if AI reasoning fails.

### Truthful uncertainty
Unknown values are not replaced with convincing-looking fake numbers.

## 22. Architectural Principle

```text
DATA
 ↓
FACTS
 ↓
CORRELATION
 ↓
CONTEXT
 ↓
REASONING
 ↓
EXPLANATION
 ↓
OPERATIONAL DECISION
```

Aegis Grid is designed around this chain rather than around a generic chatbot.
