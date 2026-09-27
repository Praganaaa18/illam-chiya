import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './components/Home';
import Login from './components/Login';
import RegisterBuyer from './components/RegisterBuyer';
import RegisterSeller from './components/RegisterSeller';
import SellerDashboard from './components/SellerDashboard';
import Cart from './components/Cart'; // Added Cart import
import ConfirmOrder from './components/ConfirmOrder'; // Added ConfirmOrder import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-buyer" element={<RegisterBuyer />} />
        <Route path="/register-seller" element={<RegisterSeller />} />
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        
        {/* Buyer Routes */}
        <Route path="/cart" element={<Cart />} />
        <Route path="/confirm-order" element={<ConfirmOrder />} />
      </Routes>
    </Router>
  );
}

export default App;