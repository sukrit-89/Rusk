"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Database,
  FileText,
  FileSearch,
  FileUp,
  Highlighter,
  KeyRound,
  Layers3,
  Layout,
  LockKeyhole,
  LogOut,
  Menu,
  Network,
  Scale,
  ScanText,
  Search,
  Save,
  ServerCog,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  UserRound,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ApiStatus, fetchApiStatus, ingestFiles, Mode, queryRag, QueryResponse, verifyReceipt } from "@/lib/api";
import { getSupabaseBrowserClient, isSupabaseConfigured, readableAuthError } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Tab = "Overview" | "Analytics" | "Corpus" | "Settings";
type TimeRange = "Daily" | "Monthly" | "Yearly";

const wobble = "255px 15px 225px 15px / 15px 225px 15px 255px";
const timeRanges: TimeRange[] = ["Daily", "Monthly", "Yearly"];
const colors = ["#ef4444", "#3b82f6", "#fbbf24", "#10b981"];

const dashboardData = {
  Daily: {
    performance: [
      { name: "00h", value: 40, task: 24 },
      { name: "04h", value: 30, task: 13 },
      { name: "08h", value: 55, task: 98 },
      { name: "12h", value: 45, task: 39 },
      { name: "16h", value: 65, task: 48 },
      { name: "20h", value: 40, task: 38 },
      { name: "24h", value: 50, task: 43 }
    ],
    pie: [
      { name: "PDF", value: 400 },
      { name: "Text", value: 300 },
      { name: "Image", value: 100 }
    ]
  },
  Monthly: {
    performance: [
      { name: "W1", value: 400, task: 240 },
      { name: "W2", value: 300, task: 139 },
      { name: "W3", value: 550, task: 980 },
      { name: "W4", value: 450, task: 390 }
    ],
    pie: [
      { name: "PDF", value: 4000 },
      { name: "Text", value: 3500 },
      { name: "Image", value: 800 }
    ]
  },
  Yearly: {
    performance: [
      { name: "Q1", value: 4000, task: 2400 },
      { name: "Q2", value: 3000, task: 1390 },
      { name: "Q3", value: 5500, task: 9800 },
      { name: "Q4", value: 4500, task: 3900 }
    ],
    pie: [
      { name: "PDF", value: 40000 },
      { name: "Text", value: 45000 },
      { name: "Image", value: 12000 }
    ]
  }
};

const menuItems: Array<{ id: Tab; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "Overview", icon: Layout },
  { id: "Analytics", icon: BarChart3 },
  { id: "Corpus", icon: Users },
  { id: "Settings", icon: Settings }
];

const ragModes: Array<{ id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "medical", label: "Medical", icon: Stethoscope },
  { id: "legal", label: "Legal", icon: Scale },
  { id: "enterprise", label: "Enterprise", icon: Building2 }
];

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; response: QueryResponse; verification?: string };

type AnswerBlock =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

function FontStyles() {
  return (
    <style jsx global>{`
      @import url("https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap");
    `}</style>
  );
}

function SketchBox({
  children,
  className,
  hover = false
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn("sketch-box", hover ? "sketch-box-hover" : "sketch-box-still", className)}
      style={{ borderRadius: wobble }}
    >
      {children}
    </div>
  );
}

function SketchButton({
  children,
  onClick,
  active,
  variant = "primary",
  className,
  type = "button",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  variant?: "primary" | "danger" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("sketch-button", `sketch-button-${variant}`, active && "sketch-button-active", className)}
      style={{ borderRadius: wobble }}
    >
      {children}
    </button>
  );
}

function TimeToggle({ active, onChange }: { active: TimeRange; onChange: (value: TimeRange) => void }) {
  return (
    <div className="time-toggle">
      {timeRanges.map((range) => (
        <SketchButton key={range} active={active === range} onClick={() => onChange(range)} className="time-button">
          {range}
        </SketchButton>
      ))}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="mode-toggle">
      {ragModes.map((item) => {
        const Icon = item.icon;
        return (
          <SketchButton key={item.id} active={mode === item.id} onClick={() => onChange(item.id)} className="mode-chip">
            <Icon className="icon-sm" />
            {item.label}
          </SketchButton>
        );
      })}
    </div>
  );
}

function RuskBrandLogo({ className }: { className?: string }) {
  return (
    <Link className={cn("brand-logo-link", className)} href="/" aria-label="Rusk AI home">
      <img src="/rusk-logo-mark.png" alt="Rusk AI" />
    </Link>
  );
}

function formatAnswerBlocks(content: string): AnswerBlock[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^[A-Z][A-Za-z\s/]+:$/.test(line)) {
        return { type: "heading", text: line.replace(/:$/, "") };
      }
      if (/^[-*•]\s+/.test(line)) {
        return { type: "bullet", text: line.replace(/^[-*•]\s+/, "") };
      }
      if (/^\d+[.)]\s+/.test(line)) {
        return { type: "bullet", text: line.replace(/^\d+[.)]\s+/, "") };
      }
      return { type: "paragraph", text: line };
    });
}

function AnswerContent({ content }: { content: string }) {
  const blocks = formatAnswerBlocks(content);
  return (
    <div className="answer-content">
      {blocks.map((block, blockIndex) => {
        const key = `${block.type}-${blockIndex}-${block.text.slice(0, 24)}`;
        if (block.type === "heading") {
          return <h4 key={key}>{block.text}</h4>;
        }
        if (block.type === "bullet") {
          return (
            <div key={key} className="answer-bullet">
              <span />
              <p>{block.text}</p>
            </div>
          );
        }
        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}

export function LandingPage() {
  const proofCards = [
    { title: "Offline-first RAG", copy: "Index private PDFs, notes, and images before asking grounded questions.", color: "soft-green", icon: FileSearch },
    { title: "TEE proof path", copy: "Receipts are shaped for NearAI attestation and sealed-storage deployment.", color: "soft-blue", icon: ShieldCheck },
    { title: "pgvector memory", copy: "Keep citations and retrieval evidence in Postgres with vector search.", color: "soft-red", icon: Database }
  ];
  const workflow = [
    { title: "Ingest", copy: "OCR, captions, chunking, hashes, and mode-aware metadata.", icon: ScanText },
    { title: "Retrieve", copy: "Hybrid-ready pgvector recall with citations attached to every answer.", icon: Network },
    { title: "Verify", copy: "Receipts bind answers, citations, model identity, and TEE state.", icon: KeyRound }
  ];
  const capabilityRows = [
    { label: "Medical", copy: "Clinical packets, lab PDFs, scanned notes, and evidence-first answers.", icon: Stethoscope },
    { label: "Legal", copy: "Contracts, case files, clauses, exhibits, and cited source trails.", icon: Scale },
    { label: "Enterprise", copy: "Policies, onboarding docs, support archives, and internal knowledge.", icon: Building2 }
  ];
  const architecture = [
    { label: "Next.js", value: "Production web shell" },
    { label: "FastAPI", value: "Python RAG orchestration" },
    { label: "Postgres", value: "pgvector evidence store" },
    { label: "Ollama", value: "Local model runtime" },
    { label: "Supabase", value: "Workspace auth" },
    { label: "NearAI", value: "TEE deployment path" }
  ];

  return (
    <div className="paper-shell landing-shell">
      <FontStyles />
      <header className="landing-nav">
        <RuskBrandLogo className="landing-brand" />
        <nav className="landing-nav-links" aria-label="Landing sections">
          <a href="#workflow">Workflow</a>
          <a href="#modes">Modes</a>
          <a href="#architecture">Stack</a>
        </nav>
        <div className="landing-actions">
          <Link className="sketch-link-button sketch-link-active" href="/auth" style={{ borderRadius: wobble }}>
            Login
          </Link>
        </div>
      </header>

      <main className="landing-hero">
        <section className="landing-copy">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="landing-kicker">
            <Sparkles className="icon-sm" />
            Offline Multimodal RAG + TEE Assistant
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            Private document intelligence, sketched for serious work.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="landing-subcopy">
            Upload sensitive corpora, ask cited questions, and verify every answer through an attestation-ready workflow before the data leaves your control.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="landing-cta">
            <Link className="sketch-link-button sketch-link-active landing-primary" href="/auth" style={{ borderRadius: wobble }}>
              <LockKeyhole className="icon-sm" />
              Enter workspace
            </Link>
            <a className="sketch-link-button" href="#workflow" style={{ borderRadius: wobble }}>
              See workflow
              <ArrowRight className="icon-sm" />
            </a>
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, rotate: -1, y: 18 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ delay: 0.18 }} className="landing-board">
          <SketchBox className="hero-paper-card" hover={false}>
            <div className="tape" />
            <div className="hero-card-header">
              <ShieldCheck className="hero-shield" />
              <span>Verified answer receipt</span>
            </div>
            <p className="hero-question">"What changed in the latest patient report?"</p>
            <div className="hero-answer-lines">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-citations">
              <b>Sources</b>
              <em>LabReport_0428.pdf p.3</em>
              <em>PatientRecord.pdf p.12</em>
            </div>
            <div className="hero-receipt-strip">
              <span>response hash</span>
              <span>citation hash</span>
              <span>TEE receipt</span>
            </div>
          </SketchBox>
        </motion.section>
      </main>

      <section className="landing-proof-grid">
        {proofCards.map((card, index) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 + index * 0.05 }}>
            <SketchBox className={cn("landing-proof-card", card.color)} hover>
              <card.icon className="proof-icon" />
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </SketchBox>
          </motion.div>
        ))}
      </section>

      <section id="workflow" className="landing-section">
        <div className="landing-section-heading">
          <p>RAG pipeline</p>
          <h2>From private files to cited answers.</h2>
        </div>
        <div className="workflow-grid">
          {workflow.map((item, index) => (
            <SketchBox key={item.title} className="workflow-card" hover>
              <div className="workflow-number">{index + 1}</div>
              <item.icon className="workflow-icon" />
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </SketchBox>
          ))}
        </div>
      </section>

      <section id="modes" className="landing-section landing-mode-section">
        <div className="landing-section-heading">
          <p>Domain modes</p>
          <h2>One assistant, different risk profiles.</h2>
        </div>
        <div className="mode-landing-grid">
          {capabilityRows.map((item) => (
            <SketchBox key={item.label} className="mode-landing-card" hover={false}>
              <item.icon className="mode-landing-icon" />
              <div>
                <h3>{item.label}</h3>
                <p>{item.copy}</p>
              </div>
            </SketchBox>
          ))}
        </div>
      </section>

      <section id="architecture" className="landing-section architecture-section">
        <SketchBox className="architecture-board" hover={false}>
          <div className="tape" />
          <div className="architecture-heading">
            <ServerCog className="architecture-icon" />
            <div>
              <p>Production stack</p>
              <h2>Built as a real web app, not a demo panel.</h2>
            </div>
          </div>
          <div className="architecture-grid">
            {architecture.map((item) => (
              <div key={item.label} className="architecture-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </SketchBox>

        <SketchBox className="trust-card" hover={false}>
          <Layers3 className="trust-icon" />
          <h3>GraphRAG-ready, without graph complexity on day one.</h3>
          <p>
            Rusk starts with grounded multimodal retrieval and keeps the data model ready for relationship-heavy Neo4j expansion when evaluation proves it is worth the operational cost.
          </p>
        </SketchBox>
      </section>

      <section className="landing-final-cta">
        <SketchBox className="final-cta-card" hover={false}>
          <h2>Bring the corpus. Keep the proof.</h2>
          <p>Open the workspace, ingest a few documents, and start measuring where ordinary retrieval is enough and where graph reasoning earns its place.</p>
          <Link className="sketch-link-button sketch-link-active landing-primary" href="/auth" style={{ borderRadius: wobble }}>
            Launch Rusk AI
            <ArrowRight className="icon-sm" />
          </Link>
        </SketchBox>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand-block">
            <RuskBrandLogo className="landing-brand" />
            <p>
              Offline multimodal RAG for private corpora, with cited answers, Supabase-authenticated workspaces, and a NearAI TEE deployment path.
            </p>
            <div className="footer-status-row">
              <span>Next.js App Router</span>
              <span>FastAPI</span>
              <span>pgvector</span>
            </div>
          </div>

          <div className="footer-link-grid">
            <div>
              <h3>Product</h3>
              <a href="#workflow">Workflow</a>
              <a href="#modes">Domain modes</a>
              <Link href="/auth">Login</Link>
              <Link href="/workspace">Workspace</Link>
            </div>
            <div>
              <h3>RAG Stack</h3>
              <span>PDF, text, image ingestion</span>
              <span>OCR + LLaVA captioning</span>
              <span>Postgres vector search</span>
              <span>Ollama local runtime</span>
            </div>
            <div>
              <h3>Trust</h3>
              <span>Answer receipts</span>
              <span>Citation hashes</span>
              <span>Sealed local key</span>
              <span>NearAI / Phala TEE path</span>
            </div>
            <div>
              <h3>Build Status</h3>
              <span>Landing complete</span>
              <span>Auth wired</span>
              <span>Async ingestion jobs</span>
              <span>GraphRAG-ready V2</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>Rusk AI private document intelligence</span>
          <span>Updated May 2, 2026</span>
        </div>
      </footer>
    </div>
  );
}

export function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [status, setStatus] = useState("Use your Supabase credentials to enter the local workspace.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Supabase public env is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setStatus(readableAuthError(error));
          return;
        }
        if (data.session) {
          router.replace("/workspace");
        }
      })
      .catch((error) => {
        if (mounted) setStatus(error instanceof Error ? error.message : "Unable to read Supabase session.");
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Supabase env is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setBusy(false);
      return;
    }

    if (!email.trim() || !password) {
      setStatus("Enter an email and password to continue.");
      setBusy(false);
      return;
    }

    const result =
      authMode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth`,
              data: {
                display_name: email.trim().split("@")[0]
              }
            }
          });

    if (result.error) {
      setBusy(false);
      setStatus(readableAuthError(result.error));
      return;
    }

    if (!result.data.session) {
      setBusy(false);
      setStatus("Account created. Check your email to confirm access, then sign in.");
      return;
    }

    setBusy(false);
    router.push("/workspace");
  }

  return (
    <div className="paper-shell login-shell">
      <FontStyles />
      <SketchBox className="login-card" hover={false}>
        <div className="tape" />
        <RuskBrandLogo className="login-brand" />
        <h2>Sign in to your secure workspace</h2>
        <p>{status}</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" placeholder="Minimum 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <div className="auth-mode-row">
            <SketchButton active={authMode === "signin"} onClick={() => setAuthMode("signin")}>
              Sign in
            </SketchButton>
            <SketchButton active={authMode === "signup"} onClick={() => setAuthMode("signup")}>
              Sign up
            </SketchButton>
          </div>
          <SketchButton type="submit" active className="login-submit" disabled={busy || !isSupabaseConfigured()}>
            <LockKeyhole className="icon-sm" />
            Continue
          </SketchButton>
        </form>

        <Link className="back-link" href="/">
          Back to landing
        </Link>
      </SketchBox>
    </div>
  );
}

export function ChatWorkspace() {
  const workspaceRouter = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState("Profile changes save to Supabase metadata.");
  const [profileBusy, setProfileBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("Monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("enterprise");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [ingestStatus, setIngestStatus] = useState("No documents indexed in this browser session.");
  const [indexedDocs, setIndexedDocs] = useState(0);
  const [indexedChunks, setIndexedChunks] = useState(0);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [apiStatusText, setApiStatusText] = useState("Checking Rusk API...");
  const lastMessage = messages.at(-1);
  const latestTeeMode = lastMessage?.role === "assistant" ? lastMessage.response.attestation.tee_mode : "none";
  const profileInitial = (profileName || userEmail || "R").slice(0, 1).toUpperCase();

  const stats = useMemo(
    () => [
      { label: "Indexed Docs", val: String(apiStatus?.documents ?? indexedDocs), color: "soft-green" },
      { label: "Vector Chunks", val: String(apiStatus?.chunks ?? indexedChunks), color: "soft-blue" },
      { label: "TEE Mode", val: latestTeeMode, color: "soft-red" }
    ],
    [apiStatus?.chunks, apiStatus?.documents, indexedChunks, indexedDocs, latestTeeMode]
  );

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setAuthReady(true);
      workspaceRouter.replace("/auth");
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data.session) {
          setAuthReady(true);
          workspaceRouter.replace("/auth");
          return;
        }
        applyUserProfile(data.session.user);
        setAuthReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthReady(true);
        workspaceRouter.replace("/auth");
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        workspaceRouter.replace("/auth");
        return;
      }
      applyUserProfile(session.user);
      setAuthReady(true);
      refreshApiStatus();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [workspaceRouter]);

  async function refreshApiStatus() {
    try {
      const status = await fetchApiStatus();
      setApiStatus(status);
      setApiStatusText(`API ${status.health.status}; DB ${status.health.database}; ${status.health.embedding_provider}`);
    } catch (error) {
      setApiStatus(null);
      setApiStatusText(error instanceof Error ? error.message : "Rusk API unavailable");
    }
  }

  if (!authReady) {
    return (
      <div className="paper-shell login-shell">
        <FontStyles />
        <SketchBox className="login-card" hover={false}>
          <RuskBrandLogo className="login-brand" />
          <h2>Checking workspace access</h2>
          <p>Verifying your Supabase session before opening the RAG console.</p>
        </SketchBox>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setQuestion("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    try {
      const response = await queryRag(trimmed, mode);
      setMessages((current) => [...current, { role: "assistant", content: response.answer, response }]);
      refreshApiStatus();
    } catch (error) {
      const content = error instanceof Error ? error.message : "Query failed.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content,
          response: {
            answer: content,
            citations: [],
            attestation: {
              id: null,
              tee_mode: "none",
              provider: "client",
              model_name: "unknown",
              model_hash: "",
              response_hash: "",
              citations_hash: "",
              signature: "",
              certificate: {}
            },
            latency_ms: 0
          }
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    setIngestStatus(`Indexing ${files.length} file(s)...`);
    try {
      const result = await ingestFiles(Array.from(files), mode, (job) => {
        setIngestStatus(`Job ${job.status}: ${job.document_count} document(s), ${job.chunk_count} chunk(s).`);
      });
      setIndexedDocs((current) => current + result.document_count);
      setIndexedChunks((current) => current + result.chunk_count);
      setIngestStatus(`${result.document_count} document(s), ${result.chunk_count} chunk(s) indexed for ${mode}.`);
      refreshApiStatus();
    } catch (error) {
      setIngestStatus(error instanceof Error ? error.message : "Ingestion failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(index: number, response: QueryResponse) {
    const result = await verifyReceipt(response.attestation);
    setMessages((current) =>
      current.map((message, messageIndex) =>
        messageIndex === index && message.role === "assistant"
          ? { ...message, verification: `${result.valid ? "Valid" : "Invalid"}: ${result.reason}` }
          : message
      )
    );
  }

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    workspaceRouter.replace("/auth");
  }

  function applyUserProfile(user: { email?: string; user_metadata?: Record<string, unknown> }) {
    const metadata = user.user_metadata ?? {};
    const name = String(metadata.display_name ?? metadata.full_name ?? "").trim();
    const image = String(metadata.avatar_url ?? metadata.picture ?? "").trim();
    setUserEmail(user.email ?? "secure operator");
    setProfileName(name || (user.email ? user.email.split("@")[0] : "Rusk operator"));
    setAvatarUrl(image);
  }

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setProfileStatus("Supabase is not configured for profile updates.");
      return;
    }

    setProfileBusy(true);
    setProfileStatus("Saving profile...");
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: profileName.trim(),
        avatar_url: avatarUrl.trim()
      }
    });

    if (error) {
      setProfileStatus(error.message);
      setProfileBusy(false);
      return;
    }

    if (data.user) {
      applyUserProfile(data.user);
    }
    setProfileStatus("Profile updated.");
    setProfileBusy(false);
  }

  return (
    <div className="paper-shell">
      <FontStyles />

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mobile-overlay"
          >
            <button onClick={() => setMobileMenuOpen(false)} className="mobile-close">
              <X className="icon-xl" />
            </button>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className="mobile-menu-item"
              >
                {item.id}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="paper-layout">
        <aside className="paper-sidebar">
          <RuskBrandLogo />

          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <SketchButton
                  key={item.id}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="nav-button"
                >
                  <Icon className={cn("icon-sm", activeTab === item.id ? "ink-dark" : "ink-muted")} />
                  {item.id}
                </SketchButton>
              );
            })}
          </nav>

          <SketchBox className="pro-card" hover={false}>
            <p className="pro-title">TEE Plan</p>
            <p className="pro-copy">{apiStatus?.health.tee_mode ?? "NearAI adapter pending"}</p>
            <div className="pro-meter">
              <div />
            </div>
          </SketchBox>
        </aside>

        <main className="paper-main">
          <header className="paper-header">
            <div className="mobile-title">
              <button onClick={() => setMobileMenuOpen(true)}>
                <Menu className="icon-md" />
              </button>
              <span>{activeTab}</span>
            </div>

            <div className="desktop-title">
              <h2>{activeTab}</h2>
            </div>

            <div className="header-actions">
              {activeTab !== "Settings" ? (
                <div className="desktop-only">
                  <TimeToggle active={timeRange} onChange={setTimeRange} />
                </div>
              ) : null}
              <div className="search-box">
                <Search className="search-icon" />
                <input type="text" placeholder="Search..." />
              </div>
              <button className="notification-button" type="button" aria-label="Notifications">
                <Bell className="icon-sm" />
              </button>
              <div className="profile-shell">
                <button className="profile-trigger" type="button" onClick={() => setProfileOpen((current) => !current)} aria-expanded={profileOpen}>
                  <div className="avatar" aria-hidden="true">
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{profileInitial}</span>}
                  </div>
                  <span className="profile-trigger-text">
                    <strong>{profileName || "Rusk operator"}</strong>
                    <em>{userEmail}</em>
                  </span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="profile-panel"
                    >
                      <div className="profile-panel-header">
                        <div className="profile-panel-avatar">
                          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound className="icon-md" />}
                        </div>
                        <div>
                          <h3>Profile</h3>
                          <p>Workspace identity</p>
                        </div>
                      </div>

                      <form className="profile-form" onSubmit={onSaveProfile}>
                        <label>
                          Display name
                          <input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} />
                        </label>
                        <label>
                          Email
                          <input value={userEmail} readOnly aria-readonly="true" />
                        </label>
                        <label>
                          Profile image URL
                          <span className="profile-image-input">
                            <Camera className="icon-sm" />
                            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
                          </span>
                        </label>
                        <p className="profile-status">{profileStatus}</p>
                        <div className="profile-actions">
                          <SketchButton type="submit" active disabled={profileBusy}>
                            <Save className="icon-sm" />
                            Save
                          </SketchButton>
                          <SketchButton variant="ghost" onClick={onSignOut}>
                            <LogOut className="icon-sm" />
                            Sign out
                          </SketchButton>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <div className="paper-content">
            <div className="content-inner">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "Overview" && (
                    <OverviewView
                      stats={stats}
                      apiStatus={apiStatus}
                      apiStatusText={apiStatusText}
                      timeRange={timeRange}
                      mode={mode}
                      setMode={setMode}
                      messages={messages}
                      question={question}
                      setQuestion={setQuestion}
                      busy={busy}
                      onSubmit={onSubmit}
                      onVerify={onVerify}
                    />
                  )}
                  {activeTab === "Analytics" && (
                    <AnalyticsView
                      timeRange={timeRange}
                      indexedDocs={apiStatus?.documents ?? indexedDocs}
                      indexedChunks={apiStatus?.chunks ?? indexedChunks}
                    />
                  )}
                  {activeTab === "Corpus" && <CorpusView mode={mode} setMode={setMode} ingestStatus={ingestStatus} busy={busy} onUpload={onUpload} />}
                  {activeTab === "Settings" && <SettingsView mode={mode} setMode={setMode} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewView({
  stats,
  apiStatus,
  apiStatusText,
  timeRange,
  mode,
  setMode,
  messages,
  question,
  setQuestion,
  busy,
  onSubmit,
  onVerify
}: {
  stats: Array<{ label: string; val: string; color: string }>;
  apiStatus: ApiStatus | null;
  apiStatusText: string;
  timeRange: TimeRange;
  mode: Mode;
  setMode: (mode: Mode) => void;
  messages: Message[];
  question: string;
  setQuestion: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: (index: number, response: QueryResponse) => void;
}) {
  const data = dashboardData[timeRange];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="view-stack">
      <div className="stats-grid">
        {stats.map((stat) => (
          <SketchBox key={stat.label} className={cn("stat-card", stat.color)} hover>
            <h3>{stat.label}</h3>
            <div className="stat-value-row">
              <span>{stat.val}</span>
              <em>(live)</em>
            </div>
          </SketchBox>
        ))}
      </div>

      <div className="overview-grid">
        <SketchBox className="chat-card" hover={false}>
          <div className="chat-card-header">
            <h3>
              <Highlighter className="marker-icon" />
              Rusk Assistant
            </h3>
            <div className={cn("api-status-pill", apiStatus?.health.status === "ok" ? "api-ok" : "api-warn")}>
              <ShieldCheck className="icon-sm" />
              <span>{apiStatusText}</span>
            </div>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          <div className="paper-messages">
            {messages.length === 0 ? (
              <div className="empty-paper">
                <CheckCircle2 className="empty-icon" />
                <p>Upload a private corpus, then ask a grounded question. Citations and attestations appear with each answer.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={cn("paper-message", message.role)}>
                  {message.role === "assistant" ? <AnswerContent content={message.content} /> : <p>{message.content}</p>}
                  {message.role === "assistant" && message.response.citations.length > 0 ? (
                    <div className="citation-row">
                      {message.response.citations.map((citation, citationIndex) => (
                        <span
                          key={[
                            citation.document_id,
                            citation.chunk_index,
                            citation.page ?? "no-page",
                            citation.section ?? "no-section",
                            citationIndex
                          ].join("-")}
                        >
                          {citation.document_name}
                          {citation.page ? ` p.${citation.page}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {message.role === "assistant" ? (
                    <SketchButton variant="ghost" onClick={() => onVerify(index, message.response)} className="verify-sketch">
                      <ShieldCheck className="icon-sm" />
                      {message.verification ?? "Verify attestation"}
                    </SketchButton>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <form className="paper-composer" onSubmit={onSubmit}>
            <input
              aria-label="Question"
              placeholder="Ask a question about indexed documents..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <SketchButton type="submit" disabled={busy} className="send-button">
              <Send className="icon-sm" />
            </SketchButton>
          </form>
        </SketchBox>

        <SketchBox className="pulse-card" hover={false}>
          <h3>Retrieval Pulse</h3>
          <ResponsiveContainer width="100%" height="78%">
            <AreaChart data={data.performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: "Architects Daughter" }} hide />
              <Tooltip contentStyle={{ fontFamily: "Architects Daughter", border: "2px solid black" }} />
              <Area type="step" dataKey="task" stroke="#6366f1" fill="#c7d2fe" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
          <p>Active Context Load</p>
        </SketchBox>
      </div>
    </motion.div>
  );
}

function AnalyticsView({ timeRange, indexedDocs, indexedChunks }: { timeRange: TimeRange; indexedDocs: number; indexedChunks: number }) {
  const data = dashboardData[timeRange];
  const taskData = data.performance.map((item) => ({ ...item, value: item.value + indexedDocs, task: item.task + indexedChunks }));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="analytics-grid">
      <SketchBox className="chart-card" hover={false}>
        <h3>Corpus Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value" stroke="#000" strokeWidth={2}>
              {data.pie.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontFamily: "Architects Daughter", border: "2px solid black", borderRadius: "10px" }} />
          </PieChart>
        </ResponsiveContainer>
      </SketchBox>

      <SketchBox className="chart-card" hover={false}>
        <h3>Chunks vs Queries</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={taskData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontFamily: "Architects Daughter" }} />
            <YAxis tick={{ fontFamily: "Architects Daughter" }} />
            <Tooltip contentStyle={{ fontFamily: "Architects Daughter", border: "2px solid black", borderRadius: "10px" }} />
            <Bar dataKey="value" fill="#3b82f6" stackId="a" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
            <Bar dataKey="task" fill="#ef4444" stackId="a" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SketchBox>
    </motion.div>
  );
}

function CorpusView({
  mode,
  setMode,
  ingestStatus,
  busy,
  onUpload
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  ingestStatus: string;
  busy: boolean;
  onUpload: (files: FileList | null) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="corpus-grid">
      <SketchBox className="upload-card" hover>
        <div className="tape" />
        <FileUp className="upload-icon" />
        <h3>Drop Knowledge Here</h3>
        <p>PDF, TXT, MD, CSV, JSON, YAML, PNG, JPG</p>
        <ModeToggle mode={mode} onChange={setMode} />
        <label className="upload-input-label">
          <input multiple type="file" disabled={busy} onChange={(event) => onUpload(event.target.files)} />
          Choose files
        </label>
      </SketchBox>

      <SketchBox className="corpus-note" hover={false}>
        <FileText className="note-icon" />
        <h3>Index Status</h3>
        <p>{ingestStatus}</p>
      </SketchBox>
    </motion.div>
  );
}

function SettingsView({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="settings-grid">
      <SketchBox className="settings-card" hover={false}>
        <h3>
          <Activity className="icon-md" />
          Rusk Global Settings
        </h3>
        <div className="settings-list">
          <label>
            <span>Enable Dark Ink</span>
            <input type="checkbox" />
          </label>
          <label>
            <span>Push Notifications</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label>
            <span>Autosave Sessions</span>
            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </SketchBox>

      <SketchBox className="settings-card" hover={false}>
        <h3>
          <ShieldCheck className="icon-md" />
          Operational Mode
        </h3>
        <ModeToggle mode={mode} onChange={setMode} />
      </SketchBox>
    </motion.div>
  );
}
