import { Outlet } from 'react-router-dom';
import SideBar from '../../components/ui/side-bar';
import CommandPalette from '../../components/ai/command-palette';
import './index.scss';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <SideBar />
      <div className="dashboard-window">
        {/* This renders the nested routes */}
        <Outlet />
      </div>
      {/* Mounted once for the whole shell; opens on Cmd/Ctrl+K from any page. */}
      <CommandPalette />
    </div>
  );
};

export default Dashboard;
