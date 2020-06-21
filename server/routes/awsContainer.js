const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const AwsContainer = require('../models/wekaDB/awsContainer');

const app = express();

app.get('/awsContainer', verifyToken, (req, res) => {

    AwsContainer.find({}, async(err, listContainersDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            containers: listContainersDB
        });
    });

});

app.get('/awsContainerOwn/:id', verifyToken, (req, res) => {

    let userId = req.user._id;
    let jobId = req.params.id;

    AwsContainer.find({ "User_id": userId, "Job_id": jobId }, async(err, listContainersDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            containers: listContainersDB
        });
    });


});

module.exports = app;