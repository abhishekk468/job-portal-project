const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products (optionally filtered by category)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) {
      query.category = category.toUpperCase();
    }
    
    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to create a newly seeded product (for testing out the frontend)
router.post('/', async (req, res) => {
  const { name, description, price, originalPrice, discount, category, type, image, inStock } = req.body;
  const product = new Product({
    name, description, price, originalPrice, discount, category, type, image, inStock
  });

  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST bulk insert (great for seeding our initial shop products)
router.post('/seed', async (req, res) => {
  try {
    await Product.deleteMany({}); // Clears current collection
    const products = await Product.insertMany(req.body);
    res.status(201).json({ message: 'Seed successful', count: products.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
