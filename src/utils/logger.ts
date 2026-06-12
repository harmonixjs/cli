import chalk from 'chalk';

export function log(message: string): void {
  console.log(message);
}

export function success(message: string): void {
  console.log(chalk.green(message));
}

export function error(message: string): void {
  console.error(chalk.red(`Error: ${message}`));
}

export function warning(message: string): void {
  console.warn(chalk.yellow(`Warning: ${message}`));
}

export function info(message: string): void {
  console.log(chalk.blue(message));
}
