import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';

// Placeholders for your team members' auth pages
const LoginPlaceholder = () => <div style={{ padding: '4rem', textAlign: 'center' }}>Login Page (Teammate Task)</div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPlaceholder />} />
      </Routes>
    </Router>
  );
}

export default App;