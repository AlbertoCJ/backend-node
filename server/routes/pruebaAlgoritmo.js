const express = require('express');
// const bcrypt = require('bcrypt');
const _ = require('underscore');
// const User = require('../models/user');
const { verifyToken } = require('../middlewares/authentication');
const axios = require('axios');
var FormData = require('form-data');
var fs = require('fs');
const path = require('path');
const FileAPI = require('file-api'),
    File = FileAPI.File,
    FileList = FileAPI.FileList,
    FileReader = FileAPI.FileReader;


const app = express();



app.post('/algorithm', (req, res) => {
    // let body = req.body;

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
            'accept': 'text/uri-list'
        }
    }

    // const requestBody = {
    //     file: '../uploads/filesDatasets/weather-11-6-555.arff',
    //     batchSize: 100,
    //     useKernelEstimator: 0,
    //     useSupervisedDiscretization: 0,
    //     validation: 'CrossValidation',
    //     validationNum: 10
    // } NO VALE
    // console.log(`${process.env.PATH_FILES_DATASET}/weather-11-6-555.arff`);
    let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/weather-11-6-555.arff`);
    // console.log(pathFile);
    // console.log(new File(`../${process.env.PATH_FILES_DATASET}/weather-11-6-555.arff`));
    // const file = new File(pathFile);


    // const blob = new Blob(`../${process.env.PATH_FILES_DATASET}/weather-11-6-555.arff`);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(`../../${process.env.PATH_FILES_DATASET}/weather-11-6-555.arff`));
    formData.append('batchSize', 100);
    formData.append('useKernelEstimator', 0);
    formData.append('useSupervisedDiscretization', 0);
    formData.append('validation', 'CrossValidation');
    formData.append('validationNum', 10);


    res.json({
        ok: true,
        data: formData
    });

    // const options = {
    //     hostname: 'localhost',
    //     port: 8081,
    //     path: '/algorithm/NaiveBayes',
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'multipart/form-data',
    //         'accept': 'text/uri-list'
    //     } NO VALE
    // }


    // let resp = null;
    // axios.post('http://localhost:8081/algorithm/NaiveBayes', formData, config)
    //     .then(function(response) {
    //         console.log(response);
    //         res.json({
    //             ok: true,
    //             data: response
    //         });
    //     })
    //     .catch(function(error) {
    //         console.log('EEERROOOOOOOORRR', error);
    //         res.json({
    //             ok: true,
    //             data: error
    //         });
    //     });

})




module.exports = app;