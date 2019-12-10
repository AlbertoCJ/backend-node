const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('underscore');
const User = require('../models/user');

const app = express();

app.get('/user/:id', (req, res) => {
    let id = req.params.id;

    User.findById(id, (err, userDB) => {

        if (err) {
            return res.status(400).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            user: userDB
        });
    });


})

app.post('/user', (req, res) => {
    let body = req.body;

    let user = new User({
        name: body.name,
        mail: body.mail,
        password: bcrypt.hashSync(body.password, 10)
    });

    user.save((err, userDB) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            user: userDB
        });
    });
})

app.put('/user/:id', (req, res) => {

    let id = req.params.id;
    let body = _.pick(req.body, ['name', 'mail', 'state']); // Undercore library

    User.findByIdAndUpdate(id, body, { new: true, runValidators: true }, (err, userDB) => {

        if (err) {
            return res.status(400).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            user: userDB
        });
    });


})

app.delete('/user/:id', (req, res) => {
    let id = req.params.id;

    User.findByIdAndRemove(id, (err, userRemoved) => {

        if (err) {
            return res.status(400).json({
                ok: false,
                err
            });
        }

        if (userRemoved === null) {
            return res.status(400).json({
                ok: false,
                err: {
                    message: 'Usuario no encontrado'
                }
            });
        }

        res.json({
            ok: true,
            user: userRemoved
        });
    });
})

module.exports = app;