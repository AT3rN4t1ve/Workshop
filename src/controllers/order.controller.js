const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/response');

const populate = [
  { path: 'product', select: 'name price stock imageUrl category' },
  { path: 'user', select: 'email firstName lastName' },
];

const visibleTo = (user) => (user.role === 'admin' ? {} : { user: user._id });

exports.getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find(visibleTo(req.user)).sort({ createdAt: -1 }).populate(populate);
  return ok(res, orders);
});

exports.getProductOrders = asyncHandler(async (req, res) => {
  const exists = await Product.exists({ _id: req.params.id });
  if (!exists) return fail(res, 400, 'product not found', null);

  const orders = await Order.find({ ...visibleTo(req.user), product: req.params.id })
    .sort({ createdAt: -1 })
    .populate(populate);
  return ok(res, orders);
});

function resolveOptions(product, selected) {
  if (selected === undefined || selected === null) selected = [];
  if (!Array.isArray(selected)) return { error: 'options must be an array' };

  const isText = (v) => typeof v === 'string' && v.length > 0;
  if (!selected.every((s) => s && isText(s.group) && isText(s.choice))) {
    return { error: 'each option must have group and choice' };
  }

  const groups = product.optionGroups || [];
  const unknown = selected.find((s) => !groups.some((g) => g.name === s.group));
  if (unknown) return { error: `invalid option: ${unknown.group}` };

  const options = [];
  for (const group of groups) {
    const picks = selected.filter((s) => s.group === group.name);
    if (group.isRequired && picks.length === 0) return { error: `option required: ${group.name}` };
    if (!group.isMultiple && picks.length > 1) return { error: `only one choice allowed: ${group.name}` };
    if (new Set(picks.map((p) => p.choice)).size !== picks.length) {
      return { error: `duplicate option: ${group.name}` };
    }
    for (const pick of picks) {
      const choice = group.choices.find((c) => c.name === pick.choice);
      if (!choice) return { error: `invalid option: ${group.name} - ${pick.choice}` };
      options.push({ group: group.name, choice: choice.name, price: choice.price });
    }
  }
  return { options };
}

exports.createProductOrder = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail(res, 400, 'quantity must be an integer greater than 0');
  }
  const note = req.body.note === undefined || req.body.note === null ? '' : req.body.note;
  if (typeof note !== 'string' || note.length > 200) {
    return fail(res, 400, 'note must be text up to 200 characters');
  }

  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 400, 'product not found', null);

  const { options, error } = resolveOptions(product, req.body.options);
  if (error) return fail(res, 400, error);

  const updated = await Product.findOneAndUpdate(
    { _id: product._id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
  if (!updated) {
    return fail(res, 400, `cannot create order: quantity exceeds stock (stock: ${product.stock})`);
  }

  try {
    const unitPrice = product.price + options.reduce((sum, option) => sum + option.price, 0);
    const order = await Order.create({
      product: updated._id,
      productName: updated.name,
      user: req.user._id,
      quantity,
      options,
      note,
      unitPrice,
      totalPrice: unitPrice * quantity,
    });
    await order.populate(populate);
    return created(res, order);
  } catch (err) {
    await Product.updateOne({ _id: updated._id }, { $inc: { stock: quantity } });
    throw err;
  }
});

const ALLOWED_FROM = {
  cooking: ['pending'],
  done: ['cooking'],
  delivered: ['done'],
  cancelled: ['pending', 'cooking'],
};

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const isAdmin = req.user.role === 'admin';
  if (typeof status !== 'string' || !ALLOWED_FROM[status]) return fail(res, 400, 'invalid status');
  if (!isAdmin && status !== 'cancelled') return fail(res, 401, 'forbidden: admin only');

  const scope = { _id: req.params.id, ...visibleTo(req.user) };
  const from = isAdmin ? ALLOWED_FROM[status] : ['pending'];

  const order = await Order.findOneAndUpdate({ ...scope, status: { $in: from } }, { status }, { new: true });
  if (!order) {
    const current = await Order.findOne(scope);
    if (!current) return fail(res, 400, 'order not found', null);
    return fail(res, 400, `cannot change status from ${current.status} to ${status}`);
  }

  if (status === 'cancelled') {
    await Product.updateOne({ _id: order.product }, { $inc: { stock: order.quantity } });
  }

  await order.populate(populate);
  return ok(res, order);
});
