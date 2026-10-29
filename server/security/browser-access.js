import { runtimeAccess } from '../services/runtimeAccess.js';

export function assertBrowserEnabled(access = runtimeAccess) {
  if (!access.settings.browser) throw new Error('Browser access is disabled in Access settings.');
}

export function browserAccessMiddleware(req, res, next) {
  try {
    assertBrowserEnabled();
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
}
