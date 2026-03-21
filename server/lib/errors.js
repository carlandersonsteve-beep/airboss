export class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function requireField(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new AppError(`Missing required field: ${fieldName}`, 400);
  }
  return value;
}
