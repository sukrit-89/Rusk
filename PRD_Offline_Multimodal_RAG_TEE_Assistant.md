# Product Requirements Document (PRD)
# Offline Multimodal RAG + TEE Assistant

**Version:** 1.0  
**Date:** April 30, 2026  
**Status:** Draft  
**Author:** Project Team  

---

## 1. Executive Summary

The Offline Multimodal RAG + TEE Assistant is a fully offline, privacy-first AI document intelligence platform that combines Retrieval-Augmented Generation (RAG) with Trusted Execution Environment (TEE) confidential computing. It processes text, PDFs, images, and audio inputs to deliver cryptographically verified, tamper-proof AI responses with zero cloud dependency.

**Core Value Proposition:**  
*"We didn't just make AI private from the internet — we made it private from everyone, including the machine running it. And we can prove it."*

**Target Launch:** Week 4 (MVP Demo)  
**Primary Users:** Medical professionals, legal practitioners, defense/field operators, corporate knowledge workers, researchers  

---

## 2. Problem Statement

### 2.1 Current Pain Points
| Pain Point | Impact | Current Market Gap |
|---|---|---|
| Cloud AI exposes sensitive data to third-party servers | HIPAA/GDPR violations, data breaches | No truly offline multimodal RAG exists |
| OS/root-level attacks compromise "offline" systems | Memory inspection, model tampering | Existing offline tools lack hardware isolation |
| No way to verify AI output authenticity | Compliance failures, untrusted decisions | No attestation-standard for local AI |
| Zero-connectivity environments lack AI assistance | Operational paralysis in remote/secure facilities | No field-deployable secure AI assistant |

### 2.2 Target Users & Personas

#### Persona 1: Dr. Sarah Chen (Medical)
- **Role:** Hospital physician handling patient records
- **Pain:** Cannot use cloud AI due to HIPAA; needs to query 50+ patient PDFs rapidly
- **Goal:** Ask "What's the latest blood report for John?" and get a cited, verifiable answer
- **Frequency:** Daily

#### Persona 2: Mark Rodriguez (Legal)
- **Role:** Corporate lawyer reviewing confidential case files
- **Pain:** Client data cannot leave the firm; needs to analyze contracts and precedents
- **Goal:** Upload contract folders, query clauses, receive tamper-proof analysis
- **Frequency:** Per-case

#### Persona 3: Captain James Holt (Defense/Field)
- **Role:** Military operator in zero-connectivity zone
- **Pain:** No internet access; needs threat report analysis in submarines/remote bases
- **Goal:** Classified document Q&A with cryptographic proof of model integrity
- **Frequency:** Mission-critical

#### Persona 4: Dr. Emily Zhang (Research)
- **Role:** Scientist analyzing sensitive datasets
- **Pain:** Needs reproducible, auditable AI outputs for publication
- **Goal:** Query research data, publish attestation alongside findings
- **Frequency:** Per-study

---

## 3. Product Objectives & Success Metrics

### 3.1 Objectives
| # | Objective | Priority |
|---|---|---|
| 1 | Enable fully offline multimodal document Q&A (text, PDF, image, audio) | P0 |
| 2 | Guarantee hardware-level isolation via TEE (near.ai) | P0 |
| 3 | Provide cryptographic attestation on every response | P0 |
| 4 | Support Medical, Legal, and Enterprise operational modes | P1 |
| 5 | Deliver sub-10-second response time for standard queries | P1 |
| 6 | Achieve 90%+ retrieval accuracy on document Q&A benchmarks | P1 |

### 3.2 Success Metrics (KPIs)
| Metric | Target | Measurement |
|---|---|---|
| End-to-end query latency (P95) | < 10 seconds | Benchmark suite |
| Retrieval precision@5 | > 90% | Human-evaluated relevance |
| Attestation verification success rate | 100% | Automated test suite |
| TEE enclave boundary compliance | 100% | near.ai audit |
| Offline functionality | 100% features work without internet | Air-gapped testing |
| Multimodal ingestion success rate | > 95% | Test corpus (PDF/image/audio) |
| User task completion rate (demo) | > 85% | Observational testing |

---

## 4. Feature Requirements

### 4.1 Core Features (P0)

#### F-001: Multimodal Document Ingestion
- **Description:** Accept and process text files, PDFs, images, and audio files
- **Acceptance Criteria:**
  - PDF: Extract text page-by-page via PyMuPDF
  - Image: Generate descriptive captions via LLaVA (offline)
  - Audio: Transcribe speech-to-text via Whisper (offline)
  - Text: Load directly with encoding detection
  - Batch upload: Support multiple files simultaneously
  - Progress indicator during ingestion

#### F-002: Semantic Document Chunking & Embedding
- **Description:** Split documents into chunks, generate embeddings, store in vector DB
- **Acceptance Criteria:**
  - Chunk size: 512 tokens, overlap: 50 tokens
  - Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384-dim)
  - All computation occurs inside TEE enclave
  - Support for incremental ingestion (add docs without rebuild)

#### F-003: RAG Query Pipeline
- **Description:** Embed user query, retrieve top-k chunks, generate contextual response
- **Acceptance Criteria:**
  - Top-k retrieval: 5 chunks via cosine similarity
  - Context assembly: Retrieved chunks + user query → LLM prompt
  - Source citation: Every claim references document name and page/section
  - Response streaming: Real-time token generation in UI

#### F-004: Local LLM Inference
- **Description:** Run language model entirely offline via Ollama
- **Acceptance Criteria:**
  - Default model: Mistral 7B (configurable to LLaMA 3)
  - Runtime: LlamaCpp for CPU/GPU efficiency
  - Model download: Single command (`ollama pull mistral`)
  - Quantization support for lower-end hardware

#### F-005: TEE Hardware Isolation (near.ai)
- **Description:** Execute entire RAG pipeline inside hardware-isolated enclave
- **Acceptance Criteria:**
  - All embedding, retrieval, and inference inside TEE
  - Vector DB encryption keys sealed in enclave (inaccessible to OS)
  - near.ai confidential compute node deployment
  - Remote attestation certificate generation

#### F-006: Cryptographic Attestation Receipt
- **Description:** Every response includes verifiable proof of execution integrity
- **Acceptance Criteria:**
  - Receipt format: JSON containing model hash + enclave signature
  - Signature: Private key sealed inside TEE only
  - Verification: Local Verifier UI checks against near.ai public key
  - Badge display: UI shows "✅ Verified — model hash: abc123"

### 4.2 Interface Features (P1)

#### F-007: Mode-Based Chatbot UI (Next.js)
- **Description:** Single web interface with persona-driven operational modes
- **Acceptance Criteria:**
  - Mode selector: Medical | Legal | Enterprise
  - Each mode loads distinct document collections and system prompts
  - Conversation history per session
  - File upload drag-and-drop zone
  - Attestation verification button per response
  - Responsive layout (desktop-first)

#### F-008: FastAPI Server Layer
- **Description:** REST API exposing RAG + TEE pipeline to external applications
- **Acceptance Criteria:**
  - Endpoints: `/ingest`, `/query`, `/verify`, `/health`, `/attestation`
  - JSON request/response format
  - Authentication: API key (local-only)
  - Async processing for ingestion jobs

#### F-009: CLI Tool (ragcli)
- **Description:** Command-line interface for developers and field operators
- **Acceptance Criteria:**
  - Commands: `ragcli ingest`, `ragcli ask`, `ragcli verify`
  - Output: Plain text answer + `attestation.json` file
  - Example: `ragcli ask "summarize threat report" --source ./classified_docs`

### 4.3 Operational Modes (P1)

#### F-010: Medical Mode
- **System Prompt:** Optimized for clinical terminology, patient safety, diagnostic framing
- **Document Types:** Lab reports, patient records, medical literature
- **Safety:** Disclaimer for non-diagnostic assistance
- **Citations:** Page-level references to source PDFs

#### F-011: Legal Mode
- **System Prompt:** Optimized for contract analysis, precedent citation, risk assessment
- **Document Types:** Contracts, case law, NDAs, compliance docs
- **Safety:** Attorney-client privilege warnings
- **Citations:** Clause-level references

#### F-012: Enterprise Mode
- **System Prompt:** Optimized for internal policy, HR, operational documentation
- **Document Types:** Policy manuals, SOPs, internal wikis, training materials
- **Safety:** Data classification awareness
- **Citations:** Section and document version references

### 4.4 Security & Compliance Features (P0)

#### F-013: Zero-Network Operation
- **Description:** All functionality works without any internet connection
- **Acceptance Criteria:**
  - Air-gapped testing passes 100% of features
  - No external API calls during inference
  - All models pre-downloaded and cached locally

#### F-014: Encrypted Vector Storage
- **Description:** pgvector/Postgres storage protected by TEE-controlled credentials and sealed keys
- **Acceptance Criteria:**
  - AES-256 encryption for index files
  - Key sealed via near.ai sealed storage
  - Decryption only possible inside authorized enclave

---

## 5. User Flows & Journeys

### 5.1 Primary Demo Flow (Chatbot UI)

```
[Start] → User opens http://localhost:3000
    ↓
[Mode Selection] → User clicks "Medical Mode"
    ↓
[Document Upload] → User drags 5 patient PDFs + 1 audio note
    ↓
[System] → Documents ingested, chunked, embedded, stored in Postgres/pgvector
    ↓
[Chat Input] → User types: "What's the latest blood report for John?"
    ↓
[Processing] → Query embedded → Top-5 chunks retrieved → LLM generates response
    ↓
[Response Display] → 
    ├─ Answer: "John's latest blood report (dated 2026-04-28) shows..."
    ├─ Citations: [PatientRecord_JohnDoe.pdf, Page 12], [LabReport_0428.pdf, Page 3]
    └─ Badge: ✅ Verified — model hash: a1b2c3d4...
    ↓
[Attestation Verification] → User clicks "Verify Attestation"
    ↓
[Verifier Panel] → Cryptographic proof displayed:
    ├─ Enclave Signature: Valid
    ├─ Model Hash: Matches expected Mistral 7B
    ├─ Execution Timestamp: 2026-04-30T19:45:00Z
    └─ near.ai Certificate: Authentic
    ↓
[End] → User continues conversation or switches to Legal Mode
```

### 5.2 API Integration Flow

```
[Enterprise HR Portal] → POST /query
    {
      "mode": "enterprise",
      "question": "What's the remote work policy?",
      "session_id": "hr-session-001"
    }
    ↓
[FastAPI Server] → Processes via TEE RAG pipeline
    ↓
[Response] → 
    {
      "answer": "The remote work policy states...",
      "citations": [
        {"doc": "HR_Policy_2026.pdf", "page": 8, "section": "3.2"}
      ],
      "attestation": {
        "model_hash": "a1b2c3d4...",
        "signature": "0x7f8e9d...",
        "timestamp": "2026-04-30T19:45:00Z"
      }
    }
```

### 5.3 CLI Flow (Field Operator)

```bash
$ ragcli ingest --source ./classified_docs --mode military
→ Ingested 23 documents. Index built. Encryption keys sealed.

$ ragcli ask "summarize threat report alpha" --mode military
→ [Answer with citations]
→ Attestation saved to ./attestation_20260430_194500.json

$ ragcli verify ./attestation_20260430_194500.json
→ ✅ Signature valid. Model hash verified. Enclave authentic.
```

---

## 6. UI/UX Requirements

### 6.1 Chatbot UI (Next.js) — Primary Interface

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔒 Offline RAG + TEE Assistant          [Medical ▼] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 Welcome to Medical Mode. Upload documents to begin.     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📎 Drop files here or click to upload               │   │
│  │    (PDF, PNG, JPG, MP3, WAV, TXT)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 What's the latest blood report for John?         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 John's latest blood report (2026-04-28) shows... │   │
│  │     Hemoglobin: 14.2 g/dL (normal)                  │   │
│  │     WBC: 6.5 K/μL (normal)                          │   │
│  │                                                     │   │
│  │ 📚 Sources:                                         │   │
│  │    • PatientRecord_JohnDoe.pdf (Page 12)            │   │
│  │    • LabReport_0428.pdf (Page 3)                    │   │
│  │                                                     │   │
│  │ ✅ Verified — model hash: a1b2c3d4...    [Verify]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Type your question...                    ] [Send]         │
└─────────────────────────────────────────────────────────────┘
```

**Design Principles:**
- Clean, clinical aesthetic for Medical; formal for Legal; corporate for Enterprise
- Color coding: Medical (teal), Legal (navy), Enterprise (slate)
- Attestation badge prominently displayed on every response
- Source citations collapsible but always accessible
- Dark mode support

### 6.2 Verifier UI Panel

**Modal/Panel Content:**
- **Status:** Large green checkmark + "Attestation Valid"
- **Model Hash:** Full hash with copy button
- **Enclave Signature:** Truncated with expand option
- **Timestamp:** Human-readable + ISO format
- **near.ai Certificate:** Link to verification details
- **Technical Details:** JSON view for advanced users

---

## 7. Non-Functional Requirements

### 7.1 Performance
| Scenario | Requirement |
|---|---|
| Document ingestion (10 PDFs, 100 pages total) | < 60 seconds |
| Query response time (P50) | < 5 seconds |
| Query response time (P95) | < 10 seconds |
| Audio transcription (1 min audio) | < 30 seconds |
| Image captioning (1 image) | < 15 seconds |
| Attestation generation overhead | < 500ms |
| UI time-to-interactive | < 3 seconds |

### 7.2 Scalability
- Support document collections up to 10,000 chunks (initial target)
- Support concurrent sessions: 1 (single-user MVP), architecture ready for multi-user
- Memory footprint: < 8GB RAM for standard operation, < 16GB recommended

### 7.3 Reliability
- Graceful degradation if TEE unavailable (dev mode with clear warning)
- Document ingestion resume on failure
- Vector index auto-backup before updates
- Session persistence across page refreshes

### 7.4 Security & Privacy
- **Zero data exfiltration:** No network calls during operation
- **Hardware isolation:** TEE prevents OS/root/hypervisor access
- **Cryptographic verification:** Every response signed and verifiable
- **Sealed storage:** Encryption keys never exposed to host system
- **Memory encryption:** Enclave memory inaccessible to host

### 7.5 Compatibility
- **OS:** Linux (primary), macOS (development), Windows (WSL2)
- **Python:** 3.11+
- **Browser:** Chrome, Firefox, Safari (latest 2 versions)
- **Hardware:** x86_64 with TEE support (Intel SGX/AMD SEV or near.ai node)

---

## 8. Open Questions & Assumptions

| # | Question | Impact | Owner |
|---|---|---|---|
| 1 | Does near.ai support the specific embedding model inside TEE? | High — may require model conversion | Engineering |
| 2 | What is the attestation API format from near.ai? | High — affects receipt structure | Engineering |
| 3 | Can pgvector run efficiently inside the TEE deployment topology? | Medium — may require split storage/enclave design | Engineering |
| 4 | Is multi-user key separation supported in near.ai sealed storage? | Medium — affects Phase 4 roadmap | Engineering |
| 5 | What is the licensing for Mistral 7B / LLaMA 3 in commercial TEE deployments? | Medium — legal review needed | Product/Legal |
| 6 | Do we need FDA/regulatory approval for Medical Mode claims? | High — affects marketing language | Product/Legal |

**Assumptions:**
- near.ai TEE nodes support Python 3.11+ and standard ML libraries
- Ollama models can be pre-baked into TEE image or downloaded securely
- Target hardware has minimum 8GB RAM available to enclave
- Users have technical capability to run Docker/local Python environments

---

## 9. Release Criteria

### MVP (Week 4) — "Demo Ready"
- [ ] Text + PDF ingestion working end-to-end
- [ ] Image + audio ingestion functional
- [ ] RAG query with source citations
- [ ] TEE deployment on near.ai
- [ ] Attestation receipt generation
- [ ] Verifier UI in Next.js
- [ ] Medical, Legal, Enterprise modes selectable
- [ ] Air-gapped functionality verified
- [ ] Demo script and video recorded

### v1.0 (Post-MVP)
- [ ] FastAPI server production-hardened
- [ ] CLI tool packaged and distributed
- [ ] Performance optimization (quantization, caching)
- [ ] Multi-user support with separate sealed key stores
- [ ] Standalone installer (.deb, .dmg, .exe)
- [ ] Benchmark report published
- [ ] Security audit completed

---

## 10. Appendix

### A. Glossary
| Term | Definition |
|---|---|
| RAG | Retrieval-Augmented Generation — augmenting LLM prompts with retrieved document context |
| TEE | Trusted Execution Environment — hardware-isolated secure processing region |
| Attestation | Cryptographic proof that specific code ran in a specific enclave |
| Sealed Storage | Encryption keys bound to enclave identity, decryptable only by authorized enclave |
| pgvector | Postgres extension for vector similarity search |
| near.ai | Confidential compute platform providing TEE nodes and attestation services |

### B. Document Change Log
| Version | Date | Changes | Author |
|---|---|---|---|
| 1.0 | 2026-04-30 | Initial PRD | Project Team |
