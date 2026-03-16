export function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isValidBankName(name: string): boolean {
  return name.trim().length >= 3 && name.trim().length <= 30;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
