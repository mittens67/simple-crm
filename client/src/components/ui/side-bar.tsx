import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import "./side-bar.scss";

const SideBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const profile_img =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQF3LlStxpRcxoEoLrSNbDylvHbFQpNo7iuqg&s";

  const handle_logout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-profile">
        <div className="sidebar-profile-img">
          <Link to="/profile">
            <img
              src={profile_img}
              alt="profile image"
              width={72}
              height={72}
            />
          </Link>
        </div>
        <div className="sidebar-profile-card">
          <p className="sidebar-profile-card-name">{user?.name}</p>
          <p className="sidebar-profile-card-email">{user?.email}</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Home</p>
        </NavLink>
        <NavLink to="/leads" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Leads</p>
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Customers</p>
        </NavLink>
        <NavLink to="/deals" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Deals</p>
        </NavLink>
        <NavLink to="/support" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Support</p>
        </NavLink>
        <button type="button" className="sidebar-logout" onClick={handle_logout}>
          Log out
        </button>
      </nav>
    </div>
  );
};

export default SideBar;
