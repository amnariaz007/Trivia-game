// Simple logging utility to control log volume in production
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');
const isProduction = process.env.NODE_ENV === 'production';

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.INFO;

const logger = {
  error: (...args) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(...args);
    }
  },
  
  warn: (...args) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(...args);
    }
  },
  
  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.DEBUG && !isProduction) {
      console.log(...args);
    }
  }
};

module.exports = logger;
