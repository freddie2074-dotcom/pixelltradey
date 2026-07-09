import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminRoute({ session, children }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Still loading the session itself — wait, don't decide anything yet
    if (session === undefined) return;

    // Session resolved to "no session" — stop checking, not an admin
    if (session === null) {
      setChecking(false);
      return;
    }

    // We have a real session — check admin status
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("AdminRoute profile check failed:", error);
        }
        setIsAdmin(!!data?.is_admin);
        setChecking(false);
      });
  }, [session]);

  if (session === undefined || checking) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
