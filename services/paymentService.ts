/**
 * Payment Service - Crypto Payment Verification
 * Uses TronGrid API to verify USDT TRC-20 payments
 */

import { supabase } from './supabaseClient';

const WALLET_ADDRESS = 'TW4e2GLCRnwyBrpYE55CGgqNhifWNn1MAL';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT TRC-20 contract
const TRONGRID_API = 'https://api.trongrid.io';

export interface Payment {
  id: string;
  user_id: string;
  plan_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  wallet_address: string;
  tx_hash: string | null;
  status: 'pending' | 'waiting' | 'confirmed' | 'expired' | 'failed';
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  credits_per_month: number;
  features: any;
  is_active: boolean;
}

/**
 * Generate unique payment ID
 */
export function generatePaymentId(): string {
  return `REED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Create a new payment record
 */
export async function createPayment(
  userId: string,
  planId: string,
  amount: number
): Promise<Payment | null> {
  const paymentId = generatePaymentId();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      plan_id: planId,
      payment_id: paymentId,
      amount: amount,
      currency: 'USDT',
      wallet_address: WALLET_ADDRESS,
      status: 'waiting',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    return null;
  }

  return data;
}

/**
 * Get pending payments for a user
 */
export async function getPendingPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'waiting')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return data || [];
}

/**
 * Check TronGrid for USDT transfers to our wallet
 */
export async function checkTronTransactions(
  sinceTimestamp: number
): Promise<any[]> {
  try {
    // Get TRC-20 transfers to our wallet
    const url = `${TRONGRID_API}/v1/accounts/${WALLET_ADDRESS}/transactions/trc20?only_to=true&contract_address=${USDT_CONTRACT}&min_timestamp=${sinceTimestamp}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`TronGrid API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error checking Tron transactions:', error);
    return [];
  }
}

/**
 * Verify a specific payment by checking blockchain
 */
export async function verifyPayment(payment: Payment): Promise<{
  verified: boolean;
  txHash?: string;
}> {
  try {
    // Check transactions in the last 30 minutes
    const sinceTimestamp = Date.now() - 30 * 60 * 1000;
    const transactions = await checkTronTransactions(sinceTimestamp);

    for (const tx of transactions) {
      // Get amount in USDT (6 decimals)
      const amount = parseFloat(tx.value) / 1_000_000;

      // Check if amount matches (with small tolerance for fees)
      const amountMatches = Math.abs(amount - payment.amount) < 0.01;

      // Check memo/note if available (some wallets support this)
      // Note: TRC-20 doesn't have native memo, but we can check by exact amount

      if (amountMatches) {
        return {
          verified: true,
          txHash: tx.transaction_id
        };
      }
    }

    return { verified: false };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { verified: false };
  }
}

/**
 * Confirm payment and activate plan
 */
export async function confirmPayment(
  paymentId: string,
  txHash: string
): Promise<boolean> {
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*, plans(*)')
    .eq('id', paymentId)
    .single();

  if (fetchError || !payment) {
    console.error('Error fetching payment:', fetchError);
    return false;
  }

  // Update payment status
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      tx_hash: txHash,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', paymentId);

  if (updateError) {
    console.error('Error updating payment:', updateError);
    return false;
  }

  // Get plan details
  const plan = payment.plans;
  if (!plan) {
    console.error('Plan not found');
    return false;
  }

  // Update user profile with new plan
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      plan_type: plan.name.toLowerCase(),
      credits: supabase.rpc('increment_credits', { amount: plan.credits_per_month }),
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', payment.user_id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    // Don't return false - payment is confirmed, just profile update failed
  }

  // Add credit transaction
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: payment.user_id,
      amount: plan.credits_per_month,
      type: 'subscription',
      description: `${plan.name} plan subscription`,
      metadata: {
        payment_id: payment.payment_id,
        tx_hash: txHash,
        plan_id: plan.id
      }
    });

  return true;
}

/**
 * Mark expired payments
 */
export async function expireOldPayments(): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'expired' })
    .eq('status', 'waiting')
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error expiring payments:', error);
  }
}

/**
 * Get available plans
 */
export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }

  return data || [];
}
