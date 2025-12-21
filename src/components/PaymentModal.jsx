import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentForm = ({ onSuccess, onCancel, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expressPaymentReady, setExpressPaymentReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        onSuccess(paymentIntent);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };

  // Handle express payment (Link, Apple Pay, Google Pay, PayPal)
  const handleExpressPayment = async (event) => {
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message);
        setProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (err) {
      console.error('Express payment error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Express Payment Methods - Link, Apple Pay, Google Pay, PayPal */}
      <div>
        <ExpressCheckoutElement
          onConfirm={handleExpressPayment}
          onReady={() => setExpressPaymentReady(true)}
          options={{
            buttonType: {
              applePay: 'buy',
              googlePay: 'buy',
              paypal: 'buynow',
            },
          }}
        />
      </div>

      {/* Divider */}
      {expressPaymentReady && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-sm text-gray-500 font-medium">or pay with card</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>
      )}

      {/* Regular Payment Element - Card, Bank */}
      <PaymentElement />

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
        >
          {errorMessage}
        </motion.div>
      )}

      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          disabled={processing}
        >
          Cancel
        </motion.button>
        <motion.button
          type="submit"
          disabled={!stripe || processing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </motion.button>
      </div>
    </form>
  );
};

const PaymentModal = ({ isOpen, onClose, onSuccess, clientSecret, amount }) => {
  if (!clientSecret) return null;

  const options = {
    clientSecret,
    locale: 'en', // Force English language
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#14b8a6',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '12px',
        spacingUnit: '4px',
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8"
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-3xl font-bold text-navy mb-2">Secure Payment</h2>
              <p className="text-gray-600">Unlock your photos in full quality</p>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-teal/5 to-cyan/5 border border-teal/15 rounded-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📸</span>
                  <span className="text-gray-700 font-medium">Total</span>
                </div>
                <span className="text-2xl font-bold text-teal">${amount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">One-time payment • Instant access</p>
            </div>

            <Elements stripe={stripePromise} options={options}>
              <PaymentForm onSuccess={onSuccess} onCancel={onClose} amount={amount} />
            </Elements>

            <div className="mt-6 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span>🔐</span>
                <span>Secured by <span className="font-semibold">Stripe</span></span>
              </div>
              <p className="text-xs text-gray-400">
                Your payment information is encrypted and secure
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
