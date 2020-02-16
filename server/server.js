require('./config/config');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
// const path = require('path');

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





mongoose.connect(`mongodb://localhost:27017/${ process.env.NAMEDB }`, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err, res) => {
    if (err) throw err;

    console.log('BD ONLINE');
});

app.listen(process.env.PORT, () => {
    console.log('Listen on port 3000');
});