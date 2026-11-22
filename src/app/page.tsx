
"use client";

import { useState } from "react";

const features = [
  {
    number: "01",
    title: "Team communication",
    description:
      "Bring conversations, team channels and video meetings into one connected workspace.",
    icon: "↗",
  },
  {
    number: "02",
    title: "Project management",
    description:
      "Plan projects, assign tasks and keep everyone aligned on what matters.",
    icon: "◫",
  },
  {
    number: "03",
    title: "Business operations",
    description:
      "Manage your people, departments and daily operations without switching platforms.",
    icon: "⌘",
  },
];

const tasks = [
  {
    title: "Redesign onboarding experience",
    status: "In progress",
    color: "bg-blue-400",
  },
  {
    title: "Prepare quarterly report",
    status: "In review",
    color: "bg-violet-400",
  },
  {
    title: "Update product roadmap",
    status: "Completed",
    color: "bg-emerald-400",
  },
];

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090c] text-white selection:bg-indigo-500/30">

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08090c]/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[68px] md:h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">

          {/* Logo */}
          <a
            href="#"
            onClick={closeMenu}
            className="text-[24px] font-semibold tracking-[-1.5px] sm:text-[25px]"
          >
            talvorah<span className="text-indigo-400">.</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-9 text-[13px] text-zinc-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#platform" className="transition hover:text-white">
              Platform
            </a>
            <a href="#about" className="transition hover:text-white">
              About
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-5">

            <a
              href="/login"
              className="hidden text-sm text-zinc-300 transition hover:text-white md:block"
            >
              Log in
            </a>

            <a
              href="/signup"
              className="rounded-lg bg-white px-4 py-2.5 text-[12px] font-semibold text-black transition hover:bg-zinc-200 sm:px-5 sm:text-[13px]"
            >
              Get started <span className="ml-1">↗</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white transition hover:bg-white/[0.07] md:hidden"
            >
              {isMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              )}
            </button>

          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-white/[0.07] bg-[#0b0c11] px-5 py-5 md:hidden"
          >
            <div className="flex flex-col gap-1">

              <a
                href="#features"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                Features
              </a>

              <a
                href="#platform"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                Platform
              </a>

              <a
                href="#about"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                About
              </a>

              <a
                href="/login"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                Log in
              </a>

              <a
                href="/signup"
                onClick={closeMenu}
                className="mt-3 rounded-lg bg-indigo-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Create your workspace →
              </a>

            </div>
          </div>
        )}

      </nav>

      {/* Hero Section */}
      <section className="relative px-5 pb-14 pt-20 text-center sm:px-6 sm:pb-16 sm:pt-28 lg:pt-36">

        <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/[0.09] blur-[110px] sm:h-[550px] sm:w-[750px] sm:blur-[130px]" />

        <div className="relative mx-auto max-w-4xl">

          {/* Announcement */}
          <div className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] tracking-wide text-zinc-300 sm:mb-9 sm:px-4 sm:text-[11px]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            INTRODUCING A BETTER WAY TO WORK
            <span className="text-zinc-500">↗</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-[clamp(2.65rem,9vw,4.75rem)] font-semibold leading-[1.08] tracking-[-2.5px] sm:tracking-[-3px]">

            Work together.

            <br />

            <span className="bg-gradient-to-r from-indigo-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Move forward.
            </span>

          </h1>

          {/* Description */}
          <p className="mx-auto mt-7 max-w-[590px] text-[14px] leading-7 text-zinc-400 sm:mt-8 sm:text-base sm:leading-8">
            Your people, projects, communication and business operations.
            Everything connected in one intelligent workspace.
          </p>

          {/* Hero Buttons */}
          <div className="mx-auto mt-9 flex max-w-[420px] flex-col justify-center gap-3 sm:mt-10 sm:flex-row">

            <a
              href="/signup"
              className="rounded-lg bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Create your workspace <span className="ml-2">→</span>
            </a>

            <a
              href="#platform"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07]"
            >
              Explore the platform
            </a>

          </div>
        </div>

        {/* Dashboard Preview */}
        <div
          id="platform"
          className="relative mx-auto mt-16 max-w-6xl scroll-mt-24 text-left sm:mt-24"
        >

          <div className="absolute -inset-5 -z-10 rounded-[30px] bg-indigo-500/[0.06] blur-3xl" />

          <div className="overflow-hidden rounded-xl border border-white/[0.12] bg-[#0d0f15] shadow-2xl shadow-black/50">

            {/* Window Header */}
            <div className="flex h-11 items-center justify-between border-b border-white/[0.07] px-3 sm:h-12 sm:px-5">

              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400/70 sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-yellow-400/70 sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-green-400/70 sm:h-2.5 sm:w-2.5" />
              </div>

              <span className="text-[10px] text-zinc-500 sm:text-[11px]">
                Talvorah Workspace
              </span>

              <span className="text-xs text-zinc-500">•••</span>

            </div>

            <div className="flex min-h-[390px]">

              {/* Sidebar */}
              <aside className="hidden w-[210px] shrink-0 border-r border-white/[0.07] p-5 sm:block">

                <div className="mb-8 flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-xs">
                    T
                  </span>
                  Acme Studio
                  <span className="ml-auto text-zinc-500">⌄</span>
                </div>

                <p className="mb-3 text-[9px] font-semibold tracking-[2px] text-zinc-600">
                  WORKSPACE
                </p>

                {["Overview", "My tasks", "Projects", "Messages", "Calendar"].map(
                  (item, i) => (
                    <div
                      key={item}
                      className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-xs ${
                        i === 0
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-500"
                      }`}
                    >
                      <span>{["◫", "☑", "▦", "◉", "▤"][i]}</span>
                      {item}

                      {i === 3 && (
                        <span className="ml-auto rounded bg-indigo-500/20 px-1.5 text-[9px] text-indigo-300">
                          3
                        </span>
                      )}
                    </div>
                  )
                )}

                <p className="mb-3 mt-9 text-[9px] font-semibold tracking-[2px] text-zinc-600">
                  MANAGEMENT
                </p>

                {["Team members", "Departments", "Settings"].map((item) => (
                  <div
                    key={item}
                    className="mb-1 flex items-center gap-3 px-3 py-2.5 text-xs text-zinc-500"
                  >
                    <span>◇</span>
                    {item}
                  </div>
                ))}

              </aside>

              {/* Main Dashboard */}
              <div className="min-w-0 flex-1 p-3 sm:p-8">

                {/* Dashboard Heading */}
                <div className="flex items-center justify-between gap-2">

                  <div className="min-w-0">

                    <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                      MONDAY, NOVEMBER 23
                    </p>

                    <h2 className="mt-2 text-base font-semibold tracking-tight sm:text-xl">
                      Good morning, Alex.
                    </h2>

                    <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">
                      Here's what's happening with your team.
                    </p>

                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-indigo-500/20 text-xs text-indigo-300 sm:h-9 sm:w-9">
                    A
                  </div>

                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 lg:grid-cols-4">

                  {[
                    ["Active projects", "12", "+2 this month"],
                    ["Open tasks", "48", "8 due today"],
                    ["Team members", "24", "All departments"],
                    ["Completed", "86%", "+12% this week"],
                  ].map(([label, value, note]) => (

                    <div
                      key={label}
                      className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4"
                    >

                      <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-semibold tracking-tight sm:mt-3 sm:text-2xl">
                        {value}
                      </p>

                      <p className="mt-1 text-[8px] text-zinc-500 sm:text-[9px]">
                        {note}
                      </p>

                    </div>

                  ))}

                </div>

                {/* Recent Tasks */}
                <div className="mt-6 overflow-hidden rounded-lg border border-white/[0.07] sm:mt-7">

                  <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-3 sm:px-4 sm:py-4">

                    <span className="text-[11px] font-semibold sm:text-xs">
                      Recent tasks
                    </span>

                    <span className="text-[9px] text-indigo-400 sm:text-[10px]">
                      View all →
                    </span>

                  </div>

                  {tasks.map((task) => (

                    <div
                      key={task.title}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-3 last:border-0 sm:px-4 sm:py-4"
                    >

                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">

                        <span className={`h-2 w-2 shrink-0 rounded-full ${task.color}`} />

                        <span className="text-[9px] text-zinc-300 sm:text-[11px]">
                          {task.title}
                        </span>

                      </div>

                      <span className="text-[9px] text-zinc-500 sm:text-[10px]">
                        {task.status}
                      </span>

                    </div>

                  ))}

                </div>

              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] tracking-wide text-zinc-600">
            A glimpse into your connected workspace
          </p>

        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28 lg:px-10"
      >

        <div className="max-w-2xl">

          <p className="text-[11px] font-semibold tracking-[2px] text-indigo-400">
            ONE CONNECTED PLATFORM
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            Everything your team needs.
            <span className="text-zinc-500">
              {" "}Nothing getting in the way.
            </span>
          </h2>

          <p className="mt-6 text-sm leading-7 text-zinc-400">
            Replace scattered tools and disconnected workflows with a unified
            environment built around how modern teams work.
          </p>

        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3">

          {features.map((feature) => (

            <div
              key={feature.number}
              className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:bg-white/[0.04] sm:p-7"
            >

              <div className="flex items-center justify-between">

                <span className="text-xs text-zinc-600">
                  {feature.number}
                </span>

                <span className="text-2xl text-indigo-400 transition group-hover:translate-x-1">
                  {feature.icon}
                </span>

              </div>

              <h3 className="mt-9 text-lg font-semibold sm:mt-12">
                {feature.title}
              </h3>

              <p className="mt-4 text-sm leading-7 text-zinc-500">
                {feature.description}
              </p>

              <div className="mt-7 text-xs text-indigo-400">
                Explore capability ↗
              </div>

            </div>

          ))}

        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="scroll-mt-24 border-y border-white/[0.07] bg-white/[0.015] px-5 py-20 text-center sm:px-6 sm:py-24"
      >

        <p className="text-[11px] font-semibold tracking-[2px] text-indigo-400">
          BUILT FOR BETTER WORK
        </p>

        <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Less switching.
          <br />
          More meaningful work.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-zinc-400">
          Talvorah brings your organization together, giving every team the
          clarity and tools to move forward.
        </p>

        <a
          href="/signup"
          className="mt-9 inline-flex rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Get started with Talvorah →
        </a>

      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/10 sm:mt-24">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-10 sm:px-6 sm:py-12 md:flex-row lg:px-10">

          <div>

            <div className="text-2xl font-bold tracking-tight text-white">
              talvorah<span className="text-indigo-400">.</span>
            </div>

            <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-500">
              One intelligent workspace for your people, projects and business
              operations.
            </p>

          </div>

          <div className="flex flex-wrap gap-x-7 gap-y-4 text-sm text-zinc-400">

            <a href="#about" className="transition hover:text-white">
              About
            </a>

            <a href="#features" className="transition hover:text-white">
              Features
            </a>

            <a href="#platform" className="transition hover:text-white">
              Platform
            </a>

            <a href="/login" className="transition hover:text-white">
              Log in
            </a>

          </div>

        </div>

        <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-zinc-500">
          © 2026 Talvorah. All rights reserved.
        </div>

      </footer>

    </main>
  );
}
