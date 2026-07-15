const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  size: { type: String },
  color: { type: String },
  priceOffset: { type: Number, default: 0 },
  stock: { type: Number, required: true, default: 0 }
});

const ProductSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Explicitly String type to support UUIDs
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  description: { type: String, trim: true },
  images: [{ type: String }],
  isFeatured: { type: Boolean, default: false, index: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  // Flexible schema for attributes (size, weight, brand, color, custom attributes etc.)
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  variants: [VariantSchema]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.productId = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Virtual getter to map the primary image for the frontend
ProductSchema.virtual('image').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : '';
});

module.exports = mongoose.model('Product', ProductSchema);
