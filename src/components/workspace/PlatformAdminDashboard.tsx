
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Organisation = {
  id: string;
  name: string;
};

export default function PlatformAdminDashboard() {
  const supabase = useMemo(() => createClient(), []);

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrganisations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("organisations")
        .select("id, name")
        .order("name", { ascending: true });

      if (queryError) throw queryError;

      setOrganisations(data || []);
    } catch (err) {
      console.error("Platform dashboard error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load platform information."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadOrganisations();
  }, [loadOrganisations]);

  const actions = [
    {
      title: "Organisation Management",
      description: "View and manage organisations on Talvorah.",
      href: "/dashboard/organisation",
      icon: "🏢",
    },
    {
      title: "Employee Management",
      description: "Manage employee records and organisation membership.",
      href: "/dashboard/employees",
      icon: "👥",
    },
    {
      title: "Department Management",
      description: "Review departments across organisations.",
      href: "/dashboard/departments",
      icon: "🏬",
    },
    {
      title: "Designation & Hierarchy",
      description: "Manage employee designations and HoD appointments.",
      href: "/dashboard/hierarchy",
      icon: "🏛️",
    },
    {
      title: "Reports",
      description: "Review organisation performance reports.",
      href: "/dashboard/reports",
      icon: "📊",
    },
    {
      title: "Talvorah AI",
      description: "Open the intelligent workspace assistant.",
      href: "/dashboard/ai",
      icon: "✨",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#172238] p-7 text-white shadow-lg md:p-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -right-5 -top-14 h-52 w-52 rounded-full border border-white/10" />

        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-300">
            TALVORAH PLATFORM CONTROL
          </p>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
            Super Admin Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Manage the Talvorah platform, oversee organisations and maintain
            the structure and administration of the workspace.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Platform Super Admin access
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <p className="text-sm font-semibold text-blue-800">
            Registered Organisations
          </p>

          <p className="mt-3 text-4xl font-extrabold text-slate-900">
            {loading ? "—" : organisations.length}
          </p>

          <p className="mt-2 text-xs text-blue-700">
            Organisations on the Talvorah platform
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <p className="text-sm font-semibold text-emerald-800">
            Platform Access
          </p>

          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            Super Admin
          </p>

          <p className="mt-2 text-xs text-emerald-700">
            Platform-level administration
          </p>
        </div>
      </section>

      <section className="rounded-2xl border p-6 shadow-sm"
        style={{
          background: "var(--ws-surface)",
          borderColor: "var(--ws-border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--ws-text)]">
              Organisations
            </h2>
            <p className="mt-1 text-xs text-[var(--ws-muted)]">
              Organisations currently registered on Talvorah.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrganisations()}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-xs font-semibold transition hover:bg-black/5 disabled:opacity-50"
            style={{ borderColor: "var(--ws-border)" }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="py-6 text-center text-sm text-[var(--ws-muted)]">
              Loading organisations...
            </p>
          ) : organisations.length ? (
            organisations.map((organisation) => (
              <div
                key={organisation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                style={{ borderColor: "var(--ws-border)" }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ws-accent-soft)] text-lg">
                    🏢
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ws-text)]">
                      {organisation.name}
                    </p>
                    <p className="text-[10px] text-[var(--ws-muted)]">
                      Registered organisation
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(
                      "talvorah_organisation_id",
                      organisation.id
                    );
                    window.dispatchEvent(
                      new Event("talvorah:organisation-changed")
                    );
                    window.location.href = "/dashboard";
                  }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ background: "var(--ws-accent)" }}
                >
                  Open workspace
                </button>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-[var(--ws-muted)]">
              No organisations were found.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--ws-text)]">
            Platform Administration
          </h2>
          <p className="mt-1 text-xs text-[var(--ws-muted)]">
            Access the platform management workspaces.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              style={{
                background: "var(--ws-surface)",
                borderColor: "var(--ws-border)",
              }}
            >
              <span className="text-2xl">{action.icon}</span>

              <h3 className="mt-4 text-sm font-bold text-[var(--ws-text)]">
                {action.title}
              </h3>

              <p className="mt-2 text-xs leading-5 text-[var(--ws-muted)]">
                {action.description}
              </p>

              <p className="mt-4 text-xs font-bold text-[var(--ws-accent)]">
                Open workspace →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
