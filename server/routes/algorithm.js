const express = require('express');
const fileUpload = require('express-fileupload');
const { verifyToken } = require('../middlewares/authentication');
const app = express();

// default options
app.use(fileUpload());

app.post('/algorithm', (req, res) => {
    console.log(req);
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            ok: false,
            err: {
                message: 'No files were uploaded.234'
            }
        });
    }

    let file = req.files.file;

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
            'accept': 'text/uri-list'
        }
    }

    // const formData = new FormData();
    // formData.append('file', file, file.name);

    let data = {
        file
        // batchSize: 100,
        // useKernelEstimator: 0,
        // useSupervisedDiscretization: 0,
        // validation: 'CrossValidation',
        // validationNum: 10
    }

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

    // const formData = new FormData();
    // formData.append('file', file, file.name);
    // formData.append('batchSize', 100);
    // formData.append('useKernelEstimator', 0);
    // formData.append('useSupervisedDiscretization', 0);
    // formData.append('validation', 'CrossValidation');
    // formData.append('validationNum', 10);

    res.json({
        ok: true,
        file
    });

});

module.exports = app;