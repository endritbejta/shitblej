# 🖼️ Cloudinary Image Upload Setup Guide

This guide will help you set up Cloudinary for handling product image uploads in your backend.

## 📋 Prerequisites

- Node.js backend server
- Cloudinary account (free tier available)

---

## 🚀 Step 1: Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. After login, go to your **Dashboard**
4. Copy these credentials:
   - Cloud Name
   - API Key
   - API Secret

---

## 📦 Step 2: Install Required Packages

Navigate to your backend directory and install:

```bash
npm install cloudinary multer multer-storage-cloudinary
```

**Package purposes:**

- `cloudinary` - Cloudinary SDK for Node.js
- `multer` - Middleware for handling multipart/form-data (file uploads)
- `multer-storage-cloudinary` - Cloudinary storage engine for Multer

---

## 🔐 Step 3: Add Environment Variables

Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**⚠️ IMPORTANT:** Never commit your `.env` file to Git!

---

## ⚙️ Step 4: Create Cloudinary Configuration

Create a new file: `config/cloudinary.js`

```javascript
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shitblej-products", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [
      { width: 1200, height: 1200, crop: "limit" }, // Max dimensions
      { quality: "auto" }, // Automatic quality optimization
      { fetch_format: "auto" }, // Automatic format selection (WebP when supported)
    ],
  },
});

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

module.exports = { upload, cloudinary };
```

---

## 🛣️ Step 5: Update Product Routes

Update your `routes/products.js`:

```javascript
const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinary");
const { protect } = require("../middleware/auth"); // Your auth middleware
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products");

// Public routes
router.get("/", getProducts);
router.get("/:id", getProduct);

// Protected routes - require authentication
router.post(
  "/",
  protect,
  upload.array("images", 5), // Accept up to 5 images
  createProduct
);

router.put("/:id", protect, upload.array("images", 5), updateProduct);

router.delete("/:id", protect, deleteProduct);

module.exports = router;
```

---

## 🎮 Step 6: Update Product Controller

Update your `controllers/products.js`:

```javascript
const Product = require("../models/Product");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Create product
// @route   POST /api/v1/products/
// @access  Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Get image URLs from uploaded files
  // Cloudinary automatically uploads and returns URLs in req.files
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map((file) => file.path);
  } else {
    return next(new ErrorResponse("Please upload at least one image", 400));
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

  // Make sure user is product owner
  if (product.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this product`,
        401
      )
    );
  }

  // If new images are uploaded, update the images array
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map((file) => file.path);
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
```

---

## 🗑️ Step 7: Delete Images from Cloudinary (Optional)

When deleting a product, you should also delete its images from Cloudinary:

```javascript
const { cloudinary } = require("../config/cloudinary");

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

  // Make sure user is product owner
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
      // Extract public_id from Cloudinary URL
      const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
      const fullPublicId = `shitblej-products/${publicId}`;

      try {
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (err) {
        console.error("Error deleting image from Cloudinary:", err);
      }
    }
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
```

---

## ✅ Step 8: Test the Setup

1. **Start your backend server:**

   ```bash
   npm run dev
   ```

2. **Test with the frontend:**

   - Go to `/sell` page
   - Fill in product details
   - Upload images
   - Submit the form

3. **Verify in Cloudinary:**
   - Log into your Cloudinary dashboard
   - Go to Media Library
   - Check the `shitblej-products` folder
   - Your uploaded images should be there!

---

## 🎯 What Happens When You Upload

1. User selects images in the frontend
2. Frontend sends FormData with images to `/api/v1/products`
3. Multer middleware intercepts the request
4. Cloudinary storage engine uploads images to Cloudinary
5. Cloudinary returns URLs for each uploaded image
6. URLs are saved in `req.files[].path`
7. Controller saves these URLs to the database
8. Product is created with image URLs

---

## 🔍 Troubleshooting

### Images not uploading?

- Check your Cloudinary credentials in `.env`
- Verify the folder name in `cloudinary.js`
- Check file size limits (default 5MB)
- Ensure file format is allowed

### Getting CORS errors?

- Add CORS middleware to your backend:
  ```javascript
  const cors = require("cors");
  app.use(cors());
  ```

### Images too large?

- Adjust transformation settings in `cloudinary.js`
- Reduce `fileSize` limit in multer config

---

## 🎨 Advanced Features

### Generate Thumbnails

```javascript
params: {
  folder: 'shitblej-products',
  transformation: [
    { width: 300, height: 300, crop: 'thumb', gravity: 'face' }
  ]
}
```

### Add Watermark

```javascript
transformation: [{ overlay: "watermark", gravity: "south_east", opacity: 50 }];
```

### Multiple Sizes

Create different versions of images for different use cases (thumbnail, medium, large).

---

## 📊 Cloudinary Free Tier Limits

- **Storage:** 25 GB
- **Bandwidth:** 25 GB/month
- **Transformations:** 25,000/month
- **Images:** Unlimited

Perfect for starting out! Upgrade when you need more.

---

## 🎉 You're Done!

Your backend is now configured to handle image uploads with Cloudinary. The frontend is already set up to send images properly using FormData.

**Next Steps:**

1. Test the upload flow
2. Monitor your Cloudinary usage
3. Customize transformations as needed
4. Consider implementing image deletion when products are removed

---

## 📚 Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Node.js SDK Guide](https://cloudinary.com/documentation/node_integration)

---

**Need Help?** Check the Cloudinary dashboard for upload logs and errors!
