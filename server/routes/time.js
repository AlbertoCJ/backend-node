const express = require('express');
const Time = require('../models/appDB/time');
const { verifyToken } = require('../middlewares/authentication');
const app = express();

app.get('/time/:id', verifyToken, (req, res) => {

    let userId = req.params.id;

    let page = req.query.page || 1;
    let limit = req.query.limit || 1;

    if (limit > 20) limit = 20
    if (limit < 1) limit = 1

    const options = {
        page,
        limit,
        sort: { dateCreation: 'desc' }
    };


    Time.paginate({ user: userId }, options, (err, timesDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            times: timesDB
        });

    });

});

module.exports = app;