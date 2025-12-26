import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestEmail() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testCodeId, setTestCodeId] = useState('');

  const testResendAPI = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-resend');

      if (error) {
        setResult({ error: error.message });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testCodeId) {
      setResult({ error: 'Please enter a code or code ID' });
      return;
    }

    setLoading(true);
    try {
      // First, try to get the code ID by code (if it's a 6-char code)
      let actualCodeId = testCodeId;

      if (testCodeId.length === 6) {
        // It's a code, not a UUID - look up the ID
        const { data: codeData, error: lookupError } = await supabase
          .from('photo_codes')
          .select('id, customer_email')
          .eq('code', testCodeId.toUpperCase())
          .single();

        if (lookupError || !codeData) {
          setResult({ error: `Code ${testCodeId} not found` });
          setLoading(false);
          return;
        }

        actualCodeId = codeData.id;
        console.log('Found code:', codeData);
      }

      // Now send the email
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          codeId: actualCodeId,
          photoCount: 1,
        },
      });

      if (error) {
        setResult({ error: error.message });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>Resend API Test</h1>

      <div style={{ marginBottom: '40px' }}>
        <h2>1. Test Resend API Key</h2>
        <button
          onClick={testResendAPI}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '20px'
          }}
        >
          {loading ? 'Testing...' : 'Test Resend API'}
        </button>
      </div>

      <div style={{ marginBottom: '40px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
        <h2>2. Send Test Email to Code</h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          Enter a 6-digit code (e.g., ABC123) or UUID that has customer_email = joon0zo1022@gmail.com
        </p>
        <input
          type="text"
          value={testCodeId}
          onChange={(e) => setTestCodeId(e.target.value)}
          placeholder="Enter 6-digit code (e.g., ABC123)"
          style={{
            padding: '12px',
            fontSize: '14px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            width: '400px',
            marginRight: '10px',
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={sendTestEmail}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Sending...' : 'Send Email'}
        </button>
      </div>

      {result && (
        <pre style={{
          background: '#f3f4f6',
          padding: '20px',
          borderRadius: '8px',
          overflow: 'auto'
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <div style={{ marginTop: '40px', fontSize: '14px', color: '#666' }}>
        <h3>Expected Results:</h3>
        <ul>
          <li>✅ <code>hasKey: true</code> - API key is configured</li>
          <li>✅ <code>resendStatus: 422</code> - API key works (test email rejected is normal)</li>
          <li>❌ <code>hasKey: false</code> - API key NOT configured</li>
          <li>❌ <code>resendStatus: 401</code> - Invalid API key</li>
        </ul>
      </div>
    </div>
  );
}
