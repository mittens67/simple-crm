import { Link, NavLink } from "react-router-dom";
import "./SideBar.scss";

const SideBar = () => {
  const profile_img =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQF3LlStxpRcxoEoLrSNbDylvHbFQpNo7iuqg&s";
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
          <p className="sidebar-profile-card-name">Samantha</p>
          <p className="sidebar-profile-card-email">samantha@test.com</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Home</p>
        </NavLink>
        <NavLink to="/sales" className={({ isActive }) => isActive ? "sidebar-nav-link active" : "sidebar-nav-link"}>
          <p>Sales</p>
        </NavLink>
      </nav>
    </div>
  );
};

export default SideBar;
