const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('underscore');
const User = require('../models/appDB/user');
const { verifyToken } = require('../middlewares/authentication');

const app = express();

app.get('/user', verifyToken, (req, res) => {

    let page = req.query.page || 1;
    let limit = req.query.limit || 1;
    let nameSearch = req.query.nameSearch || '';
    let emailSearch = req.query.emailSearch || '';

    if (limit > 20) limit = 20
    if (limit < 1) limit = 1

    const options = {
        page,
        limit,
        sort: { role: 'asc' }
    };

    User.paginate({ name: { $regex: nameSearch, $options: 'ix' }, email: { $regex: emailSearch, $options: 'ix' } }, options, (err, usersDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            users: usersDB
        });

    });

});

app.get('/user/:id', verifyToken, (req, res) => {
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
    let body = _.pick(req.body, ['name', 'email', 'password', 'state']); // Undercore library

    let user = new User({
        name: body.name,
        email: body.email,
        password: bcrypt.hashSync(body.password, 10),
        state: body.state
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

app.put('/user/:id', verifyToken, (req, res) => {

    let id = req.params.id;
    let body = _.pick(req.body, ['name', 'email', 'state']); // Undercore library 

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

app.put('/userPass/:id', verifyToken, (req, res) => {

    let id = req.params.id;
    let pass = bcrypt.hashSync(req.body.password, 10);
    // let body = _.pick(req.body, ['name', 'email', 'state']); // Undercore library

    User.findByIdAndUpdate(id, { password: pass }, { new: true }, (err, userDB) => {

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

// app.put('/userState/:id', verifyToken, (req, res) => {

//     let id = req.params.id;
//     let state = req.body.state;
//     // let body = _.pick(req.body, ['name', 'email', 'state']); // Undercore library

//     User.findByIdAndUpdate(id, { state }, { new: true }, (err, userDB) => {

//         if (err) {
//             return res.status(400).json({
//                 ok: false,
//                 err
//             });
//         }

//         res.json({
//             ok: true,
//             user: userDB
//         });
//     });
// })

app.delete('/user/:id', verifyToken, (req, res) => {
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