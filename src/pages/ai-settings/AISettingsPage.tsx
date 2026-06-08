import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Key, ExternalLink, CheckCircle2, XCircle, Zap, Brain,
  Sparkles, Shield, Globe, Cpu, Settings2, Eye, EyeOff, Trash2,
  Copy, Check, Info, AlertTriangle, Radio, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// ===== Unified AI Provider Registry =====
interface AIModel {
  id: string;
  name: string;
  provider: string;
  providerIcon: string;
  model: string;
  tier: string;
  desc: string;
  freeInfo: string;
  keyUrl: string;
  keyPrefix: string;
  storageKey: string; // localStorage key for the API key
  envKey: string;     // env variable name
  category: "analysis" | "automation" | "both";
  features: string[];
  color: string;
}

const ALL_MODELS: AIModel[] = [
  // ── Contract Analyzer providers (from ContractAnalyzerPage) ──
  {
    id: "groq",
    name: "Groq (Llama 3.3 70B)",
    provider: "Groq",
    providerIcon: "⚡",
    model: "llama-3.3-70b-versatile",
    tier: "Free",
    desc: "Ultra-fast inference on Llama 3.3 70B",
    freeInfo: "14,400 req/day • Fastest provider",
    keyUrl: "https://console.groq.com/keys",
    keyPrefix: "gsk_",
    storageKey: "api_key_groq",
    envKey: "VITE_GROQ_API_KEY",
    category: "analysis",
    features: ["Ultra-fast", "Free tier", "OpenAI compatible"],
    color: "#f97316"
  },
  {
    id: "gemini-analyzer",
    name: "Google Gemini 2.5 Pro",
    provider: "Google",
    providerIcon: "🔮",
    model: "gemini-2.5-pro",
    tier: "Premium",
    desc: "Best quality via secure Edge Function",
    freeInfo: "15 req/min • Direct PDF support",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    storageKey: "api_key_gemini",
    envKey: "VITE_GEMINI_API_KEY",
    category: "analysis",
    features: ["PDF native", "Edge Function", "Best quality"],
    color: "#4285f4"
  },
  {
    id: "openrouter",
    name: "OpenRouter (Llama 3.3 70B)",
    provider: "OpenRouter",
    providerIcon: "🌐",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    tier: "Free",
    desc: "Multi-model gateway with free access",
    freeInfo: "50 req/day • Multiple free models",
    keyUrl: "https://openrouter.ai/keys",
    keyPrefix: "sk-or-",
    storageKey: "api_key_openrouter",
    envKey: "VITE_OPENROUTER_API_KEY",
    category: "analysis",
    features: ["Multi-model", "Free tier", "OpenAI compatible"],
    color: "#8b5cf6"
  },
  {
    id: "cohere",
    name: "Cohere (Command R+)",
    provider: "Cohere",
    providerIcon: "🧬",
    model: "command-r-plus-08-2024",
    tier: "Free",
    desc: "Advanced RAG-optimized model",
    freeInfo: "1,000 req/month • 20 req/min",
    keyUrl: "https://dashboard.cohere.com/api-keys",
    keyPrefix: "",
    storageKey: "api_key_cohere",
    envKey: "VITE_COHERE_API_KEY",
    category: "analysis",
    features: ["RAG optimized", "Free tier", "Enterprise ready"],
    color: "#39c89a"
  },
  // ── Contract Automation providers (from gemini-analyzer.ts) ──
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    providerIcon: "🔮",
    model: "gemini-2.5-pro",
    tier: "Premium",
    desc: "Best quality, slower — FIDIC analysis",
    freeInfo: "Server-side via Edge Function",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    storageKey: "__edge_function__",
    envKey: "GEMINI_API_KEY",
    category: "automation",
    features: ["3× Parallel AI", "FIDIC Mega Prompt", "Bilingual"],
    color: "#4285f4"
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    providerIcon: "⚡",
    model: "gemini-2.5-flash",
    tier: "Fast",
    desc: "Good quality, fast response",
    freeInfo: "Server-side via Edge Function",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    storageKey: "__edge_function__",
    envKey: "GEMINI_API_KEY",
    category: "automation",
    features: ["Fast", "FIDIC Mega Prompt", "Bilingual"],
    color: "#fbbc04"
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    providerIcon: "✅",
    model: "gemini-2.0-flash",
    tier: "Stable",
    desc: "Most reliable quota",
    freeInfo: "Server-side via Edge Function",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    storageKey: "__edge_function__",
    envKey: "GEMINI_API_KEY",
    category: "automation",
    features: ["Stable quota", "FIDIC Mega Prompt", "Bilingual"],
    color: "#34a853"
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    providerIcon: "📘",
    model: "gemini-1.5-pro",
    tier: "Legacy",
    desc: "Reliable with separate quota",
    freeInfo: "Server-side via Edge Function",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    storageKey: "__edge_function__",
    envKey: "GEMINI_API_KEY",
    category: "automation",
    features: ["Separate quota", "FIDIC Mega Prompt", "Bilingual"],
    color: "#4285f4"
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    providerIcon: "🚀",
    model: "gemini-1.5-flash",
    tier: "Legacy Fast",
    desc: "Fastest with separate quota",
    freeInfo: "Server-side via Edge Function",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
    storageKey: "__edge_function__",
    envKey: "GEMINI_API_KEY",
    category: "automation",
    features: ["Fastest", "Separate quota", "Bilingual"],
    color: "#ea4335"
  },
];

// ===== Active selections storage keys =====
const ACTIVE_ANALYSIS_KEY = "preferred_ai_provider";
const ACTIVE_AUTOMATION_KEY = "preferred_automation_model";

// Built-in default API keys (pre-configured)
const BUILT_IN_KEYS: Record<string, string> = {
  api_key_gemini: "AIzaSyAWiW8PDccWe3-DgBcSrwh8jSEMcPyqfV4",
};

function getApiKeyValue(model: AIModel): string {
  if (model.storageKey === "__edge_function__") return "__SERVER__";
  const envVal = (import.meta.env as any)[model.envKey];
  if (envVal) return envVal;
  const stored = localStorage.getItem(model.storageKey);
  if (stored) return stored;
  // Fall back to built-in default
  return BUILT_IN_KEYS[model.storageKey] || "";
}

function maskKey(key: string): string {
  if (!key || key === "__SERVER__") return "";
  if (key.length <= 8) return "••••••••";
  return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
}

// ===== Component =====
export default function AISettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"models" | "api">("models");
  const [activeFilter, setActiveFilter] = useState<"all" | "analysis" | "automation">("all");

  // Model selections
  const [activeAnalysisModel, setActiveAnalysisModel] = useState(() =>
    localStorage.getItem(ACTIVE_ANALYSIS_KEY) || "groq"
  );
  const [activeAutomationModel, setActiveAutomationModel] = useState(() =>
    localStorage.getItem(ACTIVE_AUTOMATION_KEY) || "gemini-2.0-flash"
  );

  // API key editing
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempKeyValue, setTempKeyValue] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredModels = ALL_MODELS.filter(m => {
    if (activeFilter === "all") return true;
    return m.category === activeFilter || m.category === "both";
  });

  const selectModel = (model: AIModel) => {
    if (model.category === "analysis" || model.category === "both") {
      setActiveAnalysisModel(model.id);
      localStorage.setItem(ACTIVE_ANALYSIS_KEY, model.id);
      toast.success(`✅ ${model.name} set as Analysis provider`);
    }
    if (model.category === "automation" || model.category === "both") {
      setActiveAutomationModel(model.id);
      localStorage.setItem(ACTIVE_AUTOMATION_KEY, model.id);
      toast.success(`✅ ${model.name} set as Automation model`);
    }
  };

  const isModelActive = (model: AIModel) => {
    if (model.category === "analysis") return activeAnalysisModel === model.id;
    if (model.category === "automation") return activeAutomationModel === model.id;
    return activeAnalysisModel === model.id || activeAutomationModel === model.id;
  };

  const hasKey = (model: AIModel) => {
    const val = getApiKeyValue(model);
    return val === "__SERVER__" || val.length > 0;
  };

  const saveKey = (model: AIModel) => {
    if (model.storageKey === "__edge_function__") return;
    if (tempKeyValue.trim()) {
      localStorage.setItem(model.storageKey, tempKeyValue.trim());
      toast.success(`✅ API key saved for ${model.name}`);
      setTempKeyValue("");
      setEditingKey(null);
    }
  };

  const deleteKey = (model: AIModel) => {
    if (model.storageKey === "__edge_function__") return;
    localStorage.removeItem(model.storageKey);
    toast.success(`🗑️ API key removed for ${model.name}`);
    setEditingKey(null);
  };

  const copyKey = (model: AIModel) => {
    const key = getApiKeyValue(model);
    if (key && key !== "__SERVER__") {
      navigator.clipboard.writeText(key);
      setCopiedId(model.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Unique providers for API tab grouped
  const uniqueProviders = [...new Set(ALL_MODELS.filter(m => m.storageKey !== "__edge_function__").map(m => m.storageKey))];
  const apiModels = ALL_MODELS.filter(m => m.storageKey !== "__edge_function__");
  const seenProviders = new Set<string>();
  const uniqueApiModels = apiModels.filter(m => {
    if (seenProviders.has(m.storageKey)) return false;
    seenProviders.add(m.storageKey);
    return true;
  });

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 style={styles.title}>
              <Brain size={24} style={{ color: "#a78bfa" }} />
              AI Model Settings
            </h1>
            <p style={styles.subtitle}>
              Choose your AI model for each analysis system and manage API keys
            </p>
          </div>
        </div>

        {/* Active Model Badges */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={styles.activeBadge}>
            <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Analysis</span>
            <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>
              {ALL_MODELS.find(m => m.id === activeAnalysisModel)?.name || activeAnalysisModel}
            </span>
          </div>
          <div style={styles.activeBadge}>
            <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Automation</span>
            <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 13 }}>
              {ALL_MODELS.find(m => m.id === activeAutomationModel)?.name || activeAutomationModel}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tab, ...(activeTab === "models" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("models")}
        >
          <Cpu size={16} />
          AI Models
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "api" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("api")}
        >
          <Key size={16} />
          API Keys
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB: MODELS */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "models" && (
        <>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {([
              { key: "all", label: "All Models", icon: <Globe size={14} /> },
              { key: "analysis", label: "Contract Analyzer", icon: <Sparkles size={14} /> },
              { key: "automation", label: "AI Automation", icon: <Zap size={14} /> },
            ] as const).map(f => (
              <button
                key={f.key}
                style={{
                  ...styles.filterPill,
                  ...(activeFilter === f.key ? styles.filterPillActive : {})
                }}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Model Cards */}
          <div style={styles.modelGrid}>
            {filteredModels.map(model => {
              const active = isModelActive(model);
              const keyOk = hasKey(model);
              return (
                <div
                  key={model.id}
                  style={{
                    ...styles.modelCard,
                    borderColor: active ? model.color : "rgba(148,163,184,0.15)",
                    background: active
                      ? `linear-gradient(135deg, ${model.color}08, ${model.color}04)`
                      : "rgba(15,23,42,0.6)",
                    boxShadow: active
                      ? `0 0 20px ${model.color}20, inset 0 1px 0 ${model.color}15`
                      : "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Active badge */}
                  {active && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      background: model.color, color: "#fff",
                      fontSize: 10, fontWeight: 700, padding: "3px 10px",
                      borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5,
                    }}>
                      <Radio size={10} style={{ display: "inline", marginRight: 4 }} />
                      Active
                    </div>
                  )}

                  {/* Provider info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: `${model.color}15`, border: `1px solid ${model.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22
                    }}>
                      {model.providerIcon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                        {model.name}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{model.provider}</div>
                    </div>
                  </div>

                  <p style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
                    {model.desc}
                  </p>

                  {/* Tier + Category badges */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px",
                      borderRadius: 6, background: `${model.color}18`, color: model.color,
                      border: `1px solid ${model.color}30`
                    }}>
                      {model.tier}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 8px",
                      borderRadius: 6, background: "rgba(148,163,184,0.1)", color: "#94a3b8",
                      border: "1px solid rgba(148,163,184,0.15)"
                    }}>
                      {model.category === "analysis" ? "📊 Analyzer" :
                       model.category === "automation" ? "🤖 Automation" : "📊🤖 Both"}
                    </span>
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                    {model.features.map((f, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 4,
                        background: "rgba(148,163,184,0.08)", color: "#94a3b8",
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Free info */}
                  <div style={{
                    fontSize: 11, color: "#64748b", marginBottom: 16,
                    padding: "6px 10px", borderRadius: 8,
                    background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)"
                  }}>
                    <Info size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    {model.freeInfo}
                  </div>

                  {/* Status + Action */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {keyOk ? (
                        <>
                          <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                          <span style={{ fontSize: 11, color: "#22c55e" }}>
                            {model.storageKey === "__edge_function__" ? "Server-side" : "Key saved"}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} style={{ color: "#ef4444" }} />
                          <span style={{ fontSize: 11, color: "#ef4444" }}>Key required</span>
                        </>
                      )}
                    </div>

                    {active ? (
                      <div style={{
                        padding: "6px 16px", borderRadius: 8,
                        background: `${model.color}15`, color: model.color,
                        fontSize: 12, fontWeight: 700, border: `1px solid ${model.color}30`
                      }}>
                        ✓ Selected
                      </div>
                    ) : (
                      <button
                        onClick={() => selectModel(model)}
                        style={{
                          padding: "6px 16px", borderRadius: 8, cursor: "pointer",
                          background: "rgba(148,163,184,0.1)", color: "#e2e8f0",
                          fontSize: 12, fontWeight: 600, border: "1px solid rgba(148,163,184,0.2)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = `${model.color}20`;
                          e.currentTarget.style.borderColor = `${model.color}50`;
                          e.currentTarget.style.color = model.color;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(148,163,184,0.1)";
                          e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)";
                          e.currentTarget.style.color = "#e2e8f0";
                        }}
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB: API KEYS */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "api" && (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Info banner */}
          <div style={styles.infoBanner}>
            <Shield size={18} style={{ color: "#a78bfa", flexShrink: 0 }} />
            <div>
              <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                API keys are stored locally in your browser
              </p>
              <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>
                Keys are saved in localStorage and never sent to our servers. Gemini Automation models use a server-side Edge Function (no client key needed).
              </p>
            </div>
          </div>

          {/* Automation note */}
          <div style={{
            ...styles.infoBanner,
            borderColor: "rgba(201,168,76,0.2)",
            background: "rgba(201,168,76,0.05)",
            marginBottom: 24,
          }}>
            <Zap size={18} style={{ color: "#C9A84C", flexShrink: 0 }} />
            <div>
              <p style={{ color: "#C9A84C", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                Automation Models (Gemini 2.5/2.0/1.5)
              </p>
              <p style={{ color: "#94a3b8", fontSize: 12 }}>
                These models run via server-side Edge Function — no API key configuration needed here.
              </p>
            </div>
          </div>

          {/* API Key Cards */}
          {uniqueApiModels.map(model => {
            const keyVal = getApiKeyValue(model);
            const keyExists = keyVal.length > 0;
            const isEditing = editingKey === model.id;
            const isShowing = showKeys[model.id] || false;

            return (
              <div key={model.id} style={styles.apiCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${model.color}15`, border: `1px solid ${model.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20
                  }}>
                    {model.providerIcon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700 }}>{model.provider}</div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>{model.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {keyExists ? (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#22c55e", fontWeight: 600,
                        padding: "4px 10px", borderRadius: 6,
                        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)"
                      }}>
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#ef4444", fontWeight: 600,
                        padding: "4px 10px", borderRadius: 6,
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)"
                      }}>
                        <XCircle size={12} /> Not Set
                      </span>
                    )}
                  </div>
                </div>

                {/* Current key display */}
                {keyExists && !isEditing && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: 10,
                    background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.1)",
                    marginBottom: 12,
                  }}>
                    <Key size={14} style={{ color: "#64748b" }} />
                    <code style={{ flex: 1, fontSize: 13, color: "#94a3b8", fontFamily: "monospace" }}>
                      {isShowing ? keyVal : maskKey(keyVal)}
                    </code>
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, [model.id]: !prev[model.id] }))}
                      style={styles.iconBtn}
                      title={isShowing ? "Hide" : "Show"}
                    >
                      {isShowing ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => copyKey(model)} style={styles.iconBtn} title="Copy">
                      {copiedId === model.id ? <Check size={14} style={{ color: "#22c55e" }} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => deleteKey(model)}
                      style={{ ...styles.iconBtn, color: "#ef4444" }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Edit / Add key */}
                {isEditing ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="password"
                      placeholder={`Paste your ${model.provider} API key here...`}
                      value={tempKeyValue}
                      onChange={e => setTempKeyValue(e.target.value)}
                      style={styles.keyInput}
                      autoFocus
                    />
                    <button
                      onClick={() => saveKey(model)}
                      disabled={!tempKeyValue.trim()}
                      style={{
                        ...styles.saveBtn,
                        opacity: tempKeyValue.trim() ? 1 : 0.5,
                        cursor: tempKeyValue.trim() ? "pointer" : "not-allowed"
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingKey(null); setTempKeyValue(""); }}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <a
                      href={model.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.getKeyLink}
                    >
                      <ExternalLink size={12} /> Get free API key
                    </a>
                    <button
                      onClick={() => { setEditingKey(model.id); setTempKeyValue(""); }}
                      style={styles.editBtn}
                    >
                      <Key size={14} /> {keyExists ? "Update Key" : "Add Key"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Styles =====
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "24px 32px 60px",
    maxWidth: 1200,
    margin: "0 auto",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 10,
    background: "rgba(148,163,184,0.1)",
    border: "1px solid rgba(148,163,184,0.15)",
    color: "#94a3b8",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.2s",
  },
  title: {
    display: "flex", alignItems: "center", gap: 10,
    fontSize: 24, fontWeight: 800, color: "#f1f5f9",
    margin: 0,
  },
  subtitle: {
    fontSize: 13, color: "#64748b", margin: "4px 0 0",
  },
  activeBadge: {
    display: "flex", flexDirection: "column" as const, gap: 2,
    padding: "8px 16px", borderRadius: 12,
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(148,163,184,0.12)",
  },
  tabBar: {
    display: "flex", gap: 4, padding: 4, borderRadius: 14,
    background: "rgba(15,23,42,0.5)",
    border: "1px solid rgba(148,163,184,0.1)",
    marginBottom: 24, width: "fit-content",
  },
  tab: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 24px", borderRadius: 10,
    background: "transparent", border: "none",
    color: "#64748b", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s",
  },
  tabActive: {
    background: "rgba(167,139,250,0.15)",
    color: "#a78bfa",
    border: "1px solid rgba(167,139,250,0.3)",
  },
  filterPill: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 16px", borderRadius: 20,
    background: "rgba(148,163,184,0.06)",
    border: "1px solid rgba(148,163,184,0.1)",
    color: "#64748b", fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s",
  },
  filterPillActive: {
    background: "rgba(167,139,250,0.1)",
    borderColor: "rgba(167,139,250,0.3)",
    color: "#a78bfa",
  },
  modelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 16,
  },
  modelCard: {
    position: "relative" as const,
    padding: 22,
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.15)",
    transition: "all 0.3s ease",
    cursor: "default",
  },
  infoBanner: {
    display: "flex", gap: 14, padding: "16px 20px",
    borderRadius: 14, marginBottom: 16,
    background: "rgba(167,139,250,0.05)",
    border: "1px solid rgba(167,139,250,0.15)",
  },
  apiCard: {
    padding: 22, borderRadius: 16, marginBottom: 16,
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(148,163,184,0.12)",
  },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    background: "rgba(148,163,184,0.08)",
    border: "1px solid rgba(148,163,184,0.1)",
    color: "#94a3b8", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
  },
  keyInput: {
    flex: 1, padding: "10px 14px", borderRadius: 10,
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(148,163,184,0.2)",
    color: "#e2e8f0", fontSize: 13,
    fontFamily: "monospace",
    outline: "none",
  },
  saveBtn: {
    padding: "10px 20px", borderRadius: 10,
    background: "rgba(34,197,94,0.15)", color: "#22c55e",
    border: "1px solid rgba(34,197,94,0.3)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    transition: "all 0.2s",
  },
  cancelBtn: {
    padding: "10px 16px", borderRadius: 10,
    background: "rgba(148,163,184,0.08)", color: "#94a3b8",
    border: "1px solid rgba(148,163,184,0.15)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s",
  },
  editBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 10,
    background: "rgba(167,139,250,0.1)", color: "#a78bfa",
    border: "1px solid rgba(167,139,250,0.25)",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    transition: "all 0.2s",
  },
  getKeyLink: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#64748b", textDecoration: "none",
    transition: "color 0.2s",
  },
};
