import React, { useState, useEffect } from 'react';
import './BillingsandPayouts.css';

const BillingsAndPayouts = ({ sellerId = 1 }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [settleMessage, setSettleMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLedgerData();
  }, [sellerId]);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/finance/ledger/${sellerId}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDelivered = (status) => status.toLowerCase() === 'delivered';
  const isPending = (status) => ['pending', 'processing', 'shipped'].includes(status.toLowerCase());

  const totalCashCollected = transactions
    .filter((item) => isDelivered(item.status))
    .reduce((sum, item) => sum + Number(item.total_amount), 0);

  const pendingCash = transactions
    .filter((item) => isPending(item.status))
    .reduce((sum, item) => sum + Number(item.total_amount), 0);

  const commissionFeeDue = transactions
    .filter((item) => isDelivered(item.status))
    .reduce((sum, item) => sum + Number(item.total_amount) * Number(item.fee_rate), 0);

  const netSellerEarnings = totalCashCollected - commissionFeeDue;

  const filteredTransactions = transactions.filter((t) => {
    const formattedId = `ORD-${String(t.order_id).padStart(3, '0')}`;
    const matchesFilter = statusFilter === 'All' || t.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      formattedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!proofFile) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('sellerId', sellerId);
    formData.append('amountPaid', commissionFeeDue);
    formData.append('proof', proofFile);

    try {
      const res = await fetch('http://localhost:5000/api/finance/settle-dues', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSettleMessage(data.message);
        setTimeout(() => {
          setShowSettleModal(false);
          setSettleMessage('');
          setProofFile(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="finance-container">Loading Billings & Payouts...</div>;

  return (
    <div className="finance-container">
      <div className="finance-header">
        <div>
          <h2>Billings & Payouts</h2>
          <p className="subtitle">Track Cash on Delivery collections & platform fee dues</p>
        </div>
        <button className="print-btn" onClick={() => window.print()}>
          🖨️ Print Summary
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="card-label">Total Cash Collected</span>
          <h3 className="card-value">NPR {totalCashCollected.toLocaleString()}</h3>
          <span className="card-hint">Delivered COD orders</span>
        </div>

        <div className="metric-card">
          <span className="card-label">Pending Cash Collection</span>
          <h3 className="card-value pending">NPR {pendingCash.toLocaleString()}</h3>
          <span className="card-hint">Orders in delivery pipeline</span>
        </div>

        <div className="metric-card">
          <span className="card-label">Platform Fee Due (5%)</span>
          <h3 className="card-value fee">NPR {commissionFeeDue.toLocaleString()}</h3>
          <button className="settle-btn" onClick={() => setShowSettleModal(true)}>
            Settle Dues
          </button>
        </div>

        <div className="metric-card highlight">
          <span className="card-label">Net Seller Earnings</span>
          <h3 className="card-value net">NPR {netSellerEarnings.toLocaleString()}</h3>
          <span className="card-hint">Your net revenue</span>
        </div>
      </div>

      <div className="table-controls">
        <h3>Cash Ledger</h3>
        <div className="control-group">
          <input
            type="text"
            placeholder="Search Order ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="shipped">Shipped</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Cash Total</th>
              <th>Fee (5%)</th>
              <th>Net Earnings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((item) => {
                const total = Number(item.total_amount);
                const fee = total * Number(item.fee_rate);
                const net = total - fee;
                const formattedId = `#ORD-${String(item.order_id).padStart(3, '0')}`;

                return (
                  <tr key={item.order_id}>
                    <td>{item.date}</td>
                    <td className="order-id">{formattedId}</td>
                    <td>{item.customer}</td>
                    <td>{item.address}</td>
                    <td><strong>NPR {total.toLocaleString()}</strong></td>
                    <td className="fee-text">- NPR {fee.toLocaleString()}</td>
                    <td className="net-text">NPR {net.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>
                        {isDelivered(item.status) ? '● Cash Received' : `⏱ ${item.status}`}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="no-data">No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showSettleModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Settle Commission Dues</h3>
            <p>
              Please clear your 5% platform fee of <strong>NPR {commissionFeeDue.toLocaleString()}</strong> via bank transfer or eSewa/Khalti.
            </p>

            <div className="payment-info-box">
              <p><strong>Bank:</strong> Nabil Bank</p>
              <p><strong>Account Name:</strong> Ilam Chiya Platform Pvt. Ltd.</p>
              <p><strong>Account No:</strong> 0120017500291</p>
              <p><strong>eSewa / Khalti ID:</strong> 9801234567</p>
            </div>

            {settleMessage ? (
              <div className="success-msg">{settleMessage}</div>
            ) : (
              <form onSubmit={handleSettleSubmit}>
                <div className="form-group">
                  <label>Upload Payment Voucher / Screenshot</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowSettleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Uploading...' : 'Submit Proof'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingsAndPayouts;