const Razorpay = require('razorpay');

let razorpayInstance = null;

function getRazorpayClient() {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';

    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayInstance;
}

module.exports = {
  getRazorpayClient,
};
