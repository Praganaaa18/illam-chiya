import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './ProductManagement.css';

const ProductManagement = ({ sellerId = Number(localStorage.getItem('userId')) || null }) => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: '',
  });
const API_ORIGIN = 'http://localhost:5000';
const PAGE_SIZE = 4;
const INITIAL_FORM = {
  name: '',
  description: '',
  price: '',
  stock_quantity: '',
  image_url: '',
  status: 'active',
};

const isProductActive = (product) =>
  product.is_active === true ||
  product.is_active === 1 ||
  product.is_active === '1' ||
  product.is_active === 'active';

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || error.message || fallback;

const ProductManagement = ({ sellerId = localStorage.getItem('userId') }) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const fetchProducts = useCallback(async () => {
    if (!sellerId) {
      setProducts([]);
      setLoadError('Seller information is not available. Please sign in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');
    try {
      const response = await axios.get(`${API_ORIGIN}/api/products/seller/${sellerId}`);
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid product list.');
      }
      setProducts(response.data);
      setSelectedRows((selected) => selected.filter((id) => response.data.some((product) => product.id === id)));
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadError(getErrorMessage(error, 'Could not load products. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const name = String(product.name || '').toLocaleLowerCase();
    const matchesSearch = name.includes(searchQuery.trim().toLocaleLowerCase());
    const active = isProductActive(product);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && active) ||
      (statusFilter === 'inactive' && !active);
    const stock = Math.max(0, Number(product.stock_quantity) || 0);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && stock > 10) ||
      (stockFilter === 'low_stock' && stock > 0 && stock <= 10) ||
      (stockFilter === 'out_of_stock' && stock === 0);
    return matchesSearch && matchesStatus && matchesStock;
  }), [products, searchQuery, statusFilter, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pageProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstProductNumber = filteredProducts.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastProductNumber = Math.min(currentPage * PAGE_SIZE, filteredProducts.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stockFilter]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const getFullImageUrl = (url) => {
    if (!url) return '';
    try {
      return new URL(url, `${API_ORIGIN}/`).toString();
    } catch {
      return '';
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const discardSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenAddModal = () => {
    setNotice(null);
    setEditingProductId(null);
    setFormData({ ...INITIAL_FORM });
    discardSelectedFile();
    setIsModalOpen(true);
  };

  const handleEditClick = (product) => {
    setNotice(null);
    setEditingProductId(product.id);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      stock_quantity: product.stock_quantity ?? '',
      image_url: product.image_url || '',
      status: isProductActive(product) ? 'active' : 'inactive',
    });
    discardSelectedFile();
    setIsModalOpen(true);
  };

  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM });
    discardSelectedFile();
    setEditingProductId(null);
  }, [discardSelectedFile]);

  const closeModal = useCallback(() => {
    if (isSaving) return;
    resetForm();
    setIsModalOpen(false);
  }, [isSaving, resetForm]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const price = Number(formData.price);
    const stock = Number(formData.stock_quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setNotice({ type: 'error', message: 'Enter a valid non-negative price and whole-number stock quantity.' });
      return;
    }

    setIsSaving(true);
    setNotice(null);
    try {
      let imageUrl = formData.image_url.trim();
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('image', selectedFile);
        const uploadResponse = await axios.post(`${API_ORIGIN}/api/upload`, uploadData);
        imageUrl = uploadResponse.data.filePath || uploadResponse.data.url || '';
        if (!imageUrl) throw new Error('The image upload completed without returning an image URL.');
      }

      const productPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price,
        stock_quantity: stock,
        image_url: imageUrl,
        seller_id: sellerId,
        category_id: 1,
        status: formData.status,
      };

      if (editingProductId) {
        await axios.put(`${API_ORIGIN}/api/products/${editingProductId}`, productPayload);
      } else {
        await axios.post(`${API_ORIGIN}/api/products`, productPayload);
      }

      setIsModalOpen(false);
      resetForm();
      setNotice({ type: 'success', message: `Product ${editingProductId ? 'updated' : 'added'} successfully.` });
      await fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setNotice({ type: 'error', message: getErrorMessage(error, 'Failed to save product. Please try again.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    setNotice(null);
    setBusyProductId(product.id);
    try {
      await axios.delete(`${API_ORIGIN}/api/products/${product.id}`);
      setSelectedRows((selected) => selected.filter((id) => id !== product.id));
      setNotice({ type: 'success', message: 'Product deleted successfully.' });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      setNotice({ type: 'error', message: getErrorMessage(error, 'Failed to delete product. Please try again.') });
    } finally {
      setBusyProductId(null);
    }
  };

  const handleStatusChange = async (product, newStatus) => {
    const previousStatus = isProductActive(product) ? 'active' : 'inactive';
    if (previousStatus === newStatus) return;
    setNotice(null);
    setBusyProductId(product.id);
    try {
      await axios.patch(`${API_ORIGIN}/api/products/${product.id}/status`, { status: newStatus });
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, is_active: newStatus === 'active' ? 1 : 0 } : item,
        ),
      );
    } catch (error) {
      console.error('Failed to update product status:', error);
      setNotice({ type: 'error', message: getErrorMessage(error, 'Failed to update product status.') });
    } finally {
      setBusyProductId(null);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((selected) =>
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    );
  };

  const allPageSelected = pageProducts.length > 0 && pageProducts.every((product) => selectedRows.includes(product.id));
  const handleSelectPage = () => {
    setSelectedRows((selected) => {
      if (allPageSelected) {
        return selected.filter((id) => !pageProducts.some((product) => product.id === id));
      }
      return [...new Set([...selected, ...pageProducts.map((product) => product.id)])];
    });
  };

  const renderStockBadge = (stockQuantity) => {
    const quantity = Math.max(0, Number(stockQuantity) || 0);
    if (quantity === 0) {
      return <span className="pm-stock-badge out-of-stock">OUT OF STOCK</span>;
    }
    if (quantity <= 10) {
      return <span className="pm-stock-badge low-stock">LOW: {quantity} LEFT</span>;
    }
    return <span className="pm-stock-badge in-stock">{quantity} IN STOCK</span>;
  };

  return (
    <div className="pm-container">
      <div className="pm-header-row">
        <h2 className="pm-title"><span aria-hidden="true">🍃</span> Product Management</h2>
        <button type="button" className="pm-add-btn" onClick={handleOpenAddModal}>
          <span aria-hidden="true">＋</span> Add New Product
        </button>
      </div>

      {notice && (
        <div className={`pm-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <section className="pm-card" aria-labelledby="pm-products-heading">
        <div className="pm-card-toolbar">
          <h3 id="pm-products-heading">Your Products</h3>
          <div className="pm-filters">
            <label className="pm-search-box">
              <span className="pm-visually-hidden">Search products</span>
              <input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <span className="pm-search-icon" aria-hidden="true">⌕</span>
            </label>
            <label>
              <span className="pm-visually-hidden">Filter by status</span>
              <select className="pm-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Status (All)</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              <span className="pm-visually-hidden">Filter by stock level</span>
              <select className="pm-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                <option value="all">Stock Level (All)</option>
                <option value="in_stock">In Stock (&gt;10)</option>
                <option value="low_stock">Low Stock (1-10)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="pm-table-responsive">
          <table className="pm-table">
            <thead>
              <tr>
                <th scope="col">
                  <label className="pm-select-all">
                    <input type="checkbox" className="pm-checkbox" checked={allPageSelected} onChange={handleSelectPage} />
                    <span>Select</span>
                  </label>
                </th>
                <th scope="col">Thumbnail</th>
                <th scope="col">Product Name</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="pm-empty" role="status">Loading products…</td></tr>
              ) : loadError ? (
                <tr>
                  <td colSpan="7" className="pm-empty">
                    <span>{loadError}</span>
                    <button type="button" className="pm-retry-btn" onClick={fetchProducts}>Try again</button>
                  </td>
                </tr>
              ) : pageProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="pm-empty">
                    {products.length === 0 ? 'No products yet. Add your first product to get started.' : 'No products match your search or filters.'}
                  </td>
                </tr>
              ) : pageProducts.map((product) => {
                const active = isProductActive(product);
                const imageUrl = getFullImageUrl(product.image_url);
                const quantity = Math.max(0, Number(product.stock_quantity) || 0);
                const isBusy = busyProductId === product.id;
                return (
                  <tr key={product.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="pm-checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={selectedRows.includes(product.id)}
                        onChange={() => handleSelectRow(product.id)}
                      />
                    </td>
                    <td>
                      <div className="pm-thumbnail">
                        <span className="pm-thumbnail-fallback" aria-hidden="true">🍃</span>
                        {imageUrl && (
                          <img src={imageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
                        )}
                      </div>
                    </td>
                    <td className="pm-product-name">{product.name}</td>
                    <td className="pm-product-price">Rs. {Number(product.price || 0).toFixed(2)}</td>
                    <td>
                      <div className="pm-stock-cell">
                        {renderStockBadge(quantity)}
                        <span className="pm-stock-count">{quantity}</span>
                      </div>
                    </td>
                    <td>
                      <div className="pm-status-group" role="radiogroup" aria-label={`Status for ${product.name}`}>
                        {['active', 'inactive'].map((status) => {
                          const checked = status === (active ? 'active' : 'inactive');
                          return (
                            <label className="pm-switch-row" key={status}>
                              <input
                                type="radio"
                                name={`status-${product.id}`}
                                value={status}
                                checked={checked}
                                disabled={isBusy}
                                onChange={() => handleStatusChange(product, status)}
                              />
                              <span className={`pm-pill ${checked ? (status === 'active' ? 'active-on' : 'inactive-on') : 'off'}`} aria-hidden="true">
                                <span className="pm-knob" />
                              </span>
                              <span className="pm-switch-text">{status === 'active' ? 'Active' : 'Inactive'}</span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="pm-actions">
                        <button type="button" className="pm-btn-edit" disabled={isBusy} onClick={() => handleEditClick(product)}>
                          <span aria-hidden="true">✎</span> Edit
                        </button>
                        <button type="button" className="pm-btn-delete" disabled={isBusy} onClick={() => handleDeleteClick(product)}>
                          <span aria-hidden="true">▣</span> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pm-card-footer">
          <span>Showing {firstProductNumber}-{lastProductNumber} of {filteredProducts.length} products</span>
          {pageCount > 1 && (
            <div className="pm-pagination" aria-label="Product pages">
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>‹</button>
              <span>Page {currentPage} of {pageCount}</span>
              <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}>›</button>
            </div>
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="pm-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-modal-title">
            <div className="pm-modal-header">
              <h3 id="pm-modal-title">{editingProductId ? 'Edit Product' : 'Add New Product'}</h3>
              <button type="button" className="pm-modal-close" aria-label="Close dialog" disabled={isSaving} onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="pm-modal-form">
              <div className="pm-form-group">
                <label htmlFor="pm-product-name">Product Name *</label>
                <input id="pm-product-name" type="text" name="name" placeholder="e.g., First Flush Orthodox Tea" value={formData.name} onChange={handleChange} required maxLength="150" />
              </div>
              <div className="pm-form-row">
                <div className="pm-form-group">
                  <label htmlFor="pm-product-price">Price (Rs.) *</label>
                  <input id="pm-product-price" type="number" name="price" min="0" step="0.01" placeholder="e.g., 1250.00" value={formData.price} onChange={handleChange} required />
                </div>
                <div className="pm-form-group">
                  <label htmlFor="pm-product-stock">Stock Quantity *</label>
                  <input id="pm-product-stock" type="number" name="stock_quantity" min="0" step="1" placeholder="e.g., 45" value={formData.stock_quantity} onChange={handleChange} required />
                </div>
              </div>
              <div className="pm-form-group">
                <label htmlFor="pm-product-image">Product Image (File Upload)</label>
                <div className="pm-file-box">
                  <input
                    ref={fileInputRef}
                    id="pm-product-image"
                    type="file"
                    accept="image/*"
                    aria-label="Upload product image"
                    disabled={isSaving}
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                  {selectedFile && (
                    <button
                      type="button"
                      className="pm-file-discard"
                      aria-label="Discard selected image"
                      title="Discard selected image"
                      disabled={isSaving}
                      onClick={discardSelectedFile}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="pm-form-group">
                <label htmlFor="pm-product-description">Description</label>
                <textarea id="pm-product-description" name="description" rows="3" placeholder="Enter product description..." value={formData.description} onChange={handleChange} />
              </div>
              <div className="pm-modal-footer">
                <button type="button" className="pm-btn-cancel" disabled={isSaving} onClick={closeModal}>Cancel</button>
                <button type="submit" className="pm-btn-save" disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingProductId ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
