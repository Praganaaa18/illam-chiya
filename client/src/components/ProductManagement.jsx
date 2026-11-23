import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Icon from './Icon';
import TablePagination, { SortHeader, sortRows, useTableSort } from './TableControls';
import { isValidUploadSize, UPLOAD_SIZE_ERROR } from '../utils/uploadLimits';
import { isSellerSessionError } from '../utils/sellerSession';
import './ProductManagement.css';

const API_ORIGIN = 'http://localhost:5000';
const PAGE_SIZE = 10;
const PACK_SIZE_OPTIONS = ['50 g', '100 g', '250 g', '500 g', '1 kg'];
const PACK_SIZE_ERROR = 'Enter a size from 1 to 99999 g, or a size such as 1 kg.';
const normalizePackSize = (value) => {
  const match = value.trim().match(/^([1-9]\d{0,4})\s*(g|kg)$/i);
  return match ? `${Number(match[1])} ${match[2].toLowerCase()}` : '';
};
const INITIAL_FORM = {
  name: '',
  description: '',
  price: '',
  stock_quantity: '',
  category_id: '',
  pack_size: '100 g',
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

const getAuthConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const ProductManagement = ({
  sellerId = localStorage.getItem('userId'),
  onSellerSessionError,
}) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [categoryLoadError, setCategoryLoadError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isCustomPackSize, setIsCustomPackSize] = useState(false);
  const [customPackSizeError, setCustomPackSizeError] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCategoryBusy, setIsCategoryBusy] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const productNameRef = useRef(null);
  const modalTriggerRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const isCategoryDropdownOpenRef = useRef(isCategoryDropdownOpen);
  isCategoryDropdownOpenRef.current = isCategoryDropdownOpen;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortConfig, handleSort] = useTableSort('name');
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
      const response = await axios.get(`${API_ORIGIN}/api/products/seller/${sellerId}`, getAuthConfig());
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid product list.');
      }
      const uniqueProducts = Array.from(
        new Map(response.data.map((product) => [String(product.id), product])).values()
      );
      setProducts(uniqueProducts);
      setSelectedRows((selected) => selected.filter((id) =>
        uniqueProducts.some((product) => String(product.id) === String(id))
      ));
    } catch (error) {
      console.error('Error fetching products:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
      setLoadError(getErrorMessage(error, 'Could not load products. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [sellerId, onSellerSessionError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoryLoadError('');
    try {
      const response = await axios.get(`${API_ORIGIN}/api/products/categories`, getAuthConfig());
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid category list.');
      }
      setCategories(response.data);
      setFormData((current) => {
        const selectedCategory = response.data.find(
          (category) => String(category.id) === String(current.category_id)
        );
        return {
          ...current,
          category_id: String(selectedCategory?.id || response.data[0]?.id || ''),
        };
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
      setCategoryLoadError(getErrorMessage(error, 'Could not load categories.'));
    } finally {
      setIsLoadingCategories(false);
    }
  }, [onSellerSessionError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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

  const sortedProducts = useMemo(() => sortRows(filteredProducts, sortConfig, (product, key) => {
    const values = {
      name: product.name,
      category: product.category,
      pack_size: product.pack_size,
      price: product.price,
      stock_quantity: product.stock_quantity,
      status: isProductActive(product) ? 'active' : 'inactive',
    };
    return values[key] ?? '';
  }), [filteredProducts, sortConfig]);
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const pageProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stockFilter, pageSize]);

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
    if (name === 'pack_size') setCustomPackSizeError('');
  };

  const handlePackSizeChange = (event) => {
    const value = event.target.value;
    setIsCustomPackSize(value === 'custom');
    setCustomPackSizeError('');
    setFormData((current) => ({
      ...current,
      pack_size: value === 'custom' ? '' : value,
    }));
  };

  const handleCustomPackSizeKeyDown = (event) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const enteredValue = formData.pack_size.trim();
    const valueWithUnit = /^\d+$/.test(enteredValue) ? `${enteredValue} g` : enteredValue;
    const packSize = normalizePackSize(valueWithUnit);
    if (!packSize) {
      setCustomPackSizeError(PACK_SIZE_ERROR);
      return;
    }

    setFormData((current) => ({ ...current, pack_size: packSize }));
    setIsCustomPackSize(false);
    setCustomPackSizeError('');
    setNotice(null);
  };

  const validateCustomPackSize = () => {
    const packSize = normalizePackSize(formData.pack_size);
    if (!packSize) {
      setCustomPackSizeError(PACK_SIZE_ERROR);
      return '';
    }

    setCustomPackSizeError('');
    return packSize;
  };

  const discardSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && !isValidUploadSize(file.size)) {
      discardSelectedFile();
      setNotice({ type: 'error', message: UPLOAD_SIZE_ERROR });
      return;
    }

    setNotice(null);
    setSelectedFile(file);
  };

  const handleOpenAddModal = (event) => {
    modalTriggerRef.current = event?.currentTarget || null;
    setNotice(null);
    setCategoryError('');
    setCategoryMessage('');
    setIsAddingCategory(false);
    setIsCategoryDropdownOpen(false);
    setNewCategoryName('');
    setEditingProductId(null);
    setIsCustomPackSize(false);
    setCustomPackSizeError('');
    setFormData({ ...INITIAL_FORM, category_id: String(categories[0]?.id || '') });
    discardSelectedFile();
    setIsModalOpen(true);
  };

  const handleEditClick = (product, event) => {
    modalTriggerRef.current = event?.currentTarget || null;
    setNotice(null);
    setCategoryError('');
    setCategoryMessage('');
    setIsAddingCategory(false);
    setIsCategoryDropdownOpen(false);
    setNewCategoryName('');
    setEditingProductId(product.id);
    const packSize = product.pack_size || '100 g';
    setIsCustomPackSize(!PACK_SIZE_OPTIONS.includes(packSize));
    setCustomPackSizeError('');
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      stock_quantity: product.stock_quantity ?? '',
      category_id: String(product.category_id || categories[0]?.id || ''),
      pack_size: packSize,
      image_url: product.image_url || '',
      status: isProductActive(product) ? 'active' : 'inactive',
    });
    discardSelectedFile();
    setIsModalOpen(true);
  };

  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM });
    setCategoryError('');
    setCategoryMessage('');
    setNewCategoryName('');
    setIsAddingCategory(false);
    setIsCategoryDropdownOpen(false);
    setIsCustomPackSize(false);
    setCustomPackSizeError('');
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
    const modalTrigger = modalTriggerRef.current;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isCategoryDropdownOpenRef.current) {
          setIsCategoryDropdownOpen(false);
          return;
        }
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    productNameRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      modalTrigger?.focus();
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!categoryDropdownRef.current?.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isCategoryDropdownOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saveInFlightRef.current) return;

    const price = Number(formData.price);
    const stock = Number(formData.stock_quantity);
    const categoryId = Number(formData.category_id);
    const packSize = normalizePackSize(formData.pack_size);
    if (!packSize) {
      if (isCustomPackSize) {
        validateCustomPackSize();
      } else {
        setNotice({ type: 'error', message: PACK_SIZE_ERROR });
      }
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setNotice({ type: 'error', message: 'Enter a valid non-negative price and whole-number stock quantity.' });
      return;
    }
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0 ||
        !categories.some((category) => Number(category.id) === categoryId)) {
      setNotice({ type: 'error', message: 'Select a valid product category.' });
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    setNotice(null);
    try {
      const productIdBeingEdited = editingProductId;
      let imageUrl = formData.image_url.trim();
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('image', selectedFile);
        const uploadResponse = await axios.post(`${API_ORIGIN}/api/upload`, uploadData, getAuthConfig());
        imageUrl = uploadResponse.data.filePath || uploadResponse.data.url || '';
        if (!imageUrl) throw new Error('The image upload completed without returning an image URL.');
      }

      const productPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price,
        stock_quantity: stock,
        category_id: categoryId,
        pack_size: packSize,
        image_url: imageUrl,
        seller_id: sellerId,
        status: formData.status,
      };

      if (productIdBeingEdited) {
        await axios.put(`${API_ORIGIN}/api/products/${productIdBeingEdited}`, productPayload, getAuthConfig());
      } else {
        await axios.post(`${API_ORIGIN}/api/products`, productPayload, getAuthConfig());
      }

      setIsModalOpen(false);
      resetForm();
      setNotice({ type: 'success', message: `Product ${productIdBeingEdited ? 'updated' : 'added'} successfully.` });
      await fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
      setNotice({ type: 'error', message: getErrorMessage(error, 'Failed to save product. Please try again.') });
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError('Enter a category name.');
      return;
    }

    setIsCategoryBusy(true);
    setCategoryError('');
    setCategoryMessage('');
    try {
      const response = await axios.post(
        `${API_ORIGIN}/api/products/categories`,
        { name },
        getAuthConfig()
      );
      const createdCategory = response.data;
      if (!createdCategory?.id || !createdCategory?.name) {
        throw new Error('The server did not return the created category.');
      }
      setCategories((current) => [...current, createdCategory]);
      setFormData((current) => ({ ...current, category_id: String(createdCategory.id) }));
      setCategoryLoadError('');
      setNewCategoryName('');
      setIsAddingCategory(false);
      setCategoryMessage(`${createdCategory.name} added and selected.`);
    } catch (error) {
      console.error('Error creating category:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
      setCategoryError(getErrorMessage(error, 'Could not add category.'));
    } finally {
      setIsCategoryBusy(false);
    }
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    const selectedCategory = categoryToDelete || categories.find(
      (category) => String(category.id) === String(formData.category_id)
    );
    if (!selectedCategory) return;
    if (!window.confirm(`Delete the "${selectedCategory.name}" category?`)) return;

    const isSelectedCategory = String(formData.category_id) === String(selectedCategory.id);
    setIsCategoryBusy(true);
    setCategoryError('');
    setCategoryMessage('');
    try {
      await axios.delete(
        `${API_ORIGIN}/api/products/categories/${selectedCategory.id}`,
        getAuthConfig()
      );
      const remainingCategories = categories.filter(
        (category) => String(category.id) !== String(selectedCategory.id)
      );
      setCategories(remainingCategories);
      if (isSelectedCategory) {
        setFormData((current) => ({
          ...current,
          category_id: String(remainingCategories[0]?.id || ''),
        }));
      }
      setIsCategoryDropdownOpen(false);
      setCategoryMessage(`${selectedCategory.name} deleted.`);
    } catch (error) {
      console.error('Error deleting category:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
      setCategoryError(getErrorMessage(error, 'Could not delete category.'));
    } finally {
      setIsCategoryBusy(false);
    }
  };

  const handleDeleteClick = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    setNotice(null);
    setBusyProductId(product.id);
    try {
      await axios.delete(`${API_ORIGIN}/api/products/${product.id}`, getAuthConfig());
      setSelectedRows((selected) => selected.filter((id) => id !== product.id));
      setNotice({ type: 'success', message: 'Product deleted successfully.' });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
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
      await axios.patch(`${API_ORIGIN}/api/products/${product.id}/status`, { status: newStatus }, getAuthConfig());
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, is_active: newStatus === 'active' ? 1 : 0 } : item,
        ),
      );
    } catch (error) {
      console.error('Failed to update product status:', error);
      if (isSellerSessionError(error)) onSellerSessionError?.();
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

  const selectedCategory = categories.find(
    (category) => String(category.id) === String(formData.category_id)
  );

  return (
    <div className="pm-container">
      <div className="pm-header-row">
        <h2 className="pm-title"><Icon name="leaf" />Product Management</h2>
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
                <SortHeader label="Product Name" column="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label="Category" column="category" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label="Pack Size" column="pack_size" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label="Price" column="price" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label="Stock" column="stock_quantity" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="9" className="pm-empty" role="status">Loading products…</td></tr>
              ) : loadError ? (
                <tr>
                  <td colSpan="9" className="pm-empty">
                    <span>{loadError}</span>
                    <button type="button" className="pm-retry-btn" onClick={fetchProducts}>Try again</button>
                  </td>
                </tr>
              ) : pageProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="pm-empty">
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
                        <span className="pm-thumbnail-fallback" aria-hidden="true"><Icon name="leaf" /></span>
                        {imageUrl && (
                          <img src={imageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
                        )}
                      </div>
                    </td>
                    <td className="pm-product-name">{product.name}</td>
                    <td className="pm-product-category">{product.category || 'Uncategorized'}</td>
                    <td className="pm-product-pack-size">{product.pack_size || '100 g'}</td>
                    <td className="pm-product-price">Rs. {Number(product.price || 0).toFixed(2)}</td>
                    <td>
                      <div className="pm-stock-cell">
                        {renderStockBadge(quantity)}
                      </div>
                    </td>
                    <td>
                      <label className="pm-switch-row">
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label={`${product.name} active status`}
                          checked={active}
                          disabled={isBusy}
                          onChange={(event) => handleStatusChange(product, event.target.checked ? 'active' : 'inactive')}
                        />
                        <span className={`pm-pill ${active ? 'active-on' : 'off'}`} aria-hidden="true">
                          <span className="pm-knob" />
                        </span>
                        <span className="pm-switch-text">{active ? 'Active' : 'Inactive'}</span>
                      </label>
                    </td>
                    <td>
                      <div className="pm-actions">
                        <button type="button" className="pm-btn-edit" disabled={isBusy} onClick={(event) => handleEditClick(product, event)}>
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
          <TablePagination
            page={currentPage}
            pageCount={pageCount}
            total={sortedProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="products"
          />
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
                <input ref={productNameRef} id="pm-product-name" type="text" name="name" placeholder="e.g., First Flush Orthodox Tea" value={formData.name} onChange={handleChange} required maxLength="150" />
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
              <div className="pm-form-row pm-category-pack-row">
                <div className="pm-form-group">
                  <label htmlFor="pm-product-category">Product Category *</label>
                  <div className="pm-category-control">
                    <div className="pm-category-dropdown-wrap" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      id="pm-product-category"
                      className="pm-category-trigger"
                      aria-haspopup="dialog"
                      aria-expanded={isCategoryDropdownOpen}
                      aria-label={`Product Category: ${selectedCategory?.name || 'Choose a category'}`}
                      disabled={isLoadingCategories || isCategoryBusy || isSaving}
                      onClick={() => setIsCategoryDropdownOpen((open) => !open)}
                    >
                      <span>{selectedCategory?.name || 'Choose a category'}</span>
                      <span className="pm-category-chevron" aria-hidden="true">⌄</span>
                    </button>
                    {isCategoryDropdownOpen && (
                      <div className="pm-category-menu" role="dialog" aria-label="Product categories">
                        <button
                          type="button"
                          className="pm-category-add-option"
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            setIsAddingCategory(true);
                            setCategoryError('');
                            setCategoryMessage('');
                          }}
                        >
                          + Add category
                        </button>
                        <div className="pm-category-menu-heading">Choose a category</div>
                        {categories.map((category) => (
                          <div className="pm-category-option-row" key={category.id}>
                            <button
                              type="button"
                              className={`pm-category-option ${String(category.id) === String(formData.category_id) ? 'selected' : ''}`}
                              aria-pressed={String(category.id) === String(formData.category_id)}
                              onClick={() => {
                                setFormData((current) => ({ ...current, category_id: String(category.id) }));
                                setCategoryError('');
                                setCategoryMessage('');
                                setIsCategoryDropdownOpen(false);
                                setIsAddingCategory(false);
                                setNewCategoryName('');
                              }}
                            >
                              {category.name}
                            </button>
                            <button
                              type="button"
                              className="pm-category-delete"
                              aria-label={`Delete ${category.name}`}
                              title={`Delete ${category.name}`}
                              disabled={isCategoryBusy || isSaving}
                              onClick={() => handleDeleteCategory(category)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {categories.length === 0 && (
                          <p className="pm-category-empty">
                            {isLoadingCategories ? 'Loading categories…' : 'No categories yet.'}
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                    {isAddingCategory && (
                      <div className="pm-category-add-row">
                        <input
                          type="text"
                          aria-label="New category name"
                          placeholder="Type a category name"
                          value={newCategoryName}
                          maxLength="50"
                          disabled={isCategoryBusy || isSaving}
                          onChange={(event) => setNewCategoryName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleCreateCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="pm-category-save"
                          onClick={handleCreateCategory}
                          disabled={isCategoryBusy || isSaving || !newCategoryName.trim()}
                        >
                          {isCategoryBusy ? 'Adding…' : '+ Add'}
                        </button>
                        <button
                          type="button"
                          className="pm-category-cancel"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName('');
                            setCategoryError('');
                          }}
                          disabled={isCategoryBusy || isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {categoryError && <p className="pm-category-feedback error" role="alert">{categoryError}</p>}
                    {categoryLoadError && <p className="pm-category-feedback error" role="alert">{categoryLoadError}</p>}
                    {categoryMessage && <p className="pm-category-feedback success" role="status">{categoryMessage}</p>}
                  </div>
                </div>
                <div className="pm-form-group">
                  <label htmlFor="pm-pack-size">Per Pack *</label>
                  <select
                    id="pm-pack-size"
                    className="pm-pack-size-select"
                    value={isCustomPackSize ? 'custom' : formData.pack_size}
                    onChange={handlePackSizeChange}
                    disabled={isSaving}
                    required
                  >
                    {[
                      ...PACK_SIZE_OPTIONS,
                      ...(formData.pack_size && !PACK_SIZE_OPTIONS.includes(formData.pack_size) && !isCustomPackSize
                        ? [formData.pack_size]
                        : []),
                    ].map((packSize) => (
                      <option key={packSize} value={packSize}>{packSize}</option>
                    ))}
                    <option value="custom">Custom size…</option>
                  </select>
                  {isCustomPackSize && (
                    <input
                      className="pm-pack-size-custom"
                      type="text"
                      aria-label="Custom pack size"
                      placeholder="e.g., 750 g"
                      value={formData.pack_size}
                      maxLength="20"
                      disabled={isSaving}
                      onChange={handleChange}
                      onKeyDown={handleCustomPackSizeKeyDown}
                      onBlur={() => {
                        if (formData.pack_size.trim()) validateCustomPackSize();
                      }}
                      aria-invalid={Boolean(customPackSizeError)}
                      aria-describedby={customPackSizeError ? 'pm-pack-size-error' : undefined}
                      name="pack_size"
                      required
                    />
                  )}
                  {isCustomPackSize && customPackSizeError && (
                    <small id="pm-pack-size-error" className="pm-pack-size-hint pm-pack-size-error" role="alert">
                      {customPackSizeError}
                    </small>
                  )}
                  <small className="pm-pack-size-hint">Displayed on the product catalog</small>
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
                    onChange={handleImageFileChange}
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
                <small className="pm-pack-size-hint">Accepted file size: 100 KB–500 KB.</small>
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
