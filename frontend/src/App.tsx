import { Navigate, Route, Routes } from 'react-router-dom';

import Team from './pages/Team';
import Insights from './pages/Insights';
import Players from './pages/Players';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/team" replace />} />
      <Route path="/team" element={<Team />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/players" element={<Players />} />
      {/* Old /login, /register and /profile links land on the Best XI */}
      <Route path="*" element={<Navigate to="/team" replace />} />
    </Routes>
  );
}
