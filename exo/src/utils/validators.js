export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

// Returns 0-4: length, upper+lower case, number, symbol
export function passwordScore(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}