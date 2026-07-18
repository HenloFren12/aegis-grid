# Aegis Grid

**Predictive Crowd Safety & Incident Fusion for Smart Stadium Operations**

Aegis Grid is a real-time decision-support platform designed for **stadium safety organizers** operating high-density tournament venues such as the FIFA World Cup 2026. It combines deterministic crowd-risk algorithms, Firebase real-time infrastructure, and Generative AI reasoning to help a command center answer three urgent questions:

1. **Where is crowd risk building before it becomes critical?**
2. **Which incoming emergency reports describe the same real-world incident, and what needs attention first?**
3. **What should an operator do next, and why?**

The project deliberately focuses on one primary persona — **Organizers / Safety Command Center staff** — across **Crowd Management, Real-Time Decisions, and Operational Intelligence**. A public `/sos` surface lets fans act as an emergency signal source without turning the project into a generic fan-experience app.

---

## Why Aegis Grid?

Traditional monitoring can tell an operator that a gate is crowded. Aegis Grid is designed to go further: calculate crowd trends deterministically, reason across multiple gates, fuse overlapping reports, and produce actionable explanations.

A core design principle is:

> **Use algorithms for facts and optimization; use GenAI for contextual judgment and explanation.**

For example, arithmetic determines that Gate C is approaching capacity. Generative AI is used to reason across the wider venue state and explain why redirecting toward one alternative may be safer than another.

---

## Core Capabilities

### 1. Foresight Engine — Predictive Gate Risk

Gate readings are transformed into operational features including:

- crowd density percentage;
- net crowd flow per minute;
- estimated time to critical capacity;
- deterministic risk level: `LOW`, `MODERATE`, `HIGH`, or `CRITICAL`;
- stale-reading handling to prevent old sensor data from creating misleading trends.

The deterministic calculation is intentionally separated from AI reasoning. This keeps predictable mathematics testable while reserving model calls for higher-level comparative reasoning.

### 2. Fusion Queue — Incident Intelligence

Emergency signals can enter through the public SOS interface and be processed by Firebase Cloud Functions.

The project includes:

- spatial-temporal report clustering;
- mixed-category incident handling;
- severity classification with deterministic fallback behavior;
- incident prioritization data structures;
- crowd-weighted responder-routing algorithms.

This architecture is designed to reduce duplicate alerts and turn fragmented reports into more useful operational context.

### 3. SOS Trigger — Public Emergency Signal

The `/sos` route is intentionally narrow in scope. It provides a fast emergency-reporting surface rather than a full fan application.

The interface supports emergency categories, location/zone context, Firestore submission, validation, and accessible interaction patterns.

### 4. Real-Time Command Dashboard

The protected command-center interface uses Firestore real-time listeners to surface:

- live gate conditions;
- risk states and reasoning;
- open incidents;
- incident details;
- venue-map context;
- audit information.

### 5. Real-Data Ingestion

`DataUploadPanel.tsx` provides a CSV ingestion path so external gate data can be validated, processed, and fed into the same operational pipeline rather than relying only on static demo content.

A separate `simulateGateReadings.ts` script can generate changing telemetry for development and demonstration.

---

## System Flow

```text
Gate telemetry / CSV input
          |
          v
      Firestore
          |
          v
onGateReadingWritten Cloud Function
          |
          +--> deterministic computeGateRisk()
          |
          +--> contextual Gemini reasoning when required
          |
          v
 Updated gate document
          |
          v
 Real-time Dashboard


Fan SOS report
          |
          v
   Firestore /reports
          |
          v
 onReportCreate Cloud Function
          |
          +--> normalize + validate
          +--> spatial/temporal clustering
          +--> severity reasoning / fallback
          |
          v
   Firestore /incidents
          |
          v
 Incident Queue / Detail
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
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
| Accessibility tooling | axe-core integration in development |
| Hosting/deployment configuration | Firebase |

---

## Algorithmic Design

Aegis Grid avoids using GenAI for operations that deterministic algorithms can perform more reliably.

| Operation | Approach |
|---|---|
| Gate risk extraction | O(1) arithmetic |
| Report clustering | Sort + spatial/temporal grouping |
| Incident priority queue | Binary heap, O(log n) insertion/extraction |
| Responder routing | Heap-based weighted shortest-path search |
| Live synchronization | Firestore `onSnapshot`, avoiding polling |
| Contextual operational reasoning | Gemini, with deterministic fallback paths |

The repository contains pure algorithm modules and dedicated tests for gate risk, report clustering, priority queues, and responder routing.

---

## Project Structure

```text
functions/
  src/
    index.ts                 Firebase Cloud Function triggers and backend orchestration
    lib/                     Backend algorithm/reasoning utilities and tests

scripts/
  simulateGateReadings.ts    Synthetic real-time telemetry generator

src/
  components/
    auth/                    Staff authentication UI
    dashboard/               Dashboard, map, risk, incidents, uploads, audit
    shared/                  Shared route/auth protection
    sos/                     Public emergency-reporting surface
  config/
    firebase.ts              Firebase client initialization
  hooks/
    useLiveFirestoreCollection.ts
  lib/                       Deterministic algorithms, prompts, tests
  store/                     Zustand state utilities
  styles/                    Risk visualization styles
  App.tsx                    Application routes
  main.tsx                   React entry point

tests/
  aegis-flow.spec.ts         Playwright smoke/E2E tests

firestore.rules              Firestore authorization rules
firebase.json                Firebase hosting/functions/security-header config
```

> Some algorithm modules exist in both frontend and Cloud Functions source trees because the browser and deployed Functions are separate TypeScript runtime/build environments.

---

## Key Routes

| Route | Purpose |
|---|---|
| `/login` | Staff authentication |
| `/dashboard` | Protected live command center |
| `/incident/:id` | Detailed incident view |
| `/upload` | External CSV data ingestion |
| `/audit` | Operational audit view |
| `/sos` | Public emergency-reporting interface |

---

## Security Approach

The project applies security at multiple layers:

- protected staff routes through Firebase Authentication;
- Firestore Security Rules separating public report creation from privileged operational reads;
- server-side Cloud Functions for privileged processing;
- environment-based Firebase configuration;
- defensive normalization and validation in backend processing;
- Firebase Hosting security headers including CSP-related controls, frame protection, and MIME-sniffing protection;
- no requirement for a fan to access private incident collections when submitting an SOS report.

The public SOS surface is intentionally limited to emergency submission while operational data remains restricted.

---

## Testing

The repository includes unit tests for the core deterministic algorithms:

- `computeGateRisk.test.ts`
- `clusterReports.test.ts`
- `priorityQueue.test.ts`
- `routeToResponder.test.ts`

Examples of covered edge conditions include:

- zero/invalid capacity;
- zero-time intervals;
- stale readings;
- over-capacity sensor readings;
- flat or negative crowd flow;
- empty report sets;
- reports separated by time/location;
- mixed-category clusters;
- priority ordering and tie behavior;
- unreachable responder routes;
- congestion-aware route selection.

Playwright smoke tests also verify application boot and the public SOS route.

---

## Accessibility

Accessibility is treated as an operational requirement, especially because stadium interfaces may be used under pressure.

The implementation includes or is designed around:

- semantic controls;
- ARIA labels/status messaging;
- keyboard-operable interactions;
- risk communication using text in addition to visual styling;
- development-time axe-core support;
- large emergency interaction targets on the SOS surface.

---

## Running Locally

### Frontend

```bash
npm install
npm run dev
```

Create the required Firebase environment variables in your local environment configuration:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

### Cloud Functions

```bash
cd functions
npm install
npm run build
```

Configure server-side Gemini credentials through the deployment environment/secrets mechanism rather than committing secrets to source control.

---

## Design Philosophy

Aegis Grid is not intended to be an all-purpose stadium super-app.

Its scope is deliberately constrained:

**One primary persona:** safety organizers.

**Three connected operational verticals:** crowd management, real-time decisions, and operational intelligence.

**One AI principle:** Generative AI should add reasoning where rules alone are insufficient — not replace reliable algorithms simply for the sake of using AI.

---
