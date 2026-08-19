import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import all your components
import Home from './components/Home';
import Login from './components/Login';
import RegisterBuyer from './components/RegisterBuyer';
import RegisterSeller from './components/RegisterSeller';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-buyer" element={<RegisterBuyer />} />
        <Route path="/register-seller" element={<RegisterSeller />} />
      </Routes>
    </Router>
  );
}

export default App;