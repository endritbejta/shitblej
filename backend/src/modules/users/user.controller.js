const asyncHandler = require("../../middleware/async");
const userService = require("./user.service");

// @desc    Register a new user
// @route   POST /api/v1/users/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res) => {
  const { token, user } = await userService.register(req.body);
  res.status(201).json({ success: true, token, data: user });
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/v1/users/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res) => {
  const { token, user } = await userService.login(req.body);
  res.status(200).json({ success: true, token, data: user });
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private (Owner or Admin)
exports.getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({ success: true, data: user });
});

// @desc    Update user details
// @route   PUT /api/v1/users/:id
// @access  Private (Owner or Admin)
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser({
    id: req.params.id,
    updates: req.body,
    imagePath: req.file ? req.file.path : undefined,
  });

  res.status(200).json({ success: true, data: user });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.status(200).json({
    success: true,
    data: {},
    message: "User deleted successfully",
  });
});
