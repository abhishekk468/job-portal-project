const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  discount: { type: String },
  category: { type: String, required: true }, // e.g., 'MEN', 'WOMEN', 'KIDS'
  type: { type: String }, // e.g., 'recommended', 'chic', 'topBrand'
  image: { type: String, required: true },
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);
