const jwt = require('jsonwebtoken');

// Verify token
let verifyToken = (req, res, next) => {
    let token = req.get('token');

    jwt.verify(token, process.env.SEED, (err, decoded) => {
        if (err) {
            return res.status(401).json({ // TODO: Avisar token caducado y redireccionar al login
                ok: false,
                err
            });
        }

        req.user = decoded.user;
        next();
    });
};

module.exports = {
    verifyToken
}