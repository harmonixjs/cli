import chalk from 'chalk';

export function log(message: string) {
  console.log(message);
}

export function success(message: string) {
  console.log(chalk.green(message));
}

export function error(message: string) {
  console.log(chalk.red(`✖ ${message}`));
}

export function warning(message: string) {
  console.log(chalk.yellow(`⚠ ${message}`));
}

export function info(message: string) {
  console.log(chalk.blue(`ℹ ${message}`));
}