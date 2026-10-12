import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  CheckSquare,
  Handshake,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useDialog } from '../dialogs/DialogProvider';
import { MAIN_NAV, ADMIN_NAV, ROUTES, type NavItem } from '../../navigation/routes';
import { Avatar, Button } from './index';
import Logo from './logo';
import './side-bar.scss';

const ICONS: Record<string, ReactNode> = {
  [ROUTES.home]: <LayoutDashboard />,
  [ROUTES.leads]: <UserRound />,
  [ROUTES.pipeline]: <KanbanSquare />,
  [ROUTES.deals]: <Handshake />,
  [ROUTES.customers]: <Building2 />,
  [ROUTES.tasks]: <CheckSquare />,
  [ROUTES.support]: <LifeBuoy />,
  [ROUTES.admin_roles]: <ShieldCheck />,
  [ROUTES.admin_users]: <UsersIcon />,
};

const SideBar = () => {
  const { user, logout, current_role_index, switch_role, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm } = useDialog();
  const [open, set_open] = useState(false);

  // Navigating on a phone should dismiss the drawer.
  useEffect(() => set_open(false), [location.pathname]);

  const handle_logout = async () => {
    const confirmed = await showConfirm({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      await logout();
      navigate(ROUTES.login, { replace: true });
    }
  };

  const visible = (items: NavItem[]) =>
    items.filter((item) => !item.permission || can(item.permission));

  const render_link = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      // `end` on the index route only, so /leads/:id still highlights Leads.
      end={item.to === ROUTES.home}
      className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
    >
      <span className="sidebar-link-icon" aria-hidden="true">
        {ICONS[item.to]}
      </span>
      {item.label}
    </NavLink>
  );

  const admin_links = visible(ADMIN_NAV);

  return (
    <>
      {/* Only rendered on small screens; the sidebar was previously a fixed
          240px with no collapse and no mobile handling at all. */}
      <div className="sidebar-bar">
        <Button
          variant="ghost"
          icon_only
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => set_open((current) => !current)}
        >
          {open ? <X /> : <Menu />}
        </Button>
        <Logo size="small" />
      </div>

      {open && <div className="sidebar-scrim" onClick={() => set_open(false)} role="presentation" />}

      <nav className={`sidebar${open ? ' sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-logo">
          <Logo size="medium" />
        </div>

        <Link to={ROUTES.profile} className="sidebar-profile">
          <Avatar name={user?.name ?? '?'} />
          <span className="sidebar-profile-text">
            <span className="sidebar-profile-name">{user?.name}</span>
            <span className="sidebar-profile-email">{user?.email}</span>
          </span>
        </Link>

        {user && user.roles.length > 1 && (
          <div className="sidebar-role">
            <label htmlFor="sidebar-role-select">Viewing as</label>
            <select
              id="sidebar-role-select"
              value={current_role_index}
              onChange={(event) => switch_role(parseInt(event.target.value, 10))}
            >
              {user.roles.map((role, index) => (
                <option key={role.id} value={index}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sidebar-links">{visible(MAIN_NAV).map(render_link)}</div>

        {admin_links.length > 0 && (
          <div className="sidebar-links">
            <p className="sidebar-section">Admin</p>
            {admin_links.map(render_link)}
          </div>
        )}

        <div className="sidebar-footer">
          <p className="sidebar-hint">
            <Search aria-hidden="true" />
            Search with <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </p>
          <button type="button" className="sidebar-link sidebar-logout" onClick={handle_logout}>
            <span className="sidebar-link-icon" aria-hidden="true">
              <LogOut />
            </span>
            Log out
          </button>
        </div>
      </nav>
    </>
  );
};

export default SideBar;
