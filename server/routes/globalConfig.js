const express = require('express');
const GlobalConfig = require('../models/appDB/globalConfig');
const { verifyToken } = require('../middlewares/authentication');
const _ = require('underscore');
const app = express();


// Devuelve config, si no existe lo crea por defecto
app.get('/globalConfig', verifyToken, async(req, res) => {

    let globalConfigArray = await GlobalConfig.find({}, (err, globalConfigDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        return globalConfigDB;
    });

    // Si no existe creo por defecto
    if (globalConfigArray.length <= 0) {
        let globalConfigNew = new GlobalConfig();
        globalConfigNew.save((err, globalConfigDB) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    err
                });
            }

            return res.json({
                ok: true,
                globalConfig: globalConfigDB
            });
        });
    } else {
        // Si existe, lo devuelvo
        res.json({
            ok: true,
            globalConfig: globalConfigArray[0]
        });
    }
});


app.put('/globalConfig/:id', verifyToken, (req, res) => {

    let user = req.user;

    if (user.role !== 'ADMIN_ROLE') {
        return res.status(401).json({
            ok: false,
            message: `You don't have permission for this action`
        });
    }

    let id = req.params.id;
    let body = req.body; // _.pick(req.body, 'description'); // Undercore library

    GlobalConfig.findByIdAndUpdate(id, body, { new: true }, (err, globalConfigDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }



        res.json({
            ok: true,
            globalConfig: globalConfigDB
        });
    });
});


app.put('/globalConfig/restore/:id', verifyToken, (req, res) => {

    let user = req.user;

    if (user.role !== 'ADMIN_ROLE') {
        return res.status(401).json({
            ok: false,
            message: `You don't have permission for this action`
        });
    }

    let id = req.params.id;
    let body = new GlobalConfig(); // req.body; // _.pick(req.body, 'description'); // Undercore library

    body._id = id;

    GlobalConfig.findByIdAndUpdate(id, body, { new: true }, (err, globalConfigDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            globalConfig: globalConfigDB
        });
    });
});

module.exports = app;