const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // ⬅️ REQUIRED FOR HASHING

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    phone: {
      type: String,
      unique: true,
      match: [/^\+383\d{8,9}$/, "Please enter a valid Kosovo phone number"],
    },
    password: {
      type: String,
      minlength: 6,
      match: [
        /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/,
        "Password must be at least 6 characters and contain at least one letter and one number",
      ],
      select: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
  },
  { timestamps: true }
);

// ------------------------------------------------------------------
// 🔑 Mongoose Pre-Save Hook for Password Hashing
// ------------------------------------------------------------------

UserSchema.pre('save', async function (next) {
  // 1. Check if the password field was modified. 
  // This prevents re-hashing an already hashed password when updating other fields (like 'name').
  if (!this.isModified('password')) {
    return next();
  }

  // 2. Hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

module.exports = mongoose.model("User", UserSchema);