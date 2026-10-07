import React, { useState, useEffect, useCallback } from 'react';
import './ProductManagement.css';

const ProductManagement = ({ sellerId = 1 }) => {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', image_url: '' });

  // Fetch seller's products wrapped in useCallback
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/seller/${sellerId}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Add or Edit Product
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId 
      ? `http://localhost:5000/api/products/${editingId}`
      : `http://localhost:5000/api/products`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, seller_id: sellerId })
      });
      setForm({ name: '', description: '', price: '', stock: '', image_url: '' });
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save product', err);
    }
  };

  // Fill form for editing
  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || ''
    });
  };

  // Delete Product
  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      await fetch(`http://localhost:5000/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    }
  };

  // Toggle Active / Inactive status
  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch(`http://localhost:5000/api/products/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    fetchProducts();
  };

  return (
    <div className="product-management-container">
      <h2 className="pm-header">Product Management</h2>

      <form onSubmit={handleSubmit} className="pm-form-card">
        <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
        <div className="pm-form-grid">
          <input name="name" placeholder="Product Name" value={form.name} onChange={handleChange} required />
          <input name="price" type="number" placeholder="Price (NPR)" value={form.price} onChange={handleChange} required />
          <input name="stock" type="number" placeholder="Stock Quantity" value={form.stock} onChange={handleChange} required />
          <input name="image_url" placeholder="Image URL" value={form.image_url} onChange={handleChange} />
          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} style={{ gridColumn: 'span 2' }} rows="2" />
        </div>
        <button type="submit" className="pm-btn-submit">
          {editingId ? 'Update Product' : 'Add Product'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', description: '', price: '', stock: '', image_url: '' }); }} className="pm-btn-cancel">
            Cancel
          </button>
        )}
      </form>

      <table className="pm-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>Rs. {p.price}</td>
              <td>{p.stock}</td>
              <td>
                <span className={p.status === 'active' ? 'status-active' : 'status-inactive'}>
                  {p.status ? p.status.toUpperCase() : 'ACTIVE'}
                </span>
              </td>
              <td>
                <button onClick={() => toggleStatus(p.id, p.status || 'active')} className="btn-toggle">
                  {p.status === 'active' ? 'Set Inactive' : 'Set Active'}
                </button>
                <button onClick={() => startEdit(p)} className="btn-edit">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="btn-delete">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductManagement;