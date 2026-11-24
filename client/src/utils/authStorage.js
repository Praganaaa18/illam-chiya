export const getAuthToken = () => (
  localStorage.getItem('token') || sessionStorage.getItem('token')
);

export const saveAuthToken = (token, rememberMe) => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  (rememberMe ? localStorage : sessionStorage).setItem('token', token);
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};
