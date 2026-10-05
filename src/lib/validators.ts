export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;

  // No spaces allowed
  if (trimmed.includes(' ')) return false;

  // Ensure only one @ symbol
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return false;

  // Basic regex for email pattern
  const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!regex.test(trimmed)) return false;

  // No consecutive dots
  if (trimmed.includes('..')) return false;

  // No dots immediately before or after @
  if (localPart.endsWith('.')) return false;
  if (domainPart.startsWith('.')) return false;

  return true;
}
