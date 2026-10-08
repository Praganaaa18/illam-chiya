
import React, { useState, useEffect, useCallback } from 'react';
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
  const [editingProductId, setEditingProductId] = useState(null);

  // Fetch seller products on load
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch seller's products wrapped in useCallback
  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products/seller/1');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, [sellerId]);

  // Handle Text/Number Form Inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle File Input Selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle Form Submission (Add OR Update Product)
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

      const productPayload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
        image_url: finalImageUrl || '',
        seller_id: 1,
        category_id: 1,
        status: 'active'
      };

      if (editingProductId) {
        // UPDATE existing product
        await axios.put(`http://localhost:5000/api/products/${editingProductId}`, productPayload);
        alert('Product updated successfully!');
      } else {
        // ADD new product
        await axios.post('http://localhost:5000/api/products', productPayload);
        alert('Product added successfully!');
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product. Check browser console for details.');
    }
  };

  // Populate Form for Editing
  const handleEditClick = (product) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      stock_quantity: product.stock_quantity || '',
      image_url: product.image_url || '',
    });
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Product Delete
  const handleDeleteClick = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${productId}`);
        alert('Product deleted successfully!');
        fetchProducts();
      } catch (err) {
        console.error('Failed to delete product:', err);
        alert('Failed to delete product.');
      }
    }
  };

  // Reset Form State
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      image_url: '',
    });
    setSelectedFile(null);
    setEditingProductId(null);
  };

  // Handle Radio Button Status Change in Table
  const handleStatusRadioChange = async (productId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/products/${productId}/status`, { status: newStatus });

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: newStatus === 'active' ? 1 : 0 } : p))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="product-management-container">
      <h2>🍃 Product Management</h2>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="product-form">
        <h3>{editingProductId ? '✏️ Edit Product' : '➕ Add New Product'}</h3>

        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="price"
          step="0.01"
          placeholder="Price ($)"
          value={formData.price}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="stock_quantity"
          placeholder="Stock Quantity"
          value={formData.stock_quantity}
          onChange={handleChange}
        />

        <div className="image-input-container">
          <label>Product Image:</label>
          <input
            type="text"
            name="image_url"
            placeholder="Paste Image URL..."
            value={formData.image_url}
            onChange={handleChange}
          />
          <span>— OR Upload File —</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
        />

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            {editingProductId ? 'Update Product' : 'Add Product'}
          </button>
          {editingProductId && (
            <button type="button" className="cancel-btn" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Products Table */}
      <div className="products-table-container">
        <h3>Your Products</h3>
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Status (Active / Inactive)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const currentStatus = product.is_active ? 'active' : 'inactive';
              return (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>${Number(product.price).toFixed(2)}</td>
                  <td>
                    <div className="table-status-group">
                      <label className={`table-status-label ${currentStatus === 'active' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name={`status-${product.id}`}
                          value="active"
                          checked={currentStatus === 'active'}
                          onChange={() => handleStatusRadioChange(product.id, 'active')}
                        />
                        Active
                      </label>
                      <label className={`table-status-label ${currentStatus === 'inactive' ? 'inactive' : ''}`}>
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
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditClick(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteClick(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagement;