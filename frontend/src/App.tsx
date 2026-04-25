import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import About from './pages/About';
import Features from './pages/Features';
import BookDemo from './pages/BookDemo';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import Schedule from './pages/Schedule';
import Payments from './pages/Payments';
import MockTests from './pages/MockTests';
import Users from './pages/Users';
import Attendance from './pages/Attendance';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { user } = useAuthStore();

  const getDashboardElement = () => {
    switch (user?.role) {
      case 'ADMIN':   return <AdminDashboard />;
      case 'STUDENT': return <StudentDashboard />;
      case 'TRAINER': return <TrainerDashboard />;
      default:        return <Navigate to="/login" />;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/book-demo" element={<BookDemo />} />
          {/* Auth Route moved inside PublicLayout to show Navbar/Footer */}
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={getDashboardElement()} />
          <Route path="/users"     element={<Users />} />
          <Route path="/schedule"  element={<Schedule />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payments"  element={<Payments />} />
          <Route path="/mock-tests" element={<MockTests />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} />} />
      </Routes>
    </BrowserRouter>
  );
}
