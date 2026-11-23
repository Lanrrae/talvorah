
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";

type ThemeMode = "light" | "dark" | "system";
type Accent = "emerald" | "blue" | "violet" | "rose" | "amber" | "teal";

type ThemeContextType = {
  mode: ThemeMode;
  accent: Accent;
  setMode: (value: ThemeMode) => void;
  setAccent: (value: Accent) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useWorkspaceTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme provider is missing");
  return context;
}

const navigation = [
  {
    heading: "WORKSPACE",
    items: [
      { label: "Overview", href: "/dashboard", icon: "grid" },
      { label: "Organisation", href: "/dashboard/organisation", icon: "building" },
      { label: "Departments", href: "/dashboard/departments", icon: "layers" },
      { label: "Employees", href: "/dashboard/employees", icon: "users" },
    ],
  },
  {
    heading: "MANAGEMENT",
    items: [
      { label: "Projects", href: "/dashboard/projects", icon: "folder" },
      { label: "Tasks", href: "/dashboard/tasks", icon: "check" },
      { label: "Messages", href: "/dashboard/messages", icon: "message" },
      { label: "Meetings & Calendar", href: "/dashboard/calendar", icon: "calendar" },
      { label: "Documents", href: "/dashboard/documents", icon: "file" },
    ],
  },
  {
    heading: "PREFERENCES",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: "settings" },
    ],
  },
];

const icons: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  building: "M3 21h18 M5 21V5l7-3 7 3v16 M9 9h.01 M15 9h.01 M9 13h.01 M15 13h.01",
  layers: "m12 2 9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 17l9 5 9-5",
  users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  folder: "M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3z",
  check: "m5 12 4 4L19 6",
  message: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.09-.02a1.7 1.7 0 0 0-1.75.43l-.06.06h-3.4l-.06-.08a1.7 1.7 0 0 0-1.75-.43l-.09.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.6 15l-.08-.07v-3.4l.08-.06a1.7 1.7 0 0 0 .43-1.75l-.02-.09 2.94-1.7.06.06a1.7 1.7 0 0 0 1.88.34l.07-.08h3.4l.06.08a1.7 1.7 0 0 0 1.75.43l.09-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 21 13.6l-.08.07z",
};

function Icon({
  name,
  size = 19,
}: {
  name: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name] || icons.grid} />
    </svg>
  );
}

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [mode, setModeState] = useState<ThemeMode>("light");
  const [accent, setAccentState] = useState<Accent>("emerald");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem("talvorah_theme");
    const savedAccent = localStorage.getItem("talvorah_accent");

    if (savedMode === "light" || savedMode === "dark" || savedMode === "system") {
      setModeState(savedMode);
    }

    const validAccents: Accent[] = [
      "emerald", "blue", "violet", "rose", "amber", "teal",
    ];

    if (validAccents.includes(savedAccent as Accent)) {
      setAccentState(savedAccent as Accent);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      setResolvedTheme(
        mode === "system"
          ? media.matches ? "dark" : "light"
          : mode
      );
    };

    updateTheme();

    if (mode === "system") {
      media.addEventListener("change", updateTheme);
      return () => media.removeEventListener("change", updateTheme);
    }
  }, [mode, loaded]);

  function setMode(value: ThemeMode) {
    setModeState(value);
    localStorage.setItem("talvorah_theme", value);
  }

  function setAccent(value: Accent) {
    setAccentState(value);
    localStorage.setItem("talvorah_accent", value);
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const themeValue = { mode, accent, setMode, setAccent };

  return (
    <ThemeContext.Provider value={themeValue}>
      <div
        className="workspace-root"
        data-theme={resolvedTheme}
        data-accent={accent}
        suppressHydrationWarning
      >
        <div className="flex min-h-screen">

          {mobileOpen && (
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <aside
            className={`workspace-sidebar fixed inset-y-0 left-0 z-50 flex w-[265px] flex-col transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-6 py-6">
              <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
                Talvorah<span className="text-[var(--ws-accent)]">.</span>
              </Link>

              <button
                type="button"
                className="md:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="px-4">
              <p className="mb-3 px-2 text-[10px] font-semibold tracking-[2px] text-slate-400">
                YOUR WORKSPACE
              </p>
              <OrganisationSwitcher />
            </div>

            <nav className="mt-7 flex-1 space-y-7 overflow-y-auto px-4 pb-5">
              {navigation.map((group) => (
                <div key={group.heading}>
                  <p className="mb-3 px-3 text-[10px] font-semibold tracking-[2px] text-slate-500">
                    {group.heading}
                  </p>

                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${
                          isActive(item.href)
                            ? "workspace-active-nav"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon name={item.icon} size={18} />
                        {item.label}
                        {isActive(item.href) && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">
                  OA
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    Organisation Admin
                  </p>
                  <p className="text-xs text-slate-400">
                    Workspace administrator
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="workspace-topbar sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b px-5 md:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-lg p-2 hover:bg-black/5 md:hidden"
                  aria-label="Open navigation"
                >
                  <Icon name="grid" size={21} />
                </button>

                <div className="hidden text-sm text-[var(--ws-muted)] sm:block">
                  Workspace <span className="mx-2">/</span>
                  <span className="font-semibold text-[var(--ws-text)]">
                    {pathname === "/dashboard"
                      ? "Overview"
                      : pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ")}
                  </span>
                </div>

                <div className="relative hidden lg:block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ws-muted)]">
                    <Icon name="grid" size={16} />
                  </span>
                  <input
                    type="search"
                    placeholder="Search workspace..."
                    className="workspace-search w-[260px] rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <select
                  aria-label="Workspace appearance"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ThemeMode)}
                  className="workspace-control hidden sm:block"
                >
                  <option value="light">Light mode</option>
                  <option value="dark">Dark mode</option>
                  <option value="system">System</option>
                </select>

                <select
                  aria-label="Workspace accent colour"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value as Accent)}
                  className="workspace-control hidden sm:block"
                >
                  <option value="emerald">Emerald</option>
                  <option value="blue">Ocean blue</option>
                  <option value="violet">Violet</option>
                  <option value="rose">Rose</option>
                  <option value="amber">Amber</option>
                  <option value="teal">Teal</option>
                </select>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label="Notifications"
                  className="relative rounded-xl border p-2.5 transition hover:bg-black/5"
                  style={{ borderColor: "var(--ws-border)" }}
                >
                  <span className="text-lg">♧</span>
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--ws-accent)]" />
                </button>

                <div className="hidden items-center gap-2 border-l pl-4 sm:flex" style={{ borderColor: "var(--ws-border)" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ws-accent-soft)] text-sm font-bold text-[var(--ws-accent)]">
                    OA
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Admin</p>
                    <p className="text-[10px] text-[var(--ws-muted)]">
                      Workspace
                    </p>
                  </div>
                </div>
              </div>

              {notificationsOpen && (
                <div
                  className="absolute right-5 top-[65px] z-50 w-[280px] rounded-2xl border p-5 shadow-xl"
                  style={{
                    background: "var(--ws-surface)",
                    borderColor: "var(--ws-border)",
                  }}
                >
                  <p className="font-semibold">Notifications</p>
                  <p className="mt-2 text-sm text-[var(--ws-muted)]">
                    You're all caught up. New workspace notifications will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="mt-4 text-sm font-semibold text-[var(--ws-accent)]"
                  >
                    Close
                  </button>
                </div>
              )}
            </header>

            <main className="workspace-content min-h-[calc(100vh-76px)] p-5 md:p-8 xl:p-10">
              <div className="mx-auto w-full max-w-[1600px]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
