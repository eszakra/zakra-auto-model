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

// Create a service purchase record in Supabase
async function createServicePurchase(userId, metadata, chargeCode) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase credentials not configured');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/service_purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: userId,
        service_id: metadata.service_id,
        service_name: metadata.service_name,
        service_category: metadata.service_category,
        amount: parseFloat(metadata.amount) || 0,
        currency: 'USD',
        status: metadata.service_category === 'workflow' ? 'delivered' : 'processing',
        coinbase_charge_code: chargeCode,
        metadata: metadata
      })
    });

    if (!response.ok) {
      console.error('Failed to create service purchase:', await response.text());
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
        amount: 0,
        type: 'purchase',
        description: `Service purchase: ${metadata.service_name} (${metadata.service_category})`,
        metadata: metadata
      })
    });

    console.log(`Created service purchase for user ${userId}: ${metadata.service_name}`);
    return true;
  } catch (error) {
    console.error('Error creating service purchase:', error);
    return false;
  }
}

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

    // SECURITY: Always verify webhook signature - NEVER skip
    if (!COINBASE_WEBHOOK_SECRET) {
      console.error('CRITICAL: COINBASE_WEBHOOK_SECRET not configured - rejecting webhook');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }

    if (!signature || !verifySignature(payload, signature)) {
      console.error('Invalid or missing webhook signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    const webhookEvent = JSON.parse(payload);
    const eventType = webhookEvent.event?.type;
    const charge = webhookEvent.event?.data;

    console.log('Received webhook:', eventType);

    // Handle charge:confirmed event
    if (eventType === 'charge:confirmed') {
      const metadata = charge?.metadata || {};
      const userId = metadata.user_id;
      const chargeCode = charge?.code;

      if (!userId) {
        console.error('Missing user_id in metadata');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing user_id' })
        };
      }

      // Route: service purchase vs subscription
      if (metadata.purchase_type === 'service') {
        console.log(`Processing service purchase for user ${userId}: ${metadata.service_name}`);

        const success = await createServicePurchase(userId, metadata, chargeCode);

        if (success) {
          console.log('Service purchase created successfully');
          return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Service purchase recorded' })
          };
        } else {
          console.error('Failed to create service purchase');
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create service purchase' })
          };
        }
      } else {
        // Subscription / credits purchase
        const credits = parseInt(metadata.credits) || 0;

        if (credits > 0) {
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
          console.error('Missing credits in metadata');
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing credits' })
          };
        }
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
