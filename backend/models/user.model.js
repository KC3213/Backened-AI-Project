import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        minLength: [ 2, 'Name must be at least 2 characters long' ],
        maxLength: [ 50, 'Name must not be longer than 50 characters' ],
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minLength: [ 6, 'Email must be at least 6 characters long' ],
        maxLength: [ 50, 'Email must not be longer than 50 characters' ]
    },

    password: {
        type: String,
        select: false,
    },

    googleId: {
        type: String,
        default: '',
        trim: true,
    },

    authProvider: {
        type: String,
        enum: [ 'local', 'google' ],
        default: 'local',
    },

    avatar: {
        style: {
            type: String,
            default: 'adventurer',
            trim: true,
        },
        seed: {
            type: String,
            default: '',
            trim: true,
        },
        url: {
            type: String,
            default: '',
            trim: true,
        },
    }
})


userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

userSchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateJWT = function () {
    return jwt.sign(
        { _id: this._id, email: this.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}


const User = mongoose.model('user', userSchema);

export default User;
