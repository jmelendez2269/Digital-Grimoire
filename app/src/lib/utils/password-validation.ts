export interface PasswordRequirements {
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasMinLength: boolean;
}

export const MIN_PASSWORD_LENGTH = 12;

export const checkPasswordRequirements = (pwd: string): PasswordRequirements => {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd);
  const hasMinLength = pwd.length >= MIN_PASSWORD_LENGTH;

  return {
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSpecial,
    hasMinLength,
  };
};

export const getMissingRequirements = (pwd: string): string[] => {
  const checks = checkPasswordRequirements(pwd);
  const missing: string[] = [];

  if (!checks.hasLowercase) missing.push("lowercase letter");
  if (!checks.hasUppercase) missing.push("uppercase letter");
  if (!checks.hasNumber) missing.push("number");
  if (!checks.hasSpecial) missing.push("special character");
  if (!checks.hasMinLength) missing.push(`at least ${MIN_PASSWORD_LENGTH} characters`);

  return missing;
};

export const validatePassword = (pwd: string): { valid: boolean; errors: string[] } => {
  const missing = getMissingRequirements(pwd);
  return {
    valid: missing.length === 0,
    errors: missing,
  };
};

