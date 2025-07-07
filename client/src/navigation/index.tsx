import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "../pages/(login)";
import Dashboard from "../pages/(dashboard)";
import ProtectedRoute from "./ProtectedRoute";
import Sales from "../pages/(dashboard)/(sales)";
import Home from "../pages/(dashboard)/(home)";
import Profile from "../pages/(dashboard)/(profile)";

const Navigation = () => {
  return (
    <Router>
      {/* <nav className="p-4 bg-gray-800 text-white flex gap-4">
        <Link to="/">Dashboard</Link>
        <Link to="/login">Login</Link>
      </nav> */}

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
          {/* Nested routes here */}
          <Route index element={<Home />} />
          <Route path="sales" element={<Sales />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default Navigation;
