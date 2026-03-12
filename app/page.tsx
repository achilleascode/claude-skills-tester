"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { MODELS, type LogEntry, type ChatMessage } from "@/lib/config";

export default function Home() {
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const totalIn = logs.reduce((s, l) => s + l.inputTokens, 0);
    const totalOut = logs.reduce((s, l) => s + l.outputTokens, 0);
    const avgTime = Math.round(logs.reduce((s, l) => s + l.responseTimeMs, 0) / logs.length);
    const byModel: Record<string, { count: number; tokens: number }> = {};
    for (const l of logs) {
      if (!byModel[l.model]) byModel[l.model] = { count: 0, tokens: 0 };
      byModel[l.model].count++;
      byModel[l.model].tokens += l.inputTokens + l.outputTokens;
    }
    return { totalIn, totalOut, total: totalIn + totalOut, avgTime, byModel, count: logs.length };
  }, [logs]);

  const modelName = MODELS.find((m) => m.id === model)?.name ?? "";

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      let assistantText = "";
      if (data.content && Array.isArray(data.content)) {
        assistantText = data.content
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("\n");
      }

      if (data.error) {
        assistantText = `[Error] ${data.error}`;
      }

      if (assistantText) {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      }

      const log: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: data._meta?.timestamp || new Date().toISOString(),
        skill: "all (3)",
        skillId: "all",
        model: modelName,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        responseTimeMs: data._meta?.response_time_ms ?? 0,
        userMessage: text,
        assistantMessage: assistantText.slice(0, 200),
        rawResponse: data,
        error: data.error,
      };
      setLogs((prev) => [log, ...prev]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error";
      setMessages((prev) => [...prev, { role: "assistant", content: `[Error] ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  }

  // Handle pause_turn - auto-resume
  useEffect(() => {
    if (logs.length === 0) return;
    const latest = logs[0];
    const raw = latest.rawResponse as Record<string, unknown>;
    const container = raw?.container as Record<string, unknown> | undefined;
    if (raw?.stop_reason === "pause_turn" && container?.id) {
      // Auto-resume: send empty continuation
      const resume = async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODELS.find((m) => m.name === latest.model)?.id ?? model,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
              containerId: container.id,
            }),
          });
          const data = await res.json();
          let text = "";
          if (data.content && Array.isArray(data.content)) {
            text = data.content
              .filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text)
              .join("\n");
          }
          if (text) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return [...prev.slice(0, -1), { role: "assistant", content: last.content + text }];
              }
              return [...prev, { role: "assistant", content: text }];
            });
          }
        } finally {
          setLoading(false);
        }
      };
      resume();
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-semibold">Claude Skills Tester</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
            3 Skills aktiv
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setMessages([]);
              setInput("");
            }}
            className="text-sm text-gray-400 hover:text-white px-2 py-1"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg">Alle 3 Skills aktiv - einfach Frage stellen</p>
            <p className="text-sm mt-1">Logs werden unten angezeigt</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100 border border-gray-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-400">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Frage eingeben..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Senden
          </button>
        </div>
      </div>

      {/* Logs Panel */}
      <div className="border-t border-gray-800">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white flex items-center justify-between"
        >
          <span>Logs ({logs.length} Requests)</span>
          <span>{showLogs ? "▼" : "▲"}</span>
        </button>

        {showLogs && (
          <div className="max-h-80 overflow-y-auto px-4 pb-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <StatCard label="Requests" value={stats.count} />
                <StatCard label="Input Tokens" value={stats.totalIn.toLocaleString()} />
                <StatCard label="Output Tokens" value={stats.totalOut.toLocaleString()} />
                <StatCard label="Avg Response" value={`${(stats.avgTime / 1000).toFixed(1)}s`} />
              </div>
            )}

            {/* Per-model breakdown */}
            {stats && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {Object.entries(stats.byModel).map(([m, d]) => (
                  <span key={m} className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
                    {m}: {d.count}x / {d.tokens.toLocaleString()} tokens
                  </span>
                ))}
              </div>
            )}

            {/* Log entries */}
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">Noch keine Requests</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-lg text-xs">
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-800/50"
                    >
                      <span className={log.error ? "text-red-400" : "text-green-400"}>
                        {log.error ? "ERR" : "OK"}
                      </span>
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-blue-400">{log.skill}</span>
                      <span className="text-purple-400">{log.model}</span>
                      <span className="text-gray-400">
                        {log.inputTokens}in / {log.outputTokens}out
                      </span>
                      <span className="text-yellow-400 ml-auto">{(log.responseTimeMs / 1000).toFixed(1)}s</span>
                    </button>
                    {expandedLog === log.id && (
                      <div className="px-3 pb-3 border-t border-gray-800 mt-1 pt-2 space-y-2">
                        <div>
                          <span className="text-gray-500">User: </span>
                          <span className="text-gray-300">{log.userMessage}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Assistant: </span>
                          <span className="text-gray-300">{log.assistantMessage}...</span>
                        </div>
                        <details>
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                            Raw JSON Response
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-950 rounded text-[10px] overflow-x-auto max-h-60 overflow-y-auto">
                            {JSON.stringify(log.rawResponse, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
      <div className="text-sm font-mono font-medium">{value}</div>
    </div>
  );
}
