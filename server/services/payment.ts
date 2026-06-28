export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: "initiated" | "authorized" | "captured" | "failed";
}

export async function createPaymentIntent(
  amount: number,
  currency: string,
  metadata: Record<string, string>
): Promise<PaymentIntent> {
  const secretKey = process.env.PAYMENT_SECRET_KEY;

  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      // Never fake a payment intent in production: a mock "success" could mark an
      // order as paid and trigger vendor fulfilment without a real charge.
      console.error(
        "[Payment] PAYMENT_SECRET_KEY is not configured; refusing to create a payment intent."
      );
      throw new Error("Payment provider not configured");
    }
    // Development-only stub so the checkout flow can be exercised locally.
    console.log(`[Payment STUB] Creating intent: ${amount} ${currency} (dev)`);
    const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: mockId,
      clientSecret: `${mockId}_secret_mock`,
      amount,
      currency,
      status: "initiated",
    };
  }

  const params = new URLSearchParams({
    amount: String(Math.round(amount * 100)),
    currency: currency.toLowerCase(),
    payment_method_types: "card",
    "metadata[inspectionId]": metadata.inspectionId ?? "",
    "metadata[quoteId]": metadata.quoteId ?? "",
  });

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const result = await response.json() as any;
  return {
    id: result.id,
    clientSecret: result.client_secret,
    amount,
    currency,
    status: "initiated",
  };
}

export async function capturePayment(gatewayRef: string): Promise<boolean> {
  const secretKey = process.env.PAYMENT_SECRET_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      // Never report a capture as successful in production without a real charge.
      console.error(
        "[Payment] PAYMENT_SECRET_KEY is not configured; refusing to capture payment."
      );
      return false;
    }
    console.log(`[Payment STUB] Capturing payment (dev): ${gatewayRef}`);
    return true;
  }

  const response = await fetch(
    `https://api.stripe.com/v1/payment_intents/${gatewayRef}/capture`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}` },
    }
  );
  return response.ok;
}
