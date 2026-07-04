import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { ShiprocketApiError, createShiprocketOrder, hasShiprocketCredentialsConfigured } from '@/backend/lib/shiprocket';

type FulfillmentSource = 'razorpay-verify' | 'razorpay-webhook' | 'admin-manual-paid' | 'admin-retry-shiprocket';

type FulfillmentInput = {
  orderId: string;
  source: FulfillmentSource;
};

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizePhone(phone: string | null | undefined) {
  const sanitize = (value: string | null | undefined) => String(value ?? '').replace(/[^0-9]/g, '');

  const toShiprocketPhone = (value: string | null | undefined) => {
    const digits = sanitize(value);
    if (!digits) return null;

    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);

    // Keep broader E.164-compatible numeric lengths if already clean.
    if (digits.length >= 10 && digits.length <= 15) return digits;

    return null;
  };

  const primary = toShiprocketPhone(phone);
  if (primary) return primary;

  const fallback = toShiprocketPhone(process.env.SHIPROCKET_FALLBACK_PHONE?.trim() || '9876543210');
  if (fallback) return fallback;

  return '9876543210';
}

function isValidShiprocketPhone(phone: unknown) {
  if (typeof phone !== 'string') return false;
  return /^\d{10,15}$/.test(phone.trim());
}

function toNestedJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    return value.map((item) => toNestedJsonValue(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const next: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, item] of Object.entries(objectValue)) {
      next[key] = toNestedJsonValue(item);
    }

    return next as Prisma.InputJsonObject;
  }

  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return value as Prisma.InputJsonValue;
  }

  return String(value);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  const nested = toNestedJsonValue(value);
  if (nested === null) return Prisma.JsonNull;
  return nested;
}

function isShiprocketResponseColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /shiprocketResponse/i.test(message) &&
    (/does not exist/i.test(message) || /Unknown arg/i.test(message) || /Invalid .* invocation/i.test(message))
  );
}

async function updateOrderWithShiprocketState(
  orderId: string,
  data: Record<string, unknown>,
  shiprocketResponse: unknown,
) {
  const payload = {
    ...data,
    shiprocketResponse: toJsonValue(shiprocketResponse),
  };

  try {
    await db.order.update({
      where: { id: orderId },
      data: payload,
    });
  } catch (error) {
    if (!isShiprocketResponseColumnError(error)) {
      throw error;
    }

    console.warn('[post-payment-fulfillment] shiprocketResponse column unavailable; retrying update without response payload.', {
      orderId,
      error,
    });

    await db.order.update({
      where: { id: orderId },
      data,
    });
  }
}

function extractShiprocketRefs(response: unknown) {
  const record = response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
  const shipmentData =
    record.shipment && typeof record.shipment === 'object'
      ? (record.shipment as Record<string, unknown>)
      : {};
  const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};

  return {
    shiprocketOrderId: pickString(
      record.order_id,
      record.shiprocket_order_id,
      record.sr_order_id,
      data.order_id,
      data.shiprocket_order_id,
      shipmentData.order_id,
    ),
    shipmentId: pickString(record.shipment_id, data.shipment_id, shipmentData.shipment_id, shipmentData.id),
    awbCode: pickString(record.awb_code, record.awb, data.awb_code, shipmentData.awb_code, shipmentData.awb),
    shiprocketStatus: pickString(record.status, data.status, shipmentData.status),
  };
}

function parseShippingAddressSnapshot(shippingAddress: string | null | undefined) {
  const parts = String(shippingAddress ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      customerName: null,
      address1: null,
      address2: null,
      city: null,
      state: null,
      pincode: null,
      country: null,
    };
  }

  const customerName = parts[0] ?? null;
  const country = parts[parts.length - 1] ?? null;
  const pincode = parts[parts.length - 2] ?? null;
  const state = parts[parts.length - 3] ?? null;
  const city = parts[parts.length - 4] ?? null;
  const addressSegments = parts.slice(1, Math.max(1, parts.length - 4));

  return {
    customerName,
    address1: addressSegments.slice(0, 2).join(', ') || null,
    address2: addressSegments.slice(2).join(', ') || null,
    city,
    state,
    pincode,
    country,
  };
}

function getFirstAndLastName(fullName: string | null | undefined) {
  const normalized = pickString(fullName) || 'Customer';
  const [firstName, ...lastNameParts] = normalized.split(' ');
  return {
    firstName: pickString(firstName) || 'Customer',
    lastName: pickString(lastNameParts.join(' ')) || 'NA',
  };
}

function isOrderAlreadyExistsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/order already exists/i.test(message)) {
    return true;
  }

  if (error instanceof ShiprocketApiError) {
    const body = error.responseBody;
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const responseMessage = typeof record.message === 'string' ? record.message : '';
      if (/order already exists/i.test(responseMessage)) {
        return true;
      }
    }
  }

  return false;
}

function getUniqueShiprocketOrderId(baseOrderId: string, attempt: number) {
  if (attempt <= 0) return baseOrderId;

  const suffix = `${Date.now().toString().slice(-6)}${attempt}`;
  const maxBaseLength = Math.max(4, 40 - suffix.length - 1);
  const trimmedBase = String(baseOrderId || 'ORDER').slice(0, maxBaseLength);
  return `${trimmedBase}-${suffix}`;
}

function buildShiprocketPayload(order: {
  id: string;
  createdAt: Date;
  totalAmount: Prisma.Decimal;
  shippingAddress: string | null;
  orderItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: Prisma.Decimal;
    selectedSize: string | null;
  }>;
  address: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  payment: {
    provider: string;
    status: PaymentStatus;
  } | null;
}) {
  const snapshot = parseShippingAddressSnapshot(order.shippingAddress);
  const customerName = pickString(order.address?.name, snapshot.customerName, `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`);
  const { firstName, lastName } = getFirstAndLastName(customerName);

  const structuredAddressLine = [
    pickString(order.address?.street),
    pickString(order.address?.city),
    pickString(order.address?.state),
    pickString(order.address?.zip),
    pickString(order.address?.country),
  ]
    .filter(Boolean)
    .join(', ');

  // Prefer the immutable order snapshot to avoid drift if user edits/deletes addresses later.
  const billingAddress = pickString(order.shippingAddress, structuredAddressLine, snapshot.address1) || 'Address unavailable';
  const billingAddress2 = pickString(snapshot.address2) || '';
  const billingCity = pickString(order.address?.city, snapshot.city) || 'Unknown';
  const billingPincode = pickString(order.address?.zip, snapshot.pincode) || '000000';
  const billingState = pickString(order.address?.state, snapshot.state) || 'Unknown';
  const billingCountry = pickString(order.address?.country, snapshot.country) || 'India';
  const billingPhone = normalizePhone(order.user.phone);
  const billingEmail = pickString(order.user.email) || '';

  const isRazorpaySuccess =
    order.payment?.provider === 'RAZORPAY' && order.payment?.status === PaymentStatus.COMPLETED;

  const paymentMethod = isRazorpaySuccess ? 'Prepaid' : 'COD';

  return {
    order_id: order.id,
    order_date: order.createdAt.toISOString().slice(0, 19).replace('T', ' '),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || '',
    channel_id: process.env.SHIPROCKET_CHANNEL_ID?.trim() || undefined,
    comment: 'Auto-created after successful payment.',
    billing_customer_name: firstName || 'Customer',
    billing_last_name: lastName,
    billing_address: billingAddress,
    billing_address_2: billingAddress2,
    billing_city: billingCity,
    billing_pincode: billingPincode,
    billing_state: billingState,
    billing_country: billingCountry,
    billing_email: billingEmail,
    billing_phone: billingPhone,
    shipping_customer_name: firstName || 'Customer',
    shipping_last_name: lastName,
    shipping_address: billingAddress,
    shipping_address_2: billingAddress2,
    shipping_city: billingCity,
    shipping_state: billingState,
    shipping_country: billingCountry,
    shipping_pincode: billingPincode,
    shipping_email: billingEmail,
    shipping_phone: billingPhone,
    shipping_is_billing: true,
    order_items: order.orderItems.map((item) => ({
      name: item.productName,
      sku: `${item.productId}-${pickString(item.selectedSize) || 'NA'}`,
      units: Number(item.quantity || 0),
      selling_price: Number(item.price),
      discount: '',
      tax: '',
      hsn: '',
    })),
    payment_method: paymentMethod,
    sub_total: Number(order.totalAmount),
    length: Number(process.env.SHIPROCKET_DEFAULT_LENGTH || 10),
    breadth: Number(process.env.SHIPROCKET_DEFAULT_BREADTH || 10),
    height: Number(process.env.SHIPROCKET_DEFAULT_HEIGHT || 5),
    weight: Number(process.env.SHIPROCKET_DEFAULT_WEIGHT || 0.5),
  };
}

function validateOrderItems(orderItems: unknown) {
  const errors: string[] = [];

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return ['order_items must be a non-empty array'];
  }

  orderItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`order_items[${index}] is invalid`);
      return;
    }

    const record = item as Record<string, unknown>;
    const required = ['name', 'sku', 'units', 'selling_price', 'discount', 'tax'];

    for (const key of required) {
      const value = record[key];
      const allowsBlank = key === 'discount' || key === 'tax';
      if (value === null || value === undefined || (!allowsBlank && typeof value === 'string' && !value.trim())) {
        errors.push(`order_items[${index}].${key} is missing`);
      }
    }
  });

  return errors;
}

function validateCustomerFields(payload: Record<string, unknown>) {
  const customerFields = [
    'billing_customer_name',
    'billing_last_name',
    'billing_address',
    'billing_address_2',
    'billing_city',
    'billing_state',
    'billing_country',
    'billing_pincode',
    'billing_phone',
    'billing_email',
    'shipping_customer_name',
    'shipping_last_name',
    'shipping_address',
    'shipping_address_2',
    'shipping_city',
    'shipping_state',
    'shipping_country',
    'shipping_pincode',
    'shipping_phone',
    'shipping_email',
  ] as const;

  const missing: string[] = [];

  for (const field of customerFields) {
    const value = payload[field];
    const allowsBlank = field === 'billing_address_2' || field === 'shipping_address_2';
    if (value === null || value === undefined || (!allowsBlank && typeof value === 'string' && !value.trim())) {
      missing.push(field);
    }

    if ((field === 'billing_phone' || field === 'shipping_phone') && value !== null && value !== undefined) {
      if (!isValidShiprocketPhone(value)) {
        missing.push(`${field} invalid format`);
      }
    }
  }

  return missing;
}

function validateShiprocketPayload(payload: Record<string, unknown>) {
  const requiredFields = [
    'order_id',
    'order_date',
    'pickup_location',
    'billing_customer_name',
    'billing_last_name',
    'billing_address',
    'billing_city',
    'billing_state',
    'billing_pincode',
    'billing_country',
    'billing_phone',
    'billing_email',
    'order_items',
    'payment_method',
    'sub_total',
    'shipping_is_billing',
  ] as const;

  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = payload[field];

    if (field === 'order_items') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push('order_items must be a non-empty array');
      }
      continue;
    }

    if (value === null || value === undefined) {
      errors.push(`${field} is missing`);
      continue;
    }

    if (typeof value === 'string' && !value.trim()) {
      errors.push(`${field} is empty`);
    }
  }

  return errors;
}

export async function runPostPaymentFulfillment(input: FulfillmentInput) {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: {
      payment: true,
      address: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      orderItems: {
        select: {
          productId: true,
          productName: true,
          quantity: true,
          price: true,
          selectedSize: true,
        },
      },
    },
  });

  if (!order) {
    console.error('[post-payment-fulfillment] Order not found.', {
      orderId: input.orderId,
      source: input.source,
    });
    return { created: false, skipped: true, reason: 'ORDER_NOT_FOUND' };
  }

  const paymentStatus = order.payment?.status ?? null;
  const isPaid = order.status === OrderStatus.PAID || paymentStatus === PaymentStatus.COMPLETED;

  console.info('===== Database Order =====');
  console.info('saved order', {
    id: order.id,
    status: order.status,
    paymentStatus,
    totalAmount: Number(order.totalAmount),
    source: input.source,
    existingShiprocketOrderId: order.shiprocketOrderId,
    shippingAddress: order.shippingAddress,
  });

  console.info('===== User =====');
  console.info('customer details', {
    email: order.user?.email,
    firstName: order.user?.firstName,
    lastName: order.user?.lastName,
    phone: order.user?.phone,
    address: order.address,
  });

  console.info('[post-payment-fulfillment] Evaluating order.', {
    orderId: order.id,
    source: input.source,
    orderStatus: order.status,
    paymentStatus,
    existingShiprocketOrderId: order.shiprocketOrderId,
  });

  if (!isPaid) {
    console.info('[post-payment-fulfillment] Skipped: order is not paid.', {
      orderId: order.id,
      source: input.source,
      orderStatus: order.status,
      paymentStatus,
    });
    return { created: false, skipped: true, reason: 'ORDER_NOT_PAID' };
  }

  if (order.shiprocketOrderId) {
    console.info('[post-payment-fulfillment] Skipped: Shiprocket order already exists.', {
      orderId: order.id,
      source: input.source,
      shiprocketOrderId: order.shiprocketOrderId,
      paymentStatus,
    });
    return { created: false, skipped: true, reason: 'SHIPROCKET_ORDER_EXISTS' };
  }

  const lock = await db.order.updateMany({
    where: {
      id: order.id,
      shiprocketOrderId: null,
    },
    data: {
      shiprocketStatus: 'CREATION_IN_PROGRESS',
    },
  });

  if (lock.count === 0) {
    console.info('[post-payment-fulfillment] Skipped: another process already created Shiprocket order.', {
      orderId: order.id,
      source: input.source,
      paymentStatus,
    });
    return { created: false, skipped: true, reason: 'CONCURRENT_CREATION_DETECTED' };
  }

  const hasShiprocketCredentials = hasShiprocketCredentialsConfigured();

  if (!hasShiprocketCredentials) {
    console.error('[post-payment-fulfillment] Missing Shiprocket credentials.', {
      orderId: order.id,
      paymentStatus,
      source: input.source,
      hasApiEmail: Boolean(process.env.SHIPROCKET_API_EMAIL?.trim()),
      hasApiPassword: Boolean(process.env.SHIPROCKET_API_PASSWORD?.trim()),
      hasLegacyEmail: Boolean(process.env.SHIPROCKET_EMAIL?.trim()),
      hasLegacyPassword: Boolean(process.env.SHIPROCKET_PASSWORD?.trim()),
    });

    await updateOrderWithShiprocketState(
      order.id,
      {
        shiprocketStatus: 'CONFIG_MISSING',
      },
      {
        error: 'Missing SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD',
        source: input.source,
        failedAt: new Date().toISOString(),
      },
    );

    throw new Error(
      '[post-payment-fulfillment] Missing Shiprocket credentials. Set SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD.',
    );
  }

  const payload = buildShiprocketPayload(order);
  const payloadValidationErrors = validateShiprocketPayload(payload as Record<string, unknown>);
  const customerFieldMissingErrors = validateCustomerFields(payload as Record<string, unknown>);
  const orderItemErrors = validateOrderItems((payload as Record<string, unknown>).order_items);

  if (customerFieldMissingErrors.length > 0) {
    console.error('Any validation errors', {
      orderId: order.id,
      source: input.source,
      missingCustomerFields: customerFieldMissingErrors,
      payload,
    });
  }

  if (payloadValidationErrors.length > 0 || customerFieldMissingErrors.length > 0 || orderItemErrors.length > 0) {
    const allErrors = [...payloadValidationErrors, ...customerFieldMissingErrors, ...orderItemErrors];

    console.error('Any validation errors', {
      orderId: order.id,
      source: input.source,
      errors: allErrors,
      payload,
    });

    await updateOrderWithShiprocketState(
      order.id,
      {
        shiprocketStatus: 'VALIDATION_FAILED',
      },
      {
        error: 'Shiprocket payload validation failed',
        validationErrors: allErrors,
        payload,
        source: input.source,
        failedAt: new Date().toISOString(),
      },
    );

    throw new Error(
      `[post-payment-fulfillment] Shiprocket payload validation failed: ${allErrors.join('; ')}`,
    );
  }

  console.info('===== Shiprocket Payload =====');
  console.info('full payload', payload);

  console.info('[post-payment-fulfillment] Creating Shiprocket order.', {
    orderId: order.id,
    paymentStatus,
    payload,
  });

  try {
    let attempt = 0;
    let currentPayload: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
    let shiprocketResponse: unknown = null;

    while (attempt < 3) {
      try {
        shiprocketResponse = await createShiprocketOrder(currentPayload);
        break;
      } catch (error) {
        if (!isOrderAlreadyExistsError(error) || attempt >= 2) {
          throw error;
        }

        attempt += 1;
        const nextOrderId = getUniqueShiprocketOrderId(order.id, attempt);
        currentPayload = {
          ...(currentPayload as Record<string, unknown>),
          order_id: nextOrderId,
        };

        console.warn('[post-payment-fulfillment] Shiprocket rejected duplicate order_id, retrying with unique order_id.', {
          orderId: order.id,
          previousOrderId: (payload as Record<string, unknown>).order_id,
          nextOrderId,
          attempt,
        });
      }
    }

    if (!shiprocketResponse) {
      throw new Error(`[post-payment-fulfillment] Shiprocket order creation returned empty response for ${order.id}`);
    }

    console.info('===== Shiprocket Response =====');
    console.info('status', 'SUCCESS');
    console.info('body', shiprocketResponse);

    console.info('[post-payment-fulfillment] Shiprocket response received.', {
      orderId: order.id,
      paymentStatus,
      response: shiprocketResponse,
    });

    const refs = extractShiprocketRefs(shiprocketResponse);

    await updateOrderWithShiprocketState(
      order.id,
      {
        shiprocketOrderId: refs.shiprocketOrderId ?? undefined,
        shipmentId: refs.shipmentId ?? undefined,
        awbCode: refs.awbCode ?? undefined,
        shiprocketStatus: refs.shiprocketStatus ?? 'CREATED',
      },
      shiprocketResponse,
    );

    return {
      created: true,
      skipped: false,
      shiprocketOrderId: refs.shiprocketOrderId,
      shipmentId: refs.shipmentId,
      awbCode: refs.awbCode,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Shiprocket error';
    const statusCode = error instanceof ShiprocketApiError ? error.statusCode : null;
    const responseBody = error instanceof ShiprocketApiError ? error.responseBody : null;
    const validationErrors = error instanceof ShiprocketApiError ? error.validationErrors : null;

    console.error('===== Shiprocket Response =====');
    console.error('status', statusCode ?? 'UNKNOWN');
    console.error('body', responseBody ?? errorMessage);
    console.error('validation errors', validationErrors);

    console.error('[post-payment-fulfillment] Shiprocket creation failed.', {
      orderId: order.id,
      paymentStatus,
      payload,
      statusCode,
      responseBody,
      validationErrors,
      error: errorMessage,
      rawError: error,
    });

    await updateOrderWithShiprocketState(
      order.id,
      {
        shiprocketStatus: 'CREATION_FAILED',
      },
      {
        statusCode,
        responseBody,
        validationErrors,
        error: errorMessage,
        source: input.source,
        failedAt: new Date().toISOString(),
      },
    );

    throw new Error(
      `[post-payment-fulfillment] Shiprocket creation failed for order ${order.id}: status=${statusCode ?? 'unknown'}; reason=${errorMessage}; validation=${JSON.stringify(validationErrors ?? null)}; response=${JSON.stringify(responseBody ?? null)}`,
    );
  }
}
