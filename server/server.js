require('./config/config');
const cors = require('cors');
const express = require('express');

const app = express();

// CORS
app.use(cors());

const bodyParser = require('body-parser');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Routes
app.use(require('./routes/index'));

// public folder
// app.use(express.static(path.resolve(__dirname, '../public')));

require('./connectionsDB');

app.listen(process.env.PORT, () => {
    console.log('Listen on port 3000');
});