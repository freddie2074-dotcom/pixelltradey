import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Spot from "./pages/Spot";
import Bots from "./pages/Bots";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Sidebar from "./components/Sidebar";
import ChatWidget from "./components/ChatWidget";
function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">{children}</div>
      <ChatWidget />
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute session={session}>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/markets"
        element={
          <ProtectedRoute session={session}>
            <AppLayout>
              <Markets />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/spot"
        element={
          <ProtectedRoute session={session}>
            <AppLayout>
              <Spot />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bots"
        element={
          <ProtectedRoute session={session}>
            <AppLayout>
              <Bots />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute session={session}>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute session={session}>
            <Admin />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
