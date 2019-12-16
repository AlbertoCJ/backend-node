// Port
process.env.PORT = process.env.PORT || 3000;

// nameDB
process.env.NAMEDB = 'appBD'

// Path files dataset
process.env.PATH_FILES_DATASET = 'uploads/filesDatasets';

// Date expired token
process.env.EXPIRED_TOKEN = 60 * 60 * 24 * 30;

// Seed authentication
process.env.SEED = process.env.SEED || 'secret-dev'