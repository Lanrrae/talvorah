
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PlatformAdminDashboard from "@/components/workspace/PlatformAdminDashboard";
import OrganisationDashboard from "@/components/workspace/OrganisationDashboard";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isPlatformSuperAdmin, setIsPlatformSuperAdmin] = useState(false);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        const { data, error } = await supabase.rpc(
          "is_platform_super_admin"
        );

        if (error) throw error;

        if (active) {
          setIsPlatformSuperAdmin(data === true);
        }
      } catch (error) {
        console.error("Dashboard access check failed:", error);

        if (active) {
          setAccessError(
            error instanceof Error
              ? error.message
              : "Unable to verify your dashboard permissions."
          );
        }
      } finally {
        if (active) setCheckingAccess(false);
      }
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (checkingAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-[var(--ws-muted)]">
            Verifying your workspace access...
          </p>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-bold text-red-800">
          Dashboard access could not be verified
        </h2>
        <p className="mt-2 text-sm text-red-700">{accessError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return isPlatformSuperAdmin ? (
    <PlatformAdminDashboard />
  ) : (
    <OrganisationDashboard />
  );
}
