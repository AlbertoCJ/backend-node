const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const appDB = require('../../connectionsDB').appDB;

let Schema = mongoose.Schema;

let rolesValidos = {
    values: ['ADMIN_ROLE', 'USER_ROLE'],
    message: '{VALUE} no es un rol válido'
};

let userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre es necesaio']
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'El correo es necesario']
    },
    sendEmail: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria']
    },
    state: {
        type: Boolean,
        default: true
    },
    dateCreation: {
        type: Date,
        default: new Date()
    },
    role: {
        type: String,
        default: 'USER_ROLE',
        enum: rolesValidos
    },
    language: {
        type: String,
        default: 'es'
    }
});

// Delete field password
userSchema.methods.toJSON = function() {
    let user = this;
    let userObject = user.toObject();
    delete userObject.password;
    return userObject;
}

userSchema.plugin(mongoosePaginate);

module.exports = appDB.model('User', userSchema);