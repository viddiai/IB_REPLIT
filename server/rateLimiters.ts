import rateLimit from 'express-rate-limit';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'För många förfrågningar från denna IP, försök igen senare.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'För många inloggningsförsök, försök igen om 15 minuter.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Moderate rate limiter for public endpoints - 10 requests per hour
export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'För många förfrågningar, försök igen senare.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for password reset - 3 requests per hour
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: 'För många återställningsförsök, försök igen om en timme.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for file uploads - 10 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'För många uppladdningar, försök igen senare.' },
  standardHeaders: true,
  legacyHeaders: false,
});
