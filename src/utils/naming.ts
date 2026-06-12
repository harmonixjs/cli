export function toPascalCase(value: string): string {
  const result = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  if (!result) throw new Error('Name must contain at least one letter or number.');
  return /^\d/.test(result) ? `Generated${result}` : result;
}

export function toFileName(value: string): string {
  return toPascalCase(value);
}

export function toCommandName(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/[^-\p{L}\p{N}_']/gu, '')
    .toLowerCase();
}

export function quote(value: string): string {
  return JSON.stringify(value);
}
