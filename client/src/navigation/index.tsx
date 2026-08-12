import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "../pages/(login)";
import Dashboard from "../pages/(dashboard)";
import ProtectedRoute from "./protected-route";
import PermissionProtectedRoute from "./permission-protected-route";
import Home from "../pages/(dashboard)/(home)";
import Profile from "../pages/(dashboard)/(profile)";
import Leads from "../pages/(dashboard)/(sales)/(leads)";
import Customers from "../pages/(dashboard)/(sales)/(customers)";
import Deals from "../pages/(dashboard)/(sales)/(deals)";
import Support from "../pages/(dashboard)/(support)";
import Roles from "../pages/(dashboard)/(admin)/roles";
import Users from "../pages/(dashboard)/(admin)/users";

const Navigation = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
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
            path="customers"
            element={
              <PermissionProtectedRoute permission="customers.read">
                <Customers />
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
              <PermissionProtectedRoute permission="roles.read">
                <Roles />
              </PermissionProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <PermissionProtectedRoute permission="users.read">
                <Users />
              </PermissionProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default Navigation;
