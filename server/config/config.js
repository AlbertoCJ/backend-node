// Port
process.env.PORT = process.env.PORT || 3000;

// uri´s DB
process.env.MONGODB_URI_APP = process.env.MONGODB_URI_APP;
process.env.MONGODB_URI_WEKA_NODE = process.env.MONGODB_URI_WEKA_NODE;

// Path files dataset
process.env.PATH_FILES_DATASET = 'uploads/filesDatasets';
// Extensions allowed
process.env.EXTENSION_ALLOWED = ['arff'];

// Date expired token
process.env.EXPIRED_TOKEN = 60 * 60 * 24 * 30;

// Seed authentication
process.env.SEED = process.env.SEED || 'secret-dev'