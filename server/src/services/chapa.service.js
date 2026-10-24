import { chapaConfig } from "../config/chapa.js";

export class ChapaError extends Error {
  constructor(message, status = 502, code = "CHAPA_API_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestChapa(endpoint, options = {}) {
  const url = `${chapaConfig.baseUrl}${endpoint}`;
  const timeoutMs = 15000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${chapaConfig.secretKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        body?.message || body?.error || `Chapa request failed with HTTP ${response.status}`;
      throw new ChapaError(errorMsg, response.status, "CHAPA_UPSTREAM_ERROR", body);
    }

    return body;
  } catch (error) {
    if (error instanceof ChapaError) throw error;
    if (error.name === "AbortError") {
      throw new ChapaError(
        "Chapa API request timed out after 15 seconds.",
        504,
        "CHAPA_TIMEOUT"
      );
    }
    throw new ChapaError(
      `Network error contacting Chapa: ${error.message}`,
      502,
      "CHAPA_NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Initialize payment checkout on Chapa.
 */
export async function initializeChapaPayment({
  amount,
  currency = "ETB",
  email,
  firstName,
  lastName,
  txRef,
  callbackUrl,
  returnUrl,
  title = "Trust Payment Escrow",
  description = "Escrow project funding",
}) {
  const payload = {
    amount: String(amount),
    currency,
    email,
    first_name: firstName || "Client",
    last_name: lastName || "User",
    tx_ref: txRef,
    callback_url: callbackUrl,
    return_url: returnUrl,
    "customization[title]": title,
    "customization[description]": description,
  };

  const response = await requestChapa("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response?.status !== "success" || !response?.data?.checkout_url) {
    throw new ChapaError(
      response?.message || "Failed to receive valid checkout URL from Chapa.",
      502,
      "CHAPA_INITIALIZE_FAILED",
      response
    );
  }

  return {
    checkoutUrl: response.data.checkout_url,
    raw: response,
  };
}

/**
 * Server-to-server transaction verification by transaction reference.
 */
export async function verifyChapaTransaction(txRef) {
  const response = await requestChapa(`/transaction/verify/${encodeURIComponent(txRef)}`, {
    method: "GET",
  });

  return {
    isSuccess: response?.status === "success" && response?.data?.status === "success",
    status: response?.data?.status || "failed",
    amount: response?.data?.amount,
    currency: response?.data?.currency,
    txRef: response?.data?.tx_ref,
    chapaReference: response?.data?.reference,
    paymentMethod: response?.data?.method || response?.data?.type || null,
    mode: response?.data?.mode || "test",
    raw: response,
  };
}

/**
 * Request a transfer/payout to a freelancer bank account.
 */
export async function initiateChapaTransfer({
  amount,
  currency = "ETB",
  accountName,
  accountNumber,
  bankCode,
  reference,
}) {
  const payload = {
    amount: Number(amount),
    currency,
    account_name: accountName,
    account_number: accountNumber,
    bank_code: bankCode,
    reference,
  };

  const response = await requestChapa("/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    isSuccess: response?.status === "success",
    message: response?.message,
    transferId: response?.data?.id || null,
    raw: response,
  };
}

/**
 * Verify a transfer/payout status by reference.
 */
export async function verifyChapaTransfer(reference) {
  const response = await requestChapa(`/transfers/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });

  return {
    isSuccess: response?.status === "success",
    status: response?.data?.status || "pending",
    raw: response,
  };
}

/**
 * List supported banks for payouts.
 */
export async function getChapaSupportedBanks() {
  const response = await requestChapa("/banks", { method: "GET" });
  return response?.data || [];
}
