import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductManagement.css';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch seller products on load
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products/seller/1');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Handle Text/Number Form Inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle File Input Selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle Form Submission (Add Product)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalImageUrl = formData.image_url;

      // Upload local image file if selected
      if (selectedFile) {
        const fileData = new FormData();
        fileData.append('image', selectedFile);
        
        try {
          const uploadRes = await axios.post('http://localhost:5000/api/upload', fileData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalImageUrl = uploadRes.data.filePath || uploadRes.data.url;
        } catch (uploadErr) {
          console.error('Image upload failed, continuing with fallback:', uploadErr);
        }
      }

      const newProductPayload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        image_url: finalImageUrl || '',
        seller_id: 1, // backend requirement baseline
        category_id: 1, // backend requirement baseline
        status: 'active' // Table default status
      };

      await axios.post('http://localhost:5000/api/products', newProductPayload);

      // Reset Form State
      setFormData({
        name: '',
        description: '',
        price: '',
        stock_quantity: '',
        image_url: '',
      });
      setSelectedFile(null);
      fetchProducts();
      alert('Product added successfully!');
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Failed to add product. Check browser console for backend error response.');
    }
  };

  // Handle Radio Button Status Change in Table
  const handleStatusRadioChange = async (productId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/products/${productId}/status`, { status: newStatus });
      
      // Update local state immediately
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: newStatus === 'active' ? 1 : 0 } : p))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🍃 Product Management</h2>

      {/* Product Creation Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
        <h3>Add New Product</h3>
        
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={formData.name}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: '10px', width: '100%', padding: '8px' }}
        />
        
        <input
          type="number"
          name="price"
          step="0.01"
          placeholder="Price ($)"
          value={formData.price}
          onChange={handleChange}
          required
          style={{ display: 'block', marginBottom: '10px', width: '100%', padding: '8px' }}
        />

        <input
          type="number"
          name="stock_quantity"
          placeholder="Stock Quantity"
          value={formData.stock_quantity}
          onChange={handleChange}
          style={{ display: 'block', marginBottom: '10px', width: '100%', padding: '8px' }}
        />

        {/* Image Input: URL String OR File Upload */}
        <div className="image-input-container" style={{ marginBottom: '10px', background: '#fff', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Product Image:</label>
          <input
            type="text"
            name="image_url"
            placeholder="Paste Image URL..."
            value={formData.image_url}
            onChange={handleChange}
            style={{ display: 'block', marginBottom: '8px', width: '100%', padding: '8px' }}
          />
          <span style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>— OR Upload File —</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          style={{ display: 'block', marginBottom: '15px', width: '100%', padding: '8px', height: '60px' }}
        />

        <button
          type="submit"
          style={{ padding: '8px 16px', backgroundColor: '#2d5a3f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Add Product
        </button>
      </form>

      {/* Products Table with Radio Buttons for Status Toggle */}
      <h3>Your Products</h3>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#e0f2fe' }}>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Status (Active / Inactive)</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const currentStatus = product.is_active ? 'active' : 'inactive';
            return (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>${product.price}</td>
                <td>
                  {/* Radio Buttons for Inline Status Update */}
                  <div className="table-status-group">
                    <label className={`table-status-label ${currentStatus === 'active' ? 'active' : ''}`} style={{ marginRight: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`status-${product.id}`}
                        value="active"
                        checked={currentStatus === 'active'}
                        onChange={() => handleStatusRadioChange(product.id, 'active')}
                      />
                      Active
                    </label>
                    <label className={`table-status-label ${currentStatus === 'inactive' ? 'inactive' : ''}`} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`status-${product.id}`}
                        value="inactive"
                        checked={currentStatus === 'inactive'}
                        onChange={() => handleStatusRadioChange(product.id, 'inactive')}
                      />
                      Inactive
                    </label>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProductManagement;