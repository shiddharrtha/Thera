/** First word of a full name, or the local part of an email as fallback. */
export function getFirstName(fullName?: string | null, email?: string | null): string {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }
  if (email?.trim()) {
    return email.trim().split('@')[0];
  }
  return '';
}

/** Uppercase initial from the user's first name. */
export function getNameInitial(fullName?: string | null, email?: string | null): string {
  const first = getFirstName(fullName, email);
  return first ? first.charAt(0).toUpperCase() : '?';
}
