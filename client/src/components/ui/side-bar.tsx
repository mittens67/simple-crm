import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/auth-context";
import Logo from "./logo";
import "./side-bar.scss";

const SideBar = () => {
  const { user, logout, current_role_index, switch_role } = useAuth();
  const navigate = useNavigate();

  const get_initials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handle_logout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <Logo size="medium" />
      </div>
      <div className="sidebar-profile">
        <div className="sidebar-profile-img">
          <Link to="/profile" className="sidebar-avatar">
            <span className="avatar-initials">{user && get_initials(user.name)}</span>
          </Link>
        </div>
        <div className="sidebar-profile-card">
          <p className="sidebar-profile-card-name">{user?.name}</p>
          <p className="sidebar-profile-card-email">{user?.email}</p>
        </div>
      </div>
      {user && user.roles.length > 1 && (
        <div className="sidebar-role-switcher">
          <label className="sidebar-role-label">Role</label>
          <select
            value={current_role_index}
            onChange={(e) => switch_role(parseInt(e.target.value, 10))}
            className="sidebar-role-select"
          >
            {user.roles.map((role, idx) => (
              <option key={role.id} value={idx}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      )}
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
        {(user?.roles.some((r) => r.name === 'Admin')) && (
          <>
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
              <p style={{ margin: '0 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255, 255, 255, 0.4)' }}>
                Admin
              </p>
              <NavLink to="/admin/roles" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
                <p>Roles</p>
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
                <p>Users</p>
              </NavLink>
            </div>
          </>
        )}
        <button type="button" className="sidebar-logout" onClick={handle_logout}>
          Log out
        </button>
      </nav>
    </div>
  );
};

export default SideBar;
