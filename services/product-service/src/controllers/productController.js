const Product = require('../models/Product');
const { getRedisClient } = require('../config/db');
const { getPresignedUploadUrl } = require('../services/s3Service');
const { publishProductCreated, publishProductUpdated } = require('../services/eventService');

// Redis cache keys helpers
const getProductDetailKey = (id) => `product:detail:${id}`;
const getProductFeaturedKey = () => 'product:featured';
const CACHE_TTL = 600; // 10 minutes

// 1. Get Products list (with cursor-based or page-based pagination, filters, and sorting)
const getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, minRating, inStock, limit = 10, cursor, page, sort } = req.query;
    
    const query = {};
    if (category) query.category = category;
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (minRating) {
      query.averageRating = { $gte: Number(minRating) };
    }
    
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Determine sorting criteria
    let sortQuery = { _id: 1 }; // default sort
    if (sort === 'price_asc') {
      sortQuery = { price: 1, _id: 1 };
    } else if (sort === 'price_desc') {
      sortQuery = { price: -1, _id: 1 };
    } else if (sort === 'rating_desc') {
      sortQuery = { averageRating: -1, _id: 1 };
    } else if (sort === 'newest') {
      sortQuery = { createdAt: -1, _id: 1 };
    }

    const pageSize = Number(limit);

    // If page parameter is supplied, use page-based pagination
    if (page) {
      const currentPage = Math.max(1, Number(page));
      const totalItems = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalItems / pageSize);
      const skip = (currentPage - 1) * pageSize;

      const products = await Product.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(pageSize);

      return res.json({
        products,
        currentPage,
        totalPages,
        totalItems,
        hasNextPage: currentPage < totalPages
      });
    }

    // Default: Cursor-based pagination (fully backward compatible)
    if (cursor) {
      query._id = { $gt: cursor };
    }

    // Find products with cursor pagination limit + 1
    const products = await Product.find(query)
      .sort(sortQuery)
      .limit(pageSize + 1);

    const hasNextPage = products.length > pageSize;
    if (hasNextPage) {
      products.pop(); // Remove the extra item
    }

    const nextCursor = hasNextPage ? products[products.length - 1]._id.toString() : null;

    res.json({
      products,
      nextCursor,
      hasNextPage
    });
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 2. Get Single Product (cached)
const getProductById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = getProductDetailKey(id);

  try {
    const redis = getRedisClient();
    const cachedProduct = await redis.get(cacheKey);

    if (cachedProduct) {
      return res.json(JSON.parse(cachedProduct));
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    }

    await redis.set(cacheKey, JSON.stringify(product), { EX: CACHE_TTL });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 3. Get Featured Products (cached)
const getFeaturedProducts = async (req, res) => {
  const cacheKey = getProductFeaturedKey();

  try {
    const redis = getRedisClient();
    const cachedFeatured = await redis.get(cacheKey);

    if (cachedFeatured) {
      return res.json(JSON.parse(cachedFeatured));
    }

    const featured = await Product.find({ isFeatured: true }).limit(5);
    await redis.set(cacheKey, JSON.stringify(featured), { EX: CACHE_TTL });
    res.json(featured);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 4. Get Products by Category
const getProductsByCategory = async (req, res) => {
  const { cat } = req.params;
  try {
    const products = await Product.find({ category: cat });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 5. Create Product
const createProduct = async (req, res) => {
  try {
    const { name, category, price, stock, description, images, attributes, variants, isFeatured } = req.body;
    
    const product = new Product({
      name,
      category,
      price,
      stock,
      description,
      images,
      attributes,
      variants,
      isFeatured
    });

    const savedProduct = await product.save();
    
    // Invalidate featured list cache if new featured product created
    if (isFeatured) {
      const redis = getRedisClient();
      await redis.del(getProductFeaturedKey());
    }

    // Publish Kafka event
    await publishProductCreated(savedProduct);

    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ error: 'BAD_REQUEST', message: error.message });
  }
};

// 6. Update Product
const updateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    }

    // Invalidate caches
    const redis = getRedisClient();
    await redis.del(getProductDetailKey(id));
    await redis.del(getProductFeaturedKey());

    // Detect changed fields to publish to Kafka
    const changedFields = Object.keys(req.body);
    await publishProductUpdated(id, changedFields);

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'BAD_REQUEST', message: error.message });
  }
};

// 7. Delete Product
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    }

    // Invalidate caches
    const redis = getRedisClient();
    await redis.del(getProductDetailKey(id));
    await redis.del(getProductFeaturedKey());

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 8. Generate Image Upload Link
const getUploadLink = async (req, res) => {
  const { fileName, fileType } = req.query;
  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'fileName and fileType query params are required.' });
  }

  try {
    const preSignedInfo = await getPresignedUploadUrl(fileName, fileType);
    res.json(preSignedInfo);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getUploadLink
};
