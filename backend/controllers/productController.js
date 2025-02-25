import catchAsyncErrors from "../middleware/catchAsyncErrors.js";
import Product from "../models/productModel.js";
import ApiFeature from "../utils/apiFeature.js";
import { successHandler, notFoundHandler } from "../utils/responseHandler.js";

// Create a new product -- admin only
const createProduct = catchAsyncErrors(async (req, res) => {
  req.body.user = req.user.id;
  const product = await Product.create(req.body);
  successHandler(res, 201, "Product created successfully", product);
});

// Update a product -- admin only
const updateProduct = catchAsyncErrors(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  notFoundHandler(product, "Product not found");
  successHandler(res, 200, "Product updated successfully", product);
});

// Delete a product -- admin only
const deleteProduct = catchAsyncErrors(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  notFoundHandler(product, "Product not found");
  successHandler(res, 200, "Product deleted successfully", product);
});

// Get all products
const getAllProducts = catchAsyncErrors(async (req, res) => {
  const resultPerPage = 5;
  const apiFeature = new ApiFeature(Product.find(), req.query)
    .search()
    .filter()
    .pagination(resultPerPage);
  const products = await apiFeature.query;
  const totalProducts = await Product.countDocuments();

  successHandler(res, 200, "All Products fetched successfully", {
    totalProducts,
    products,
  });
});

// Get a single product
const getSingleProduct = catchAsyncErrors(async (req, res) => {
  const product = await Product.findById(req.params.id);
  notFoundHandler(product, "Product not found");
  successHandler(res, 200, "Single Product fetched successfully", product);
});

// Create new review or update review
const createProductReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  const newReview = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const product = await Product.findById(productId);

  notFoundHandler(product, "Product not found");

  const existingReview = product.reviews.find(
    (review) => review.user.toString() === req.user._id.toString()
  );

  if (existingReview) {
    // Update existing review
    existingReview.rating = rating;
    existingReview.comment = comment;
  } else {
    // Add new review
    product.reviews.push(newReview);
    product.numOfReviews = product.reviews.length;
  }

  const reviewCount = product.reviews.length;
  const totalRatings = product.reviews.reduce(
    (total, review) => total + review.rating,
    0
  );
  product.ratings = totalRatings / reviewCount;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

// Get all reviews of a product
const getProductReviews = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.id);
  successHandler(res, 200, "Reviews fetched successfully", product.reviews);
});

// Delete a review
const deleteProductReview = catchAsyncErrors(async (req, res, next) => {
  const { productId, id } = req.query;
  const product = await Product.findById(productId);
  notFoundHandler(product, "Product not found");
  const updatedReviews = product.reviews.filter(
    (rev) => rev._id.toString() !== id.toString()
  );

  // Update the review count and ratings
  const reviewCount = updatedReviews.length;
  const totalRatings = updatedReviews.reduce(
    (total, review) => total + review.rating,
    0
  );
  const ratings = reviewCount > 0 ? totalRatings / reviewCount : 0;

  // Update the product with the modified reviews, ratings, and review count
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      reviews: updatedReviews,
      ratings,
      reviewCount,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  // Return the updated product and success message
  successHandler(res, 200, "Review deleted successfully", updatedProduct);
});

export {
  getAllProducts,
  getSingleProduct,
  createProduct,
  deleteProduct,
  updateProduct,
  createProductReview,
  getProductReviews,
  deleteProductReview,
};
