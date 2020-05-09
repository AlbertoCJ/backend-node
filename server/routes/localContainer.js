const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const LocalContainer = require('../models/wekaDB/localContainer');

const app = express();

app.get('/localContainer', verifyToken, (req, res) => {

    LocalContainer.find({}, async(err, listContainersDB) => {

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

// app.get('/localContainer/free', verifyToken, (req, res) => {

//     LocalContainer.find({ "User_id": "", "Job_id": "", "Working": false }, async(err, listContainersDB) => {

//         if (err) {
//             return res.status(500).json({
//                 ok: false,
//                 err
//             });
//         }

//         res.json({
//             ok: true,
//             containersFree: listContainersDB
//         });
//     });

// });

// app.get('/localContainer/own', verifyToken, (req, res) => {

//     let user_id = req.user._id;

//     LocalContainer.find({ "User_id": user_id }, async(err, listContainersDB) => {

//         if (err) {
//             return res.status(500).json({
//                 ok: false,
//                 err
//             });
//         }

//         res.json({
//             ok: true,
//             containersOwn: listContainersDB
//         });
//     });

// });

module.exports = app;