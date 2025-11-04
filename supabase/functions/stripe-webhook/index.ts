import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@19.1.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      return new Response(
        JSON.stringify({ received: true, message: "Event already processed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false,
      payload: event,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await supabase
      .from("stripe_webhook_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCheckoutCompleted(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const businessId = session.client_reference_id;
  const customerId = session.customer as string;

  if (!businessId || !customerId) {
    console.error("Missing business ID or customer ID in checkout session");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const priceId = subscription.items.data[0]?.price.id;

  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  await supabase.from("stripe_customers").upsert({
    business_id: businessId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    payment_method_status: "active",
  });

  await supabase
    .from("businesses")
    .update({
      subscription_status: "active",
      tier_id: tier?.id,
      stripe_price_id: priceId,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", businessId);

  await supabase.from("subscription_history").insert({
    business_id: businessId,
    event_type: "subscription_created",
    tier_id: tier?.id,
    stripe_subscription_id: subscription.id,
    amount: (subscription.items.data[0]?.price.unit_amount || 0) / 100,
    metadata: { session_id: session.id },
  });
}

async function handleSubscriptionUpdated(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("business_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (!stripeCustomer) {
    console.error("No stripe customer found for subscription:", subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;

  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  const status = subscription.status === "active" ? "active" : "cancelled";

  await supabase
    .from("stripe_customers")
    .update({
      stripe_price_id: priceId,
      payment_method_status: subscription.status === "active" ? "active" : "failed",
    })
    .eq("stripe_subscription_id", subscription.id);

  await supabase
    .from("businesses")
    .update({
      subscription_status: status,
      tier_id: tier?.id,
      stripe_price_id: priceId,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", stripeCustomer.business_id);

  await supabase.from("subscription_history").insert({
    business_id: stripeCustomer.business_id,
    event_type: "subscription_updated",
    tier_id: tier?.id,
    stripe_subscription_id: subscription.id,
    metadata: { status: subscription.status },
  });
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("business_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (!stripeCustomer) {
    console.error("No stripe customer found for subscription:", subscription.id);
    return;
  }

  const { data: freeTier } = await supabase
    .from("subscription_tiers")
    .select("id")
    .eq("name", "Free")
    .maybeSingle();

  await supabase
    .from("stripe_customers")
    .update({
      stripe_subscription_id: null,
      stripe_price_id: null,
      payment_method_status: "missing",
    })
    .eq("stripe_subscription_id", subscription.id);

  await supabase
    .from("businesses")
    .update({
      subscription_status: "cancelled",
      tier_id: freeTier?.id,
      stripe_price_id: null,
      subscription_period_end: null,
    })
    .eq("id", stripeCustomer.business_id);

  await supabase.from("subscription_history").insert({
    business_id: stripeCustomer.business_id,
    event_type: "subscription_cancelled",
    stripe_subscription_id: subscription.id,
    metadata: { cancelled_at: new Date().toISOString() },
  });
}

async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("business_id")
    .eq("stripe_customer_id", invoice.customer)
    .maybeSingle();

  if (!stripeCustomer) {
    console.error("No stripe customer found for invoice:", invoice.id);
    return;
  }

  await supabase
    .from("stripe_customers")
    .update({
      payment_method_status: "active",
    })
    .eq("stripe_customer_id", invoice.customer);

  await supabase.from("subscription_history").insert({
    business_id: stripeCustomer.business_id,
    event_type: "payment_succeeded",
    stripe_subscription_id: invoice.subscription as string,
    stripe_invoice_id: invoice.id,
    amount: (invoice.amount_paid || 0) / 100,
    metadata: { invoice_number: invoice.number },
  });
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const { data: stripeCustomer } = await supabase
    .from("stripe_customers")
    .select("business_id")
    .eq("stripe_customer_id", invoice.customer)
    .maybeSingle();

  if (!stripeCustomer) {
    console.error("No stripe customer found for invoice:", invoice.id);
    return;
  }

  await supabase
    .from("stripe_customers")
    .update({
      payment_method_status: "failed",
    })
    .eq("stripe_customer_id", invoice.customer);

  await supabase.from("subscription_history").insert({
    business_id: stripeCustomer.business_id,
    event_type: "payment_failed",
    stripe_subscription_id: invoice.subscription as string,
    stripe_invoice_id: invoice.id,
    amount: (invoice.amount_due || 0) / 100,
    metadata: { 
      invoice_number: invoice.number,
      attempt_count: invoice.attempt_count 
    },
  });
}