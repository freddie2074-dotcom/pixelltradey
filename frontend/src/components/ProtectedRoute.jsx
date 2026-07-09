import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ session, children }) {
  if (session === undefined) return null; // still loading
  if (!session) return <Navigate to="/" replace />;
  return children;
}
