import { Outlet } from "react-router-dom"
import SideBar from "../../components/ui/side-bar"
import './index.scss'

const Dashboard = () => {
  return (
    <div className="dashboard">
      <SideBar />
      <div className="dashboard-window">
        {/* This renders the nested routes */}
        <Outlet /> 
      </div>
    </div>
  )
}

export default Dashboard