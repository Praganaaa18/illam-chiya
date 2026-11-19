import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';

import Home from './components/Home';
import Login from './components/Login';
import RegisterBuyer from './components/RegisterBuyer';
import RegisterSeller from './components/RegisterSeller';
import SellerDashboard from './components/SellerDashboard';
import Cart from './components/Cart';
import ConfirmOrder from './components/ConfirmOrder';
import OrderTracking from './components/OrderTracking';
import ProductPage from './components/ProductPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:productId" element={<ProductPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-buyer" element={<RegisterBuyer />} />
        <Route path="/register-seller" element={<RegisterSeller />} />
        
        {/* Seller Dashboard Routes */}
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        <Route path="/seller-dashboard/inventory" element={<SellerDashboard initialTab="inventory" />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        
        {/* Buyer & Tracking Routes */}
        <Route path="/cart" element={<Cart />} />
        <Route path="/confirm-order" element={<ConfirmOrder />} />
        <Route path="/orders-shipping" element={<OrderTracking />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </Router>
  );
}

export default App;