// ============================================
// CLOUDINARY CONFIGURATION
// File: config/cloudinary.js
// ============================================

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shitblej-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = { upload, cloudinary };


// ============================================
// UPDATED PRODUCT ROUTES
// File: routes/products.js
// ============================================

const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts
} = require('../controllers/products');

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:id', getProduct);

// Protected routes
router.post('/', protect, upload.array('images', 5), createProduct);
router.put('/:id', protect, upload.array('images', 5), updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;


// ============================================
// UPDATED PRODUCT CONTROLLER
// File: controllers/products.js
// ============================================

const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { cloudinary } = require('../config/cloudinary');

// @desc    Create product
// @route   POST /api/v1/products/
// @access  Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  req.body.user = req.user.id;

  // Get image URLs from Cloudinary
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.path);
  } else {
    return next(new ErrorResponse('Please upload at least one image', 400));
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  // Check authorization
  if (product.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this product`,
        401
      )
    );
  }

  // Update images if new ones are uploaded
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.path);
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  // Check authorization
  if (product.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this product`,
        401
      )
    );
  }

  // Delete images from Cloudinary
  if (product.images && product.images.length > 0) {
    for (const imageUrl of product.images) {
      try {
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        const fullPublicId = `shitblej-products/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});


// ============================================
// ENVIRONMENT VARIABLES
// Add to your .env file
// ============================================

CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here


// ============================================
// INSTALL PACKAGES
// Run in your backend directory
// ============================================

// npm install cloudinary multer multer-storage-cloudinary
