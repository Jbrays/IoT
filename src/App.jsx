import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';


import ClientApp from './pages/ClientApp';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ClientApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
