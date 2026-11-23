
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Organisation = {
  id: string;
  name: string;
  role: string;
};

export default function OrganisationSwitcher() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrganisations() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Please sign in.");

        const { data: platformAdmin, error: roleError } =
          await supabase.rpc("is_platform_super_admin");

        if (roleError) throw roleError;

        let available: Organisation[] = [];

        if (platformAdmin === true) {
          const { data, error: organisationError } = await supabase
            .from("organisations")
            .select("id, name")
            .order("name");

          if (organisationError) throw organisationError;

          available = (data || []).map((org) => ({
            id: org.id,
            name: org.name,
            role: "platform_super_admin",
          }));
        } else {
          const { data, error: membershipError } = await supabase
            .from("organisation_members")
            .select(`
              organisation_id,
              role,
              organisations (
                id,
                name
              )
            `)
            .eq("user_id", user.id)
            .eq("status", "active");

          if (membershipError) throw membershipError;

          available = (data || [])
            .filter((item) => item.organisations)
            .map((item) => {
              const org = item.organisations as unknown as {
                id: string;
                name: string;
              };

              return {
                id: org.id,
                name: org.name,
                role: item.role,
              };
            });
        }

        if (!active) return;

        setOrganisations(available);

        const savedId = localStorage.getItem(
          "talvorah_organisation_id"
        );

        const validSaved = available.find(
          (org) => org.id === savedId
        );

        const initialId = validSaved?.id || available[0]?.id || "";

        setSelectedId(initialId);

        if (initialId) {
          localStorage.setItem(
            "talvorah_organisation_id",
            initialId
          );
        }
      } catch (err) {
        console.error("Organisation loading error:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your organisations."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const handleOrganisationChanged = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setSelectedId(customEvent.detail);
    };

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChanged
    );

    loadOrganisations();

    return () => {
      active = false;

      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChanged
      );
    };
  }, [supabase]);

  function handleChange(id: string) {
    setSelectedId(id);

    localStorage.setItem("talvorah_organisation_id", id);

    window.dispatchEvent(
      new CustomEvent("talvorah:organisation-changed", {
        detail: id,
      })
    );

    router.refresh();
  }

  const selected = organisations.find(
    (org) => org.id === selectedId
  );

  if (loading || error || organisations.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
        {loading
          ? "Loading organisations..."
          : error || "No organisations available"}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label
        htmlFor="organisation-switcher"
        className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
      >
        Current organisation
      </label>

      <select
        id="organisation-switcher"
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#1b2a42] px-3 py-3 text-sm text-white outline-none transition focus:border-[var(--ws-accent)]"
      >
        {organisations.map((organisation) => (
          <option key={organisation.id} value={organisation.id}>
            {organisation.name}
          </option>
        ))}
      </select>

      <p className="mt-2 text-[11px] capitalize text-slate-400">
        Access: {selected?.role.replaceAll("_", " ") || "Member"}
      </p>
    </div>
  );
}
