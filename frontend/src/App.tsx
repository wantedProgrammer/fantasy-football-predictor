import { Navigate, Route, Routes } from 'react-router-dom';

import Register from './pages/Register';
import Login from './pages/Login';
import Team from './pages/Team';
import Insights from './pages/Insights';
import Players from './pages/Players';
import Profile from './pages/Profile';

function Home() {
  return <Navigate to={sessionStorage.getItem('token') ? '/team' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/team" element={<Team />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/players" element={<Players />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
