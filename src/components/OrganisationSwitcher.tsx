
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Organisation = {
  id: string;
  name: string;
  role: string;
};

export default function OrganisationSwitcher() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadOrganisations() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("Please sign in.");
          return;
        }

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

        const available = (data || [])
          .filter((item) => item.organisations)
          .map((item) => {
            const organisation = item.organisations as unknown as {
              id: string;
              name: string;
            };

            return {
              id: organisation.id,
              name: organisation.name,
              role: item.role,
            };
          });

        setOrganisations(available);

        const savedId = localStorage.getItem("talvorah_organisation_id");
        const validSaved = available.find((org) => org.id === savedId);

        const initial = validSaved?.id || available[0]?.id || "";

        setSelectedId(initial);

        if (initial) {
          localStorage.setItem("talvorah_organisation_id", initial);
        }
      } catch (err) {
        console.error("Organisation loading error:", err);
        setError("Unable to load your organisations.");
      } finally {
        setLoading(false);
      }
    }

    loadOrganisations();
  }, []);

  function handleChange(id: string) {
    setSelectedId(id);
    localStorage.setItem("talvorah_organisation_id", id);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#151521] px-4 py-3 text-sm text-gray-400">
        Loading organisations...
      </div>
    );
  }

  if (error || organisations.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#151521] px-4 py-3 text-sm text-gray-400">
        {error || "No organisations available"}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        Current organisation
      </label>

      <select
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#151521] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
      >
        {organisations.map((organisation) => (
          <option key={organisation.id} value={organisation.id}>
            {organisation.name}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs capitalize text-gray-500">
        Access: {organisations.find((org) => org.id === selectedId)?.role.replaceAll("_", " ")}
      </p>
    </div>
  );
}
