// Interfaz de proveedor de pago. Fase 0 NO implementa ningún proveedor real
// (ni checkout) — esto existe para que integrar Mercado Pago después no
// toque `organization_subscriptions` ni la lógica de entitlements, solo
// agregue una clase que cumpla esta interfaz.

export interface CheckoutSession {
  id: string;
  url: string; // adonde redirigir al usuario para pagar
}

export interface SubscriptionStatus {
  status: "active" | "canceled" | "past_due";
  planId: string;
  externalSubscriptionId: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(params: {
    organizationId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;
  handleWebhook(rawBody: string, signature: string): Promise<SubscriptionStatus | null>;
  syncSubscriptionStatus(externalSubscriptionId: string): Promise<SubscriptionStatus>;
}

// Implementación nula: deja compilar y probar el resto del sistema (planes,
// entitlements) sin que exista todavía un proveedor real conectado. Cualquier
// intento real de cobrar explota con un mensaje claro en vez de fingir éxito.
export class NullPaymentProvider implements PaymentProvider {
  readonly name = "none";

  async createCheckout(): Promise<CheckoutSession> {
    throw new Error(
      "Todavía no hay proveedor de pago configurado (Fase 0 no incluye checkout). " +
        "Implementá un PaymentProvider (ej. MercadoPagoProvider) antes de llamar a esto.",
    );
  }

  async handleWebhook(): Promise<SubscriptionStatus | null> {
    return null;
  }

  async syncSubscriptionStatus(): Promise<SubscriptionStatus> {
    throw new Error("Todavía no hay proveedor de pago configurado.");
  }
}
