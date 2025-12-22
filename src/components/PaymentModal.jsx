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

      {/* Payment Element with Card Icons */}
      <div className="relative">
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
        {/* Card Brand Icons - Bottom Right */}
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <svg viewBox="0 0 48 32" className="h-4 w-auto opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.28 11.36h-3.24l-2.02 9.36h3.24l2.02-9.36zM31.6 17.12c0 1.84-2.24 1.84-2.24 1.84s-1.6-.04-2.24-.48l-.32 1.84s1.2.44 2.76.44c1.56 0 4.04-.64 4.04-3.68 0-2.88-3.96-3.04-3.96-4.4 0-1.36 3.4-1.12 3.4-1.12s1.16.16 1.64.32l.32-1.8s-.96-.36-2.32-.36c-1.36 0-3.92.76-3.92 3.64 0 2.88 3.84 3.12 3.84 4.76zm7.08 3.6h2.88l-2.52-9.36h-2.64c-.6 0-.96.36-1.2.84l-4.24 8.52h3.44l.68-1.88h4.2l.4 1.88zm-3.64-4.48l1.72-4.76.96 4.76h-2.68zm-14.6-4.88l-3.2 6.88-.36-1.72s-1.04-3.56-4.32-4.4l2.92 7.6h3.48l5.16-8.36h-3.68z" fill="#1434CB"/>
          </svg>
          <svg viewBox="0 0 48 32" className="h-4 w-auto opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="16" r="7" fill="#EB001B"/>
            <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
            <path d="M24 11a6.98 6.98 0 00-2 5 6.98 6.98 0 002 5 6.98 6.98 0 002-5 6.98 6.98 0 00-2-5z" fill="#FF5F00"/>
          </svg>
          <svg viewBox="0 0 48 32" className="h-4 w-auto opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="10" width="32" height="12" rx="1" fill="#006FCF"/>
            <text x="24" y="19" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Arial">AMEX</text>
          </svg>
          <svg viewBox="0 0 48 32" className="h-4 w-auto opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="10" width="32" height="12" rx="1" fill="#FF6000"/>
            <circle cx="35" cy="16" r="4" fill="#F7981D"/>
          </svg>
        </div>
      </div>

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
