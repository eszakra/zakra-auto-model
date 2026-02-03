const crypto = require('crypto');

// Coinbase Commerce Webhook Handler
// URL: https://usereed.com/.netlify/functions/coinbase-webhook

const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verify webhook signature
function verifySignature(payload, signature) {
  if (!COINBASE_WEBHOOK_SECRET) {
    console.error('COINBASE_WEBHOOK_SECRET not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', COINBASE_WEBHOOK_SECRET);
  hmac.update(payload);
  const computedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

// Valid plan types
const VALID_PLANS = ['free', 'starter', 'creator', 'pro', 'studio'];

// Update user credits in Supabase
async function updateUserCredits(userId, credits, paymentMetadata) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase credentials not configured');
    return false;
  }

  try {
    // First, get current user credits
    const getUserResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}&select=credits`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });

    if (!getUserResponse.ok) {
      console.error('Failed to get current credits:', await getUserResponse.text());
      return false;
    }

    const userData = await getUserResponse.json();
    const currentCredits = userData[0]?.credits || 0;
    const newCredits = currentCredits + credits;

    // Validate and normalize plan type
    let planType = paymentMetadata.plan_name?.toLowerCase() || paymentMetadata.plan_id?.toLowerCase() || 'starter';
    if (!VALID_PLANS.includes(planType)) {
      console.warn(`Invalid plan type "${planType}", defaulting to "starter"`);
      planType = 'starter';
    }

    // Update user credits (ADD to existing, not replace)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        credits: newCredits,
        plan_type: planType,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Failed to update credits:', await response.text());
      return false;
    }

    // Log the transaction
    await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        amount: credits,
        type: 'purchase',
        description: `${paymentMetadata.plan_name || planType} plan subscription via Coinbase`,
        metadata: paymentMetadata
      })
    });

    console.log(`Updated user ${userId}: ${currentCredits} + ${credits} = ${newCredits} credits, plan: ${planType}`);
    return true;
  } catch (error) {
    console.error('Error updating credits:', error);
    return false;
  }
}

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const signature = event.headers['x-cc-webhook-signature'];
    const payload = event.body;

    // Verify signature (skip in development if secret not set)
    if (COINBASE_WEBHOOK_SECRET && signature) {
      if (!verifySignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' })
        };
      }
    }

    const webhookEvent = JSON.parse(payload);
    const eventType = webhookEvent.event?.type;
    const charge = webhookEvent.event?.data;

    console.log('Received webhook:', eventType);

    // Handle charge:confirmed event
    if (eventType === 'charge:confirmed') {
      const metadata = charge?.metadata || {};
      const userId = metadata.user_id;
      const credits = parseInt(metadata.credits) || 0;

      if (userId && credits > 0) {
        console.log(`Processing payment for user ${userId}: ${credits} credits`);

        const success = await updateUserCredits(userId, credits, metadata);

        if (success) {
          console.log('Credits updated successfully');
          return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Credits added' })
          };
        } else {
          console.error('Failed to update credits');
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update credits' })
          };
        }
      } else {
        console.error('Missing user_id or credits in metadata');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing metadata' })
        };
      }
    }

    // Handle other events
    if (eventType === 'charge:pending') {
      console.log('Payment pending:', charge?.code);
    } else if (eventType === 'charge:failed') {
      console.log('Payment failed:', charge?.code);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
