const mongoose = require('mongoose');

const STATUSES = ['pending', 'cooking', 'done', 'delivered', 'cancelled'];

const orderSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    options: {
      type: [
        new mongoose.Schema(
          {
            group: { type: String, required: true },
            choice: { type: String, required: true },
            price: { type: Number, min: 0, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
