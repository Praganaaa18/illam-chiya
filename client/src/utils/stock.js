export const getRemainingStock = (product, cartItems = []) => {
  const stock = Math.max(0, Math.floor(Number(product?.stock_quantity) || 0));
  const cartItem = cartItems.find((item) => String(item.id) === String(product?.id));
  const quantityInCart = Math.max(0, Math.floor(Number(cartItem?.quantity) || 0));
  return Math.max(0, stock - quantityInCart);
};
