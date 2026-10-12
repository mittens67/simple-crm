import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './protected-route';
import PermissionProtectedRoute from './permission-protected-route';
import LoadingSpinner from '../components/ui/loading-spinner';
import { ROUTES } from './routes';

// Login and the dashboard shell are needed on first paint. Everything else is
// code-split, so opening the app no longer downloads every screen up front.
import Login from '../pages/(login)';
import Dashboard from '../pages/(dashboard)';

const Home = lazy(() => import('../pages/(dashboard)/(home)'));
const Profile = lazy(() => import('../pages/(dashboard)/(profile)'));
const Leads = lazy(() => import('../pages/(dashboard)/(sales)/(leads)'));
const LeadDetail = lazy(() => import('../pages/(dashboard)/(sales)/(leads)/lead-detail'));
const Customers = lazy(() => import('../pages/(dashboard)/(sales)/(customers)'));
const CustomerDetail = lazy(
  () => import('../pages/(dashboard)/(sales)/(customers)/customer-detail')
);
const Deals = lazy(() => import('../pages/(dashboard)/(sales)/(deals)'));
const DealDetail = lazy(() => import('../pages/(dashboard)/(sales)/(deals)/deal-detail'));
const Pipeline = lazy(() => import('../pages/(dashboard)/(sales)/(pipeline)'));
const Tasks = lazy(() => import('../pages/(dashboard)/(tasks)'));
const Support = lazy(() => import('../pages/(dashboard)/(support)'));
const Roles = lazy(() => import('../pages/(dashboard)/(admin)/roles'));
const Users = lazy(() => import('../pages/(dashboard)/(admin)/users'));
const NotFound = lazy(() => import('../pages/(not-found)'));

const Navigation = () => (
  <Router>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path={ROUTES.login} element={<Login />} />

        <Route
          path={ROUTES.home}
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />

          <Route
            path="leads"
            element={
              <PermissionProtectedRoute permission="leads.read">
                <Leads />
              </PermissionProtectedRoute>
            }
          />
          <Route
            path="leads/:id"
            element={
              <PermissionProtectedRoute permission="leads.read">
                <LeadDetail />
              </PermissionProtectedRoute>
            }
          />

          <Route
            path="customers"
            element={
              <PermissionProtectedRoute permission="customers.read">
                <Customers />
              </PermissionProtectedRoute>
            }
          />
          <Route
            path="customers/:id"
            element={
              <PermissionProtectedRoute permission="customers.read">
                <CustomerDetail />
              </PermissionProtectedRoute>
            }
          />

          <Route
            path="deals"
            element={
              <PermissionProtectedRoute permission="deals.read">
                <Deals />
              </PermissionProtectedRoute>
            }
          />
          <Route
            path="deals/:id"
            element={
              <PermissionProtectedRoute permission="deals.read">
                <DealDetail />
              </PermissionProtectedRoute>
            }
          />
          <Route
            path="pipeline"
            element={
              <PermissionProtectedRoute permission="deals.read">
                <Pipeline />
              </PermissionProtectedRoute>
            }
          />

          <Route path="tasks" element={<Tasks />} />

          <Route
            path="support"
            element={
              <PermissionProtectedRoute permission="support_tickets.read">
                <Support />
              </PermissionProtectedRoute>
            }
          />

          <Route path="profile" element={<Profile />} />

          <Route
            path="admin/roles"
            element={
              <PermissionProtectedRoute permission="roles.update">
                <Roles />
              </PermissionProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <PermissionProtectedRoute permission="users.update">
                <Users />
              </PermissionProtectedRoute>
            }
          />

          {/* Catch-all inside the shell, so an unknown URL still shows the
              navigation rather than a bare error page. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  </Router>
);

export default Navigation;
