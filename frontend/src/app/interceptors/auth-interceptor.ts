import { HttpInterceptorFn } from '@angular/common/http';

const PUBLIC_ENDPOINTS = ['/api/register/', '/api/token/', '/api/password-reset/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint => req.url.includes(endpoint));
  if (isPublic) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');
  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }
  return next(req);
};