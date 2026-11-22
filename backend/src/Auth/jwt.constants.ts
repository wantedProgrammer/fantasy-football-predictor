/**
 * Secret used to sign and verify JWTs. Set JWT_SECRET in production; the
 * fallback only exists so the app runs locally without any configuration.
 */
export const JWT_SECRET =
  process.env.JWT_SECRET ?? 'fantasy-predictor-local-dev-secret';
