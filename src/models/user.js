import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    // Define your other fields like email, username, password, etc.
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'USER' }, // Assuming you have roles like 'USER', 'ADMIN', etc.
    // Optionally include other fields like firstName, lastName, etc.
    lastLogin: Date,
}, { timestamps: true }); // This enables the createdAt and updatedAt fields

export const User = mongoose.model('User', userSchema);

// export default User;
