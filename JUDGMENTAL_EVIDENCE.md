# Aegis Grid --- Judgmental Evidence

> **Evaluator-oriented evidence map for Prompt Wars Challenge 4: Smart
> Stadiums & Tournament Operations**

This document is a concise index of implementation evidence across the
six evaluation factors. It is intentionally evidence-focused: it points
reviewers to the relevant architecture, source modules, tests, and
design decisions without replacing the main `README.md`,
`ARCHITECTURE.md`, or `SECURITY.md`.

------------------------------------------------------------------------

## Evaluation Snapshot

  -----------------------------------------------------------------------
  Evaluation Factor       Impact                  Primary Evidence
  ----------------------- ----------------------- -----------------------
  **Code Quality**        **HIGH**                Modular TypeScript
                                                  algorithms,
                                                  deterministic/GenAI
                                                  separation, reusable
                                                  Firestore hook,
                                                  normalized data flow,
                                                  explicit fallback
                                                  behavior

  **Problem Statement     **HIGH**                Single Organizer
  Alignment**                                     persona, 3 focused
                                                  verticals, Foresight
                                                  Engine, Fusion Queue,
                                                  public SOS as
                                                  human-sensor input,
                                                  real-data CSV ingestion

  **Security**            **MEDIUM**              Firebase Auth,
                                                  `AuthGuard`, Firestore
                                                  Rules, server-side
                                                  Cloud Functions,
                                                  secrets boundary,
                                                  public/private trust
                                                  separation

  **Efficiency**          **MEDIUM**              O(1) gate-risk
                                                  computation, heap-based
                                                  priority operations,
                                                  weighted shortest-path
                                                  routing, real-time
                                                  listeners instead of
                                                  polling

  **Testing**             **LOW**                 Dedicated algorithm
                                                  unit tests and
                                                  Playwright
                                                  browser-level test
                                                  foundation

  **Accessibility**       **LOW**                 Semantic controls,
                                                  labels/status
                                                  messaging, public
                                                  emergency UX, textual
                                                  risk states,
                                                  keyboard/contrast
                                                  hardening path
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 1. Code Quality --- HIGH IMPACT

## Evidence

### Deterministic algorithms are separated from UI and AI reasoning

Relevant modules:

``` text
src/lib/computeGateRisk.ts
src/lib/clusterReports.ts
src/lib/priorityQueue.ts
src/lib/routeToResponder.ts

functions/src/lib/computeGateRisk.ts
functions/src/lib/clusterReports.ts
functions/src/lib/priorityQueue.ts
functions/src/lib/routeToResponder.ts
functions/src/lib/reasoningPromptBuilder.ts
functions/src/lib/callReasoningModel.ts
```

The architecture deliberately separates:

``` text
MEASURABLE FACTS
      ↓
Deterministic algorithms

CONTEXT / AMBIGUITY
      ↓
Generative AI
```

This prevents the LLM from replacing standard arithmetic, clustering,
heap operations, or graph algorithms.

### Reusable real-time data access

``` text
src/hooks/useLiveFirestoreCollection.ts
```

Firestore synchronization is encapsulated rather than duplicated across
every component.

### Clear UI responsibility boundaries

``` text
src/components/auth/
src/components/dashboard/
src/components/shared/
src/components/sos/
```

Authentication, dashboard operations, shared protection logic, and
public emergency reporting are separated into focused component areas.

### Explicit reasoning boundary

``` text
functions/src/lib/reasoningPromptBuilder.ts
functions/src/lib/callReasoningModel.ts
```

Prompt construction/model invocation are separated from deterministic
safety computation.

### Graceful degradation

The backend reasoning architecture supports deterministic fallback
behavior when external AI reasoning is unavailable or invalid.

This avoids making core safety computation dependent on a successful LLM
call.

### Truthful operational state

The system avoids fabricating missing operational information.

Example principle:

``` text
No validated responder route
        ↓
"ETA awaiting validated responder route"

NOT

hardcoded "3 minutes"
```

This improves correctness, maintainability, and operator trust.

## Special Engineering Point

Aegis Grid is **not a UI wrapper around an LLM**.

Its intelligence is distributed deliberately:

``` text
Algorithms → facts and optimization
GenAI      → contextual judgment and explanation
UI         → operational decision support
```

------------------------------------------------------------------------

# 2. Problem Statement Alignment --- HIGH IMPACT

## Primary Persona

### Organizer / Safety Command Center

Aegis Grid intentionally focuses on one primary persona rather than
building a generic stadium super-app.

The protected command interface is designed for organizers responsible
for:

-   crowd safety;
-   gate monitoring;
-   incident prioritization;
-   emergency response;
-   operational decision-making.

## Selected Verticals

Aegis Grid focuses on exactly three connected Challenge 4 verticals:

1.  **Crowd Management**
2.  **Real-Time Decisions**
3.  **Operational Intelligence**

The relationship is intentional:

``` text
Crowd telemetry
      ↓
Predictive risk
      ↓
Human emergency signals
      ↓
Incident fusion
      ↓
Explainable reasoning
      ↓
Organizer decision
```

## Foresight Engine

Relevant evidence:

``` text
computeGateRisk.ts
GateRiskCard.tsx
Dashboard.tsx
DataUploadPanel.tsx
scripts/simulateGateReadings.ts
```

The system goes beyond displaying occupancy.

It derives operational features such as:

-   density;
-   net crowd flow;
-   time-to-critical;
-   risk classification.

### Unique point

> **Foresight, not just monitoring.**

The goal is to help organizers understand developing crowd pressure
rather than only displaying what has already happened.

## Fusion Queue

Relevant evidence:

``` text
clusterReports.ts
IncidentQueue.tsx
IncidentDetail.tsx
SOSScreen.tsx
functions/src/index.ts
```

Multiple reports can describe one real-world emergency differently.

Aegis Grid uses spatial-temporal correlation to reduce duplicate-alert
behavior and create more coherent incident evidence.

### Unique point

> **Fusion, not alert spam.**

## Fans as Human Sensors

Relevant evidence:

``` text
src/components/sos/SOSScreen.tsx
```

Fans are not treated as a second full product persona.

Instead, public SOS acts as an emergency signal source for the
Organizer's command system.

### Unique point

> **Fans strengthen the Organizer persona instead of diluting persona
> focus.**

Machine telemetry can detect crowd pressure.

Human witnesses can report context that a density sensor cannot directly
understand.

Together they create a richer operational picture.

## Genuine GenAI Requirement

Generative AI is reserved for ambiguity and contextual reasoning.

Example:

``` text
"People are crushing forward."
"Someone went down."
"Can't move near C."
```

Deterministic code can establish location, timing, density, and
proximity.

Contextual reasoning is useful for interpreting whether mixed
descriptions represent one evolving incident and for explaining the
operational meaning to an organizer.

### Unique point

> **Algorithms for facts. GenAI for judgment.**

## Real-Data Testing Requirement

Relevant evidence:

``` text
src/components/dashboard/DataUploadPanel.tsx
```

External CSV gate data can enter the operational pipeline.

This allows evaluators to test the application using real or replacement
datasets instead of relying only on hardcoded demonstration content.

------------------------------------------------------------------------

# 3. Security --- MEDIUM IMPACT

## Evidence

### Firebase Authentication

Protected organizer access uses Firebase Authentication.

Relevant files:

``` text
src/components/auth/Login.tsx
src/store/authSlice.ts
src/config/firebase.ts
```

### Protected operational routes

Relevant file:

``` text
src/components/shared/AuthGuard.tsx
```

Public and protected surfaces are separated:

``` text
PUBLIC
/login
/sos

PROTECTED
/dashboard
/incident/:id
/upload
/audit
```

### Firestore Security Rules

Relevant file:

``` text
firestore.rules
```

Firestore Rules provide the backend authorization boundary rather than
relying only on client-side route protection.

### Server-side privileged processing

Relevant area:

``` text
functions/src/
```

Cloud Functions provide a privileged processing boundary for operational
logic and AI reasoning.

Private server-side processing is not delegated to the browser.

### Secrets boundary

Firebase browser configuration and private server-side credentials have
different trust requirements.

Private AI/server credentials should be supplied through deployment
environment/secrets mechanisms rather than committed to source control.

### Public/private trust separation

``` text
PUBLIC SOS
     ↓
controlled report ingestion
     ↓
backend processing
     ↓
PROTECTED OPERATIONAL STATE
```

The public emergency surface does not require access to private
incidents, audit history, or organizer command data.

## Security Evolution

The architecture provides clear hardening points for:

-   stricter report-schema enforcement;
-   field/type/size validation;
-   Firebase App Check;
-   rate limiting and abuse protection;
-   role-based authorization/custom claims;
-   Firestore Rules emulator tests;
-   automated secret/dependency scanning.

These are incremental hardening improvements to the existing
trust-boundary design rather than a required architectural rewrite.

See:

``` text
SECURITY.md
```

------------------------------------------------------------------------

# 4. Efficiency --- MEDIUM IMPACT

## O(1) gate-risk computation

Relevant module:

``` text
computeGateRisk.ts
```

Core gate-risk feature extraction is designed as:

``` text
O(1) per reading
```

It computes operational features directly rather than using unnecessary
iterative/model-based processing.

## Spatial-temporal clustering

Relevant module:

``` text
clusterReports.ts
```

Reports are processed through structured spatial/temporal correlation
rather than repeatedly sending every report pair to an LLM.

Target behavior is approximately:

``` text
O(n log n)
```

depending on ordering/grouping stages.

## Binary heap priority infrastructure

Relevant module:

``` text
priorityQueue.ts
```

Priority operations use a binary heap:

``` text
insert              O(log n)
remove highest      O(log n)
```

This avoids repeatedly sorting an entire incident collection for each
priority operation.

## Crowd-aware shortest-path infrastructure

Relevant module:

``` text
routeToResponder.ts
```

Routing uses heap-based weighted shortest-path logic with target
complexity:

``` text
O((V + E) log V)
```

The algorithm models congestion as part of route cost.

### Unique point

> **Nearest geographically does not always mean fastest operationally.**

A farther responder may have a lower ETA if the nearer route crosses a
highly congested corridor.

The routing module and its tests provide algorithmic infrastructure for
deeper live responder/venue-graph integration.

## No client polling

Relevant module:

``` text
src/hooks/useLiveFirestoreCollection.ts
```

Aegis Grid uses Firestore `onSnapshot` listeners rather than repeated
timer-based polling.

``` text
Firestore mutation
      ↓
Realtime event
      ↓
UI synchronization
```

This reduces unnecessary repeated requests and supports real-time
command-center behavior.

## Efficient AI usage

The model is not used for deterministic arithmetic or standard
algorithms.

This reduces:

-   unnecessary model calls;
-   latency;
-   cost;
-   hallucination surface.

------------------------------------------------------------------------

# 5. Testing --- LOW IMPACT

## Dedicated unit-test suites

Relevant files include:

``` text
computeGateRisk.test.ts
clusterReports.test.ts
priorityQueue.test.ts
routeToResponder.test.ts
```

Tests target core deterministic safety logic.

Representative edge cases include:

### Gate risk

-   invalid/zero capacity;
-   zero elapsed time;
-   stale readings;
-   over-capacity readings;
-   flat or negative crowd flow.

### Clustering

-   empty input;
-   geographically separated reports;
-   temporally separated reports;
-   mixed-category evidence.

### Priority queue

-   ordering;
-   insertion/extraction behavior;
-   priority ties and edge cases.

### Routing

-   unreachable routes;
-   congestion-weighted alternatives;
-   shorter congested path vs longer clearer path.

## Browser-level testing

Relevant files:

``` text
tests/aegis-flow.spec.ts
playwright.config.ts
```

Playwright provides browser-level smoke/E2E coverage and an extensible
base for deeper workflow testing.

## High-value continued expansion

The most valuable additional coverage areas are:

-   CSV upload → canonical gate update;
-   SOS → incident workflow;
-   authentication boundary checks;
-   malformed input handling;
-   Firestore Rules emulator tests;
-   AI failure/fallback behavior;
-   accessibility regression checks.

------------------------------------------------------------------------

# 6. Accessibility --- LOW IMPACT

## Evidence

The interface includes accessibility-oriented patterns such as:

-   semantic form controls;
-   labels for user input;
-   ARIA/status messaging where dynamic feedback is required;
-   large emergency interaction targets;
-   responsive public SOS design;
-   textual risk classifications rather than color-only meaning.

Risk communication is intended to combine multiple cues:

``` text
🚨 CRITICAL
⚠ HIGH
▲ MODERATE
✓ LOW
```

This is preferable to communicating operational severity through color
alone.

## Accessibility Evolution

Continued hardening focuses on:

-   WCAG contrast verification;
-   consistent `:focus-visible` states;
-   keyboard-only workflow testing;
-   accessible map alternatives/context;
-   automated accessibility regression testing.

Accessibility improvements are treated as iterative engineering
hardening rather than a separate cosmetic redesign.

------------------------------------------------------------------------

# 7. Google Technology Integration

Aegis Grid uses Google/Firebase services as functional architecture
rather than decorative integrations.

``` text
Firebase Authentication
        ↓
Protected organizer access

Firestore
        ↓
Real-time operational state

Firebase Cloud Functions
        ↓
Event-driven backend processing

Google Gemini
        ↓
Contextual reasoning where GenAI is justified

Firebase Hosting
        ↓
Deployed web application
```

The design intentionally keeps deterministic safety algorithms outside
the LLM while using Gemini for contextual reasoning.

------------------------------------------------------------------------

# 8. Evaluator Verification Map

  -----------------------------------------------------------------------
  What to Verify                      Where to Look
  ----------------------------------- -----------------------------------
  Single Organizer persona            `README.md`, dashboard architecture

  Crowd Management vertical           Gate risk/Foresight modules

  Real-Time Decisions vertical        Firestore realtime flow, incidents

  Operational Intelligence vertical   Fusion/reasoning/audit workflow

  Genuine GenAI use                   `reasoningPromptBuilder.ts`,
                                      `callReasoningModel.ts`, Functions
                                      flow

  Deterministic risk computation      `computeGateRisk.ts`

  Spatial-temporal fusion             `clusterReports.ts`

  Efficient priority structure        `priorityQueue.ts`

  Crowd-aware routing algorithm       `routeToResponder.ts`

  Real external data ingestion        `DataUploadPanel.tsx`

  Public emergency signal path        `SOSScreen.tsx`

  Authentication boundary             `Login.tsx`, `AuthGuard.tsx`,
                                      `authSlice.ts`

  Database authorization              `firestore.rules`

  Real-time synchronization           `useLiveFirestoreCollection.ts`

  Unit testing                        `*.test.ts` algorithm suites

  Browser-level testing               `tests/aegis-flow.spec.ts`

  Security design                     `SECURITY.md`

  Technical architecture              `ARCHITECTURE.md`
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 9. Core Differentiators

## 1. Predictive rather than purely reactive

Aegis Grid derives crowd trajectory features instead of displaying only
current occupancy.

## 2. Incident fusion rather than notification spam

Multiple fragmented reports can contribute to one coherent operational
picture.

## 3. Hybrid intelligence rather than LLM-everywhere architecture

``` text
Algorithms → facts
GenAI      → contextual judgment
Humans     → operational authority
```

## 4. Fans as sensors, not a second product persona

The public SOS channel strengthens Organizer decision support without
turning the application into a generic fan platform.

## 5. Real-data evaluator pathway

External CSV data enters the operational pipeline.

## 6. Real-time event-driven architecture

Firestore listeners and Cloud Functions support reactive operational
updates without client polling.

## 7. Truthful uncertainty

The system avoids fabricating operational values when validated data is
unavailable.

## 8. Algorithmic depth beyond the UI

The repository contains deterministic crowd-risk computation,
spatial-temporal clustering, binary-heap priority infrastructure, and
congestion-aware shortest-path routing.

------------------------------------------------------------------------

# 10. Evidence Status Convention

When reviewing Aegis Grid, implementation evidence should be interpreted
using these categories:

### LIVE / INTEGRATED

Functionality connected to the current application workflow.

### IMPLEMENTED / TESTED

Algorithmic or architectural functionality present in source and covered
by tests, but not necessarily fully connected to every live UI/runtime
path.

### EVOLUTION / HARDENING

A clearly identified improvement path that extends the current
architecture.

This distinction is intentional.

Aegis Grid does not claim unfinished integration as completed
functionality.

------------------------------------------------------------------------

# Final Evaluator Summary

Aegis Grid's central technical proposition is:

``` text
MACHINE TELEMETRY
       +
HUMAN EMERGENCY SIGNALS
       ↓
DETERMINISTIC FACTS
       ↓
CORRELATION
       ↓
CONTEXTUAL GENAI REASONING
       ↓
EXPLAINABLE OPERATIONAL INTELLIGENCE
       ↓
HUMAN DECISION
```

The project is deliberately narrow:

> **One persona. Three connected verticals. One operational intelligence
> loop.**

Its strongest differentiator is not the number of features.

It is the separation of **prediction, evidence fusion, deterministic
engineering, contextual GenAI reasoning, and human operational
authority** into one coherent stadium-safety architecture.
