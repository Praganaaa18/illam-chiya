export const isSellerSessionError = (error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.response?.data?.error;

  return status === 401 ||
    (status === 400 && message === 'Invalid or expired token.') ||
    (status === 403 && message === 'Seller access is required.');
};
