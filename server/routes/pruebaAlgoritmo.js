const express = require('express');
// const bcrypt = require('bcrypt');
// const _ = require('underscore');
// const User = require('../models/user');
const { verifyToken } = require('../middlewares/authentication');
const fs = require('fs');
const path = require('path');
const request = require('request');

const app = express();

app.post('/pruebaAlgorithm', (req, res) => {

    let fileName = 'weather-11-4-295.arff';
    let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileName }`);

    if (!fs.existsSync(pathFile)) {
        res.json({
            ok: false,
            pathFile,
            message: 'No existe el fichero'
        });
    }

    const headers = {
        'Content-Type': 'multipart/form-data',
        'accept': 'text/uri-list'
    };

    const formData = {
        file: fs.createReadStream(pathFile),
        // batchSize: 100,
        // useKernelEstimator: 0,
        // useSupervisedDiscretization: 0,
        // validation: 'CrossValidation',
        // validationNum: 10
    };


    request.post({ url: 'http://localhost:8081/algorithm/NaiveBayes', headers: headers, formData: formData }, function(err, httpResponse, body) {
        if (err) {
            res.json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            taskUrl: body
        });
    });

});


module.exports = app;