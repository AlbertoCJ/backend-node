const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const fs = require('fs');
const path = require('path');
const request = require('request');

const app = express();

app.post('/algorithm', (req, res) => {
    let fileName = req.params.fileName; // 'weather-11-6-807.arff';
    if (!fileName) {
        res.json({
            ok: false,
            err: {
                message: 'Debes de pasar un nombre de fichero.'
            }
        });
    }
    let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileName }`);

    if (!fs.existsSync(pathFile)) {
        res.json({
            ok: false,
            err: {
                pathFile,
                message: 'No existe el fichero'
            }
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


    request.post({ url: 'http://localhost:60000/algorithm/linearRegression', headers: headers, formData: formData }, function(err, httpResponse, body) {
        if (err) {
            res.json({
                ok: false,
                err
            });
        }
        // checkTask(body.taskUrl);
        res.json({
            ok: true,
            taskUrl: body
        });
    });

    // let checkTask = (taskUrl) => {
    //     console.log('ENTRA');
    //     // let stop = false;


    //     // request.get({ url: taskUrl }, function(err, httpResponse, body) {
    //     //     if (err) {
    //     //         res.json({
    //     //             ok: false,
    //     //             err
    //     //         });
    //     //     }

    //     //     res.json({
    //     //         ok: true,
    //     //         taskUrl: body
    //     //     });
    //     // });

    // };

});

module.exports = app;