import { useAuth } from '../../../auth/auth-context';
import { useTheme } from '../../../theme/use-theme';
import { useDialog } from '../../../components/dialogs/DialogProvider';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import './profile.scss';

const Profile = () => {
  const { user, current_role_index, switch_role, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showConfirm } = useDialog();

  if (!user) {
    return <LoadingSpinner />;
  }

  const current_role = user.roles[current_role_index];
  const permissions = current_role?.permissions || {};
  const permission_list = Object.entries(permissions)
    .filter(([, granted]) => granted === true)
    .map(([permission]) => permission)
    .sort();

  const handle_logout = async () => {
    const confirmed = await showConfirm({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      await logout();
    }
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Profile</h1>
        <p className="profile-subtitle">Manage your account and preferences</p>
      </div>

      <div className="profile-content">
        {/* User Info Section */}
        <div className="profile-section">
          <h2>Account Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <p>{user.name}</p>
            </div>
            <div className="info-item">
              <label>Email</label>
              <p>{user.email}</p>
            </div>
            <div className="info-item">
              <label>User ID</label>
              <p className="user-id">{user.id}</p>
            </div>
          </div>
        </div>

        {/* Roles Section */}
        <div className="profile-section">
          <h2>Roles & Permissions</h2>

          <div className="roles-container">
            <div className="roles-list">
              <label>Your Roles</label>
              {user.roles.length === 0 ? (
                <p className="no-roles">No roles assigned</p>
              ) : (
                <div className="role-buttons">
                  {user.roles.map((role, index) => (
                    <button
                      key={role.id}
                      className={`role-button ${index === current_role_index ? 'active' : ''}`}
                      onClick={() => switch_role(index)}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {current_role && (
              <div className="permissions-section">
                <label>Permissions for <strong>{current_role.name}</strong></label>
                {permission_list.length === 0 ? (
                  <p className="no-permissions">No permissions granted</p>
                ) : (
                  <div className="permissions-grid">
                    {permission_list.map((permission) => (
                      <div key={permission} className="permission-badge">
                        {permission}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="profile-section">
          <h2>Account Actions</h2>
          <div className="actions-list">
            <button className="btn-theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
            <button className="btn-logout" onClick={handle_logout}>
              🚪 Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
