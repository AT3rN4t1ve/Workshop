const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/response');

const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});
const FIELDS = ['name', 'description', 'category', 'imageUrl', 'price', 'stock', 'optionGroups'];

exports.getProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  return ok(res, products);
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 400, 'product not found', null);
  return ok(res, product);
});

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body, FIELDS));
  return created(res, product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS), {
    new: true,
    runValidators: true,
  });
  if (!product) return fail(res, 400, 'product not found', null);
  return ok(res, product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return fail(res, 400, 'product not found', null);
  return ok(res, product, 'deleted');
});
