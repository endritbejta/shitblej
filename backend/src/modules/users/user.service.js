const bcrypt = require("bcryptjs");
const User = require("./user.model");
const ErrorResponse = require("../../shared/utils/errorResponse");

// Two response shapes, because "who is this user" has two different answers
// depending on who is asking.
//
// toOwnUser  - the caller IS this user (or an admin): contact details included.
// toPublicProfile - anyone else: identity only. Email and phone are contact
//   details, and this is a marketplace that deliberately keeps negotiation
//   on-platform (see shared/utils/contactFilter.js). Handing every logged-in
//   user any seller's email would route straight around that.
const toOwnUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  image: user.image,
  createdAt: user.createdAt,
});

const toPublicProfile = (user) => ({
  _id: user._id,
  name: user.name,
  image: user.image,
  createdAt: user.createdAt,
});

// @desc Register a new user and return an auth token.
exports.register = async ({ name, email, phone, password }) => {
  const exists = await User.findOne({ email });
  if (exists) {
    throw new ErrorResponse("User already exists", 400);
  }

  // Password hashing is handled by the User model's pre-save hook.
  const user = await User.create({ name, email, phone, password });

  return { token: user.getSignedJwtToken(), user: toOwnUser(user) };
};

// A valid bcrypt hash of a value nobody can supply. Compared against when the
// email does not exist so that a miss costs the same time as a wrong
// password - otherwise response latency alone reveals which emails are
// registered, which is exactly what the rate limiter is there to prevent.
const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

// @desc Authenticate a user and return an auth token.
exports.login = async ({ email, password }) => {
  // Password has `select: false`, so it must be explicitly selected.
  const user = await User.findOne({ email }).select("+password");

  // Always run one bcrypt comparison, present or not.
  const passwordMatches = user
    ? await user.matchPassword(password)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new ErrorResponse("Invalid credentials", 401);
  }

  return { token: user.getSignedJwtToken(), user: toOwnUser(user) };
};

// @desc List all users (admin). An empty collection is an empty list, not an
// error - a 404 here would make "no users yet" indistinguishable from a bad
// route to every client.
exports.listUsers = async () => {
  return User.find({}).select("-password");
};

// @desc Get a single user by id, shaped for whoever is asking. `requester` is
// the authenticated user; contact details are returned only to the owner or
// an admin.
exports.getUserById = async (id, requester) => {
  const user = await User.findById(id).select("-password");
  if (!user) {
    throw new ErrorResponse(`User not found with id of ${id}`, 404);
  }

  const isSelf = requester && String(requester.id) === String(user._id);
  const isAdmin = requester && requester.role === "admin";

  return isSelf || isAdmin ? toOwnUser(user) : toPublicProfile(user);
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

  // Only the owner or an admin reaches this route, so the full shape is right.
  return toOwnUser(user);
};

// @desc Delete a user (admin).
exports.deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new ErrorResponse(`User not found with id of ${id}`, 404);
  }
};
