// Port
process.env.PORT = process.env.PORT || 3000;

process.env.URL_DOCKER_LOCAL_SERVER = process.env.URL_DOCKER_LOCAL_SERVER || 'http://localhost';

// uri´s DB
process.env.MONGODB_URI_APP = process.env.MONGODB_URI_APP;
process.env.MONGODB_URI_WEKA_NODE = process.env.MONGODB_URI_WEKA_NODE;
process.env.MONGODB_URI_WEKA_JAVA = process.env.MONGODB_URI_WEKA_JAVA;

// Path files dataset
process.env.BUCKET_AWS_S3 = process.env.BUCKET_AWS_S3 || 'filesdatasets';
// process.env.PATH_FILES_DATASET = 'uploads/filesDatasets';
process.env.PATH_FILES_DATASET = process.env.PATH_FILES_DATASET || `https://${ process.env.BUCKET_AWS_S3 }.s3.amazonaws.com/`; 
// Extensions allowed
process.env.EXTENSION_ALLOWED = ['arff'];

// Date expired token
process.env.EXPIRED_TOKEN = "1 days"; // 60 * 60 * 24 * 30;

// Seed authentication
process.env.SEED = process.env.SEED || 'secret-dev'

// Time cronJobs
process.env.TIME_TO_RUN_CRONJOB = process.env.TIME_TO_RUN_CRONJOB | 1; // In minutes ej: 1
process.env.TIME_TO_REMOVE_CONTAINERS = process.env.TIME_TO_REMOVE_CONTAINERS | 5; // In minutes ej: 5

// Config Email
process.env.EMAIL = process.env.EMAIL || 'null';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'null';
process.env.OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID || 'null';
process.env.OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET || 'null';
process.env.OAUTH2_REFRESH_TOKEN = process.env.OAUTH2_REFRESH_TOKEN || 'null';


// Containers actives
process.env.CONTAINERS_EXCLUDED = process.env.CONTAINERS_EXCLUDED || 0;