// Set NODE_ENV to test before any module loads
process.env.NODE_ENV = 'test';

// Suppress winston output entirely during tests
process.env.WINSTON_SILENT = 'true';
