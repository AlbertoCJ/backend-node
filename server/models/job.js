const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

let Schema = mongoose.Schema;

let jobSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: [true, 'La descripcion es necesaria']
    },
    description: {
        type: String
    },
    date_creation: {
        type: Date,
        default: Date.now
    },
    jobItems: {
        type: Array
    }
});

jobSchema.plugin(uniqueValidator, { message: '{PATH} debe ser único' });

module.exports = mongoose.model('Job', jobSchema);