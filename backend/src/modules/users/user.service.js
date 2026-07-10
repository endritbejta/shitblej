const User = require("./user.model");
const ErrorResponse = require("../../shared/utils/errorResponse");

// Shape the public view of a user (never leak the password hash).
const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  image: user.image,
});

// @desc Register a new user and return an auth token.
exports.register = async ({ name, email, phone, password }) => {
  const exists = await User.findOne({ email });
  if (exists) {
    throw new ErrorResponse("User already exists", 400);
  }

  // Password hashing is handled by the User model's pre-save hook.
  const user = await User.create({ name, email, phone, password });

  return { token: user.getSignedJwtToken(), user: toPublicUser(user) };
};

// @desc Authenticate a user and return an auth token.
exports.login = async ({ email, password }) => {
  // Password has `select: false`, so it must be explicitly selected.
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ErrorResponse("Invalid credentials", 401);
  }

  return { token: user.getSignedJwtToken(), user: toPublicUser(user) };
};

// @desc List all users (admin).
exports.listUsers = async () => {
  const users = await User.find({}).select("-password");
  if (!users.length) {
    throw new ErrorResponse("No users found", 404);
  }
  return users;
};

// @desc Get a single user by id.
exports.getUserById = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) {
    throw new ErrorResponse(`User not found with id of ${id}`, 404);
  }
  return user;
};

// @desc Update a user's own profile fields (and optional avatar).
exports.updateUser = async ({ id, updates = {}, imagePath }) => {
  const updateData = { ...updates };

  // Password changes must go through a dedicated flow, never this route.
  if (updateData.password) {
    throw new ErrorResponse("Use a dedicated route for password updates", 400);
  }

  if (imagePath) {
    updateData.image = imagePath;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ErrorResponse("No data provided for update", 400);
  }

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
    select: "-password",
  });

  if (!user) {
    throw new ErrorResponse(`User not found with id of ${id}`, 404);
  }

  return user;
};

// @desc Delete a user (admin).
exports.deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new ErrorResponse(`User not found with id of ${id}`, 404);
  }
};
