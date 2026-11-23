export const getEstimatedDeliveryDate = (orderDate) => {
  if (!orderDate) return null;
  const estimatedDate = new Date(orderDate);
  if (Number.isNaN(estimatedDate.getTime())) return null;
  estimatedDate.setDate(estimatedDate.getDate() + 10);
  return estimatedDate;
};

export const formatDeliveryDateRange = (orderDate) => {
  const estimatedDate = getEstimatedDeliveryDate(orderDate);
  const placedDate = new Date(orderDate);
  if (!estimatedDate || Number.isNaN(placedDate.getTime())) return 'Estimate unavailable';

  const dateOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return `${placedDate.toLocaleDateString(undefined, dateOptions)} – ${estimatedDate.toLocaleDateString(undefined, dateOptions)}`;
};
