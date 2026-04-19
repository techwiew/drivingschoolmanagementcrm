import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Schedule from './pages/Schedule';
import Payments from './pages/Payments';
import MockTests from './pages/MockTests';
import Users from './pages/Users';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { user } = useAuthStore();

  const getDashboardElement = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <AdminDashboard />;
      case 'STUDENT':
        return <StudentDashboard />;
      case 'TRAINER':
        return <div className="p-8">Trainer Dashboard (Coming soon)</div>;
      default:
        return <Navigate to="/" />;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={getDashboardElement()} />
          <Route path="/users" element={<Users />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/mock-tests" element={<MockTests />} />
          {/* Add more routes here based on role */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
