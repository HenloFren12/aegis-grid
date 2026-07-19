# 🛡️ Aegis Grid

---

**Live Demo Link:** https://aegis-grid-2026.web.app
**Demo Credentials:** aegisadm26@ops.com, adminag26.

---- 

## Predictive Crowd Safety & Explainable Incident Intelligence for Smart Stadium Operations

> **Predict earlier. Fuse signals. Explain decisions.**

Aegis Grid is a real-time stadium safety decision-support platform designed for **Organizers / Safety Command Center teams** operating high-density tournament venues such as the FIFA World Cup 2026.

It focuses on three connected Challenge 4 verticals:

- **Crowd Management**
- **Real-Time Decisions**
- **Operational Intelligence**

Fans are not treated as a second product persona. The public SOS surface treats them as a **human emergency sensor network** that strengthens the organizer's operational picture.

## Core Engineering Principle

> **Algorithms establish facts. Generative AI interprets context, ambiguity, and operational meaning.**

Aegis Grid deliberately avoids using an LLM for arithmetic or standard algorithms. Deterministic systems calculate crowd risk, cluster signals, prioritize incidents, and support crowd-aware routing. Generative AI is reserved for contextual interpretation and explainable reasoning where rules alone are insufficient.

## What Makes Aegis Grid Different

###  Foresight, Not Just Monitoring
Gate telemetry is transformed into density, net crowd flow, time-to-critical capacity, and deterministic risk states so organizers can see developing pressure rather than only current occupancy.

###  Fusion, Not Alert Spam
Spatial-temporal clustering helps correlate fragmented emergency reports into coherent incident evidence instead of blindly creating one incident per report.

###  Algorithms for Facts, GenAI for Judgment
Deterministic algorithms handle measurable facts. Gemini handles ambiguous language, mixed-category evidence, contextual interpretation, and explainable operational reasoning.

###  Fans as Human Sensors
The public `/sos` route contributes emergency evidence without turning Aegis Grid into a generic fan super-app or diluting the Organizer persona.

###  Truthful Uncertainty
Unknown operational values remain unknown. Aegis Grid avoids presenting fabricated certainty such as unvalidated responder ETAs.

###  Real-Data Evaluation
CSV ingestion allows evaluators to feed external gate data into the operational pipeline rather than relying only on static demo data.

## Core Systems

### 1. Foresight Engine

Gate readings are transformed into:

- crowd density percentage;
- net crowd flow;
- estimated time to critical capacity;
- deterministic risk level;
- stale-reading-aware operational state.

Core feature extraction is designed as **O(1)** per reading and handles invalid capacity, zero-time intervals, stale readings, over-capacity telemetry, and flat or negative flow.

### 2. Fusion Queue

Emergency signals flow through a structured pipeline:

```text
Public SOS / reports
        ↓
Firestore
        ↓
Cloud Functions
        ↓
Normalization + validation
        ↓
Spatial-temporal clustering
        ↓
Contextual reasoning / deterministic fallback
        ↓
Incident intelligence
        ↓
Real-time organizer interface
```

The architecture supports mixed-category evidence, severity/confidence reasoning, deterministic fallbacks, priority infrastructure, and explainable incident details.

### 3. Public Emergency SOS

The `/sos` route is intentionally narrow and fast.

It supports emergency category, location/gate context, optional description, validation, accessible interaction, and public submission without exposing protected organizer data.

### 4. Real-Time Command Center

The protected organizer interface surfaces:

- live gate conditions;
- risk states;
- incident queues;
- incident details and raw evidence;
- reasoning traces and provenance;
- venue-map context;
- operational audit information.

Firestore real-time listeners synchronize operational state without polling.

### 5. Real-Data Ingestion

CSV data is validated and normalized into canonical gate entities before entering the same Firestore-driven operational pipeline used by the dashboard.

Repeated uploads update logical gates rather than intentionally creating duplicate venue entities.

A separate `scripts/simulateGateReadings.ts` utility supports development and demonstration.

## Why Generative AI Is Necessary

A deterministic system can establish facts such as:

```text
Gate C density = 91%
Three reports occurred near Gate C
Reports contain both medical and security signals
```

But natural-language evidence may describe one evolving event in very different ways:

```text
"People are crushing forward."
"Someone went down."
"Can't move near C."
```

Aegis Grid uses Generative AI where contextual judgment is genuinely useful: interpreting ambiguous cross-signal evidence and producing an explanation a human operator can understand.

```text
MEASURABLE FACTS
      ↓
Deterministic algorithms
      ↓
Structured evidence
      ↓
CONTEXTUAL INTERPRETATION
      ↓
Generative AI
      ↓
Explainable operational reasoning
```

## Algorithmic Design

| Operation | Approach | Complexity |
|---|---|---:|
| Gate risk extraction | Direct deterministic computation | `O(1)` |
| Report clustering | Ordered spatial/temporal grouping | approximately `O(n log n)` |
| Incident priority operations | Binary heap | `O(log n)` insertion/extraction |
| Responder routing algorithm | Heap-based weighted shortest path | `O((V + E) log V)` |
| Live synchronization | Firestore `onSnapshot` | No polling |
| Contextual reasoning | Gemini with deterministic fallback | Model used only where justified |

The crowd-aware responder-routing infrastructure models an important operational fact: the geographically nearest responder is not always the fastest if the shortest corridor is heavily congested.

Routing and priority modules are implemented and tested as algorithmic infrastructure; documentation does not claim live end-to-end integration where the runtime path has not been verified.

## System Architecture

```text
Gate telemetry / CSV                    Public SOS
        │                                  │
        ▼                                  ▼
     Firestore                          Firestore
        │                                  │
        ▼                                  ▼
 Cloud Functions                    Cloud Functions
        │                                  │
        ▼                                  ▼
computeGateRisk()                  clusterReports()
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
              Structured operational facts
                       │
                       ▼
            Gemini reasoning when required
                       │
              deterministic fallback
                       │
                       ▼
              Operational documents
                       │
                       ▼
             Firestore real-time sync
                       │
                       ▼
                 Command Center
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Routing | React Router |
| Realtime database | Firebase Firestore |
| Authentication | Firebase Authentication |
| Backend automation | Firebase Cloud Functions |
| Generative AI | Google Gemini |
| Client state utilities | Zustand |
| Mapping | Leaflet / React Leaflet |
| CSV ingestion | PapaParse |
| Unit testing | Jest |
| End-to-end testing | Playwright |
| Hosting | Firebase Hosting |

## Security

Aegis Grid separates public emergency reporting from privileged operational access.

Key security principles include:

- Firebase Authentication for protected staff access;
- Firestore Security Rules as the backend authorization boundary;
- server-side Cloud Functions for privileged processing;
- environment/secrets-based configuration;
- defensive normalization and validation;
- public SOS separated from private operational collections;
- browser security headers through hosting configuration;
- AI input/output treated as untrusted data across the reasoning boundary.

See `SECURITY.md` for the full security architecture and hardening roadmap.

## Testing

Dedicated unit suites cover:

- `computeGateRisk`
- `clusterReports`
- `priorityQueue`
- `routeToResponder`

Representative edge cases include:

- invalid or zero capacity;
- zero elapsed time;
- stale readings;
- over-capacity telemetry;
- flat/negative crowd flow;
- empty report sets;
- spatially or temporally separated reports;
- mixed-category clusters;
- priority ordering/ties;
- unreachable responders;
- longer clear route vs shorter congested route.

Playwright provides browser-level smoke/E2E coverage and an extensible base for broader workflow testing.

## Accessibility

Aegis Grid treats accessibility as an operational requirement.

The interface is designed around:

- semantic controls;
- ARIA status messaging;
- keyboard-operable interactions;
- large emergency touch targets;
- risk communicated with text/iconography as well as color;
- responsive emergency reporting;
- continued WCAG contrast and focus-state hardening.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Organizer/staff authentication |
| `/sos` | Public | Emergency signal submission |
| `/dashboard` | Protected | Live command center |
| `/incident/:id` | Protected | Incident evidence and reasoning |
| `/upload` | Protected | External CSV ingestion |
| `/audit` | Protected | Operational audit view |

## Project Structure

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

firestore.rules
firestore.indexes.json
firebase.json
playwright.config.ts
```

Some deterministic modules exist in both frontend and Cloud Functions source trees because the browser and deployed Functions are separate TypeScript runtime/build environments.

## Evaluator Demo Flow

1. Upload external gate telemetry through the CSV ingestion surface.
2. Observe changing crowd-risk state in the Command Center.
3. Submit related emergency reports through Public SOS.
4. Observe incident evidence, fusion, severity/confidence, and reasoning.
5. Open Incident Detail to inspect raw reports, provenance, map context, and operational state.
6. Inspect the audit surface.

The central demonstration is:

> **A stadium crisis should not be understood through one sensor, one report, or one threshold. Aegis Grid builds an explainable operational picture from multiple signals.**

## Evolution Path

The architecture supports incremental hardening and extension through:

- deeper live crowd-aware responder-routing integration;
- richer cross-gate comparative reasoning;
- stricter public report schema enforcement;
- abuse protection and App Check;
- expanded role-based authorization;
- broader E2E/security/accessibility tests;
- richer venue graph and responder telemetry integration.

These are extensions of the current architecture rather than a redesign.

## Local Development

```bash
npm install
npm run dev
```

Required Firebase client environment configuration:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Cloud Functions:

```bash
cd functions
npm install
npm run build
```

Server-side AI credentials must be configured through deployment environment/secrets mechanisms rather than committed to source control.

## Design Principle

```text
SENSE
  ↓
CALCULATE
  ↓
CORRELATE
  ↓
REASON
  ↓
EXPLAIN
  ↓
ACT
```

**Aegis Grid — Predict earlier. Fuse signals. Explain decisions.**
