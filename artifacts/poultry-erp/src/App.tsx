import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/admin/Dashboard";
import Customers from "@/pages/admin/Customers";
import Products from "@/pages/admin/Products";
import Orders from "@/pages/admin/Orders";
import Agents from "@/pages/admin/Agents";
import MyOrders from "@/pages/agent/MyOrders";
import OrderDetail from "@/pages/agent/OrderDetail";

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/" />;
  if (user.role !== "admin") return <Redirect to="/agent/orders" />;
  return <AppLayout><Component /></AppLayout>;
}

function AgentRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/" />;
  if (user.role !== "agent") return <Redirect to="/dashboard" />;
  return <AppLayout><Component /></AppLayout>;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (user) return <Redirect to={user.role === "admin" ? "/dashboard" : "/agent/orders"} />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicRoute component={Login} />
      </Route>

      {/* Admin Routes */}
      <Route path="/dashboard">
        <AdminRoute component={Dashboard} />
      </Route>
      <Route path="/customers">
        <AdminRoute component={Customers} />
      </Route>
      <Route path="/products">
        <AdminRoute component={Products} />
      </Route>
      <Route path="/orders">
        <AdminRoute component={Orders} />
      </Route>
      <Route path="/agents">
        <AdminRoute component={Agents} />
      </Route>

      {/* Agent Routes */}
      <Route path="/agent/orders">
        <AgentRoute component={MyOrders} />
      </Route>
      <Route path="/agent/orders/:id">
        <AgentRoute component={OrderDetail} />
      </Route>

      <Route>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <p className="text-xl text-muted-foreground">الصفحة غير موجودة</p>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
