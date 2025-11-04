import { supabase } from './supabase';

export const createCheckoutSession = async (
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      successUrl,
      cancelUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return response.json();
};

export const createPortalSession = async (returnUrl: string) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create portal session');
  }

  return response.json();
};

export const redirectToCheckout = async (priceId: string) => {
  const origin = window.location.origin;
  const { url } = await createCheckoutSession(
    priceId,
    `${origin}/dashboard?payment=success`,
    `${origin}/dashboard?payment=cancelled`
  );

  if (url) {
    window.location.href = url;
  } else {
    throw new Error('Failed to create checkout session');
  }
};

export const redirectToPortal = async () => {
  const origin = window.location.origin;
  const { url } = await createPortalSession(`${origin}/dashboard`);
  window.location.href = url;
};
