
"use client";

import { useState } from "react";

const suggestions = [
  {
    icon: "✍️",
    title: "Draft a document",
    description: "Create professional memos, letters and reports.",
    prompt: "Help me draft a professional official memo.",
  },
  {
    icon: "📊",
    title: "Analyse information",
    description: "Understand data, trends and performance.",
    prompt: "Help me analyse an organisation's performance report.",
  },
  {
    icon: "📝",
    title: "Summarise content",
    description: "Turn lengthy documents into clear summaries.",
    prompt: "Help me summarise a long document into key points.",
  },
  {
    icon: "💡",
    title: "Generate ideas",
    description: "Explore ideas and find solutions to problems.",
    prompt: "Help me generate ideas for improving workplace productivity.",
  },
];

export default function TalvorahAIPage() {
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState("");

  function chooseSuggestion(value: string) {
    setPrompt(value);
    setNotice("");
  }

  function handleSubmit() {
    if (!prompt.trim()) return;

    setNotice(
      "Talvorah AI's interface is ready. AI responses will be enabled when the secure AI service is connected."
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <span>Workspace</span>
              <span>/</span>
              <span className="font-medium text-slate-800">Talvorah AI</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#14213d]">
              Talvorah AI
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Your intelligent workspace assistant.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AI workspace preview
          </div>
        </div>

        {/* Welcome panel */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#14213d] via-[#172d4c] to-[#174b43] p-7 text-white shadow-lg sm:p-10">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl">
              ✨
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Meet your AI assistant
            </p>

            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              Work smarter with
              <br />
              Talvorah AI.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
              Get help with documents, reports, meetings, research and everyday
              workplace tasks — all within your Talvorah workspace.
            </p>
          </div>

          <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-12 h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        </section>

        {/* Prompt area */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#14213d]">
              What can I help you with?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Describe what you want to accomplish.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setNotice("");
              }}
              placeholder="Ask Talvorah AI anything..."
              rows={4}
              className="w-full resize-none bg-transparent p-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <p className="px-2 text-xs text-slate-400">
                AI responses are not yet connected.
              </p>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="rounded-xl bg-[#16845b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#116c49] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send message →
              </button>
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"
            >
              {notice}
            </div>
          )}
        </section>

        {/* Suggestions */}
        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#14213d]">
              Explore what AI can do
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a starting point for your work.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {suggestions.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => chooseSuggestion(item.prompt)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl transition group-hover:bg-emerald-100">
                  {item.icon}
                </div>

                <h3 className="font-bold text-[#14213d]">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-emerald-700">
                  Try this →
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Planned integrations */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-[#14213d]">
            Connected workspace capabilities
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            These are planned integrations for Talvorah AI.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "📁", title: "Documents", text: "Document assistance" },
              { icon: "🎥", title: "Meetings", text: "Meeting summaries" },
              { icon: "✓", title: "Tasks", text: "Task assistance" },
              { icon: "📈", title: "Reports", text: "Report analysis" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  {item.icon}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          Talvorah AI · Your workspace, made smarter.
        </p>
      </div>
    </div>
  );
}
