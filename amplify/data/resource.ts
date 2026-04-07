import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  UserProfile: a
    .model({
      fullName: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      preferredLanguage: a.string(),
      defaultPaymentMethod: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  Address: a
    .model({
      label: a.string().required(),
      area: a.string().required(),
      street: a.string().required(),
      building: a.string(),
      unitNumber: a.string(),
      instructions: a.string(),
      contactName: a.string(),
      contactPhone: a.string(),
      isDefault: a.boolean(),
    })
    .authorization((allow) => [allow.owner()]),

  Booking: a
    .model({
      bookingNumber: a.string().required(),
      serviceKey: a.string().required(),
      serviceTitle: a.string().required(),
      packageTitle: a.string().required(),
      dateLabel: a.string().required(),
      timeLabel: a.string().required(),
      recurrence: a.string(),
      addressLabel: a.string().required(),
      addressLine: a.string().required(),
      paymentMethod: a.string().required(),
      notes: a.string(),
      subtotal: a.float().required(),
      serviceFee: a.float().required(),
      discount: a.float().required(),
      total: a.float().required(),
      status: a.string().required(),
      extras: a.string(),
      timeline: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
