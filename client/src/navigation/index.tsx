import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "../pages/(login)";
import Dashboard from "../pages/(dashboard)";
import ProtectedRoute from "./protected-route";
import Home from "../pages/(dashboard)/(home)";
import Profile from "../pages/(dashboard)/(profile)";
import Leads from "../pages/(dashboard)/(sales)/(leads)";
import Customers from "../pages/(dashboard)/(sales)/(customers)";
import Deals from "../pages/(dashboard)/(sales)/(deals)";
import Support from "../pages/(dashboard)/(support)";

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
          <Route path="leads" element={<Leads />} />
          <Route path="customers" element={<Customers />} />
          <Route path="deals" element={<Deals />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default Navigation;
