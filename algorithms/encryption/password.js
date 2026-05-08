export function validatePasswordStrength(password) {
  const value = String(password || "");
  const checks = {
    minLength: value.length >= 12,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return {
    valid: score >= 4,
    score,
    checks,
  };
}
