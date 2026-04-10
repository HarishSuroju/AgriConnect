import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { lazy, Suspense, type ReactNode } from "react";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const FarmerDashboard = lazy(() => import("./pages/FarmerDashboard"));
const FarmerListResidue = lazy(() => import("./pages/FarmerListResidue"));
const FarmerRequests = lazy(() => import("./pages/FarmerRequests"));
const IndustryDashboard = lazy(() => import("./pages/IndustryDashboard"));
const IndustryBrowse = lazy(() => import("./pages/IndustryBrowse"));
const IndustryRequests = lazy(() => import("./pages/IndustryRequests"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminTransactions = lazy(() => import("./pages/AdminTransactions"));
const AdminFraudReports = lazy(() => import("./pages/AdminFraudReports"));
const AdminComplaints = lazy(() => import("./pages/AdminComplaints"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: ReactNode; allowedRole?: string }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.role !== allowedRole) return <Navigate to={`/${user?.role || ''}`} replace />;
  return <>{children}</>;
}

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerDashboard /></ProtectedRoute>} />
        <Route path="/farmer/list" element={<ProtectedRoute allowedRole="farmer"><FarmerListResidue /></ProtectedRoute>} />
        <Route path="/farmer/requests" element={<ProtectedRoute allowedRole="farmer"><FarmerRequests /></ProtectedRoute>} />
        <Route path="/farmer/settings" element={<ProtectedRoute allowedRole="farmer"><ProfileSettings /></ProtectedRoute>} />
        <Route path="/industry" element={<ProtectedRoute allowedRole="industry"><IndustryDashboard /></ProtectedRoute>} />
        <Route path="/industry/browse" element={<ProtectedRoute allowedRole="industry"><IndustryBrowse /></ProtectedRoute>} />
        <Route path="/industry/requests" element={<ProtectedRoute allowedRole="industry"><IndustryRequests /></ProtectedRoute>} />
        <Route path="/industry/settings" element={<ProtectedRoute allowedRole="industry"><ProfileSettings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRole="admin"><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/transactions" element={<ProtectedRoute allowedRole="admin"><AdminTransactions /></ProtectedRoute>} />
        <Route path="/admin/fraud-reports" element={<ProtectedRoute allowedRole="admin"><AdminFraudReports /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute allowedRole="admin"><AdminComplaints /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRole="admin"><ProfileSettings /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DemoProvider>
          <AppRoutes />
        </DemoProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
