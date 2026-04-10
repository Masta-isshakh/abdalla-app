import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

import { sendCompanyInvitationEmail } from '../functions/send-company-invitation-email/resource';

const schema = a.schema({
  InvitationEmailResult: a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    sentAtLabel: a.string(),
  }),

  AppUser: a
    .model({
      email: a.string().required(),
      fullName: a.string().required(),
      phone: a.string(),
      role: a.string().required(),
      companyId: a.id(),
      companyName: a.string(),
      invitedByEmail: a.string(),
      status: a.string().required(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.group('company').to(['read']),
      allow.owner(),
    ]),

  UserProfile: a
    .model({
      fullName: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      preferredLanguage: a.string(),
      defaultPaymentMethod: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  Company: a
    .model({
      name: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      supportEmail: a.string().required(),
      supportPhone: a.string(),
      accentColor: a.string(),
      logoText: a.string(),
      ownerEmail: a.string().required(),
      isActive: a.boolean(),
      createdAtLabel: a.string(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.group('company').to(['read', 'update']),
      allow.guest().to(['read']),
    ]),

  CompanyInvitation: a
    .model({
      companyId: a.id().required(),
      companyName: a.string().required(),
      email: a.string().required(),
      invitedByEmail: a.string().required(),
      status: a.string().required(),
      message: a.string(),
      emailDeliveryStatus: a.string().required(),
      emailDeliveryError: a.string(),
      emailSentAtLabel: a.string(),
    })
    .authorization((allow) => [
      allow.group('admin'),
    ]),

  sendCompanyInvitationEmail: a
    .mutation()
    .arguments({
      companyName: a.string().required(),
      inviteeEmail: a.string().required(),
      invitedByEmail: a.string().required(),
      message: a.string(),
    })
    .returns(a.ref('InvitationEmailResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(sendCompanyInvitationEmail)),

  CatalogItem: a
    .model({
      companyId: a.id().required(),
      companyName: a.string().required(),
      kind: a.string().required(),
      title: a.string().required(),
      summary: a.string().required(),
      description: a.string(),
      category: a.string().required(),
      price: a.float().required(),
      durationLabel: a.string(),
      isPublished: a.boolean(),
      featured: a.boolean(),
      tags: a.string(),
      loyaltyPoints: a.integer(),
      imageHint: a.string(),
    })
    .authorization((allow) => [
      allow.group('admin').to(['read']),
      allow.group('company'),
      allow.guest().to(['read']),
    ]),

  OfferPromotion: a
    .model({
      companyId: a.id().required(),
      companyName: a.string().required(),
      catalogItemId: a.id().required(),
      catalogItemTitle: a.string().required(),
      title: a.string().required(),
      headline: a.string().required(),
      badgeText: a.string(),
      discountLabel: a.string(),
      startsAtLabel: a.string(),
      endsAtLabel: a.string(),
      isActive: a.boolean(),
      sortOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.group('admin').to(['read']),
      allow.group('company'),
      allow.guest().to(['read']),
    ]),

  AppNotification: a
    .model({
      recipientRole: a.string().required(),
      recipientEmail: a.string(),
      companyId: a.id(),
      title: a.string().required(),
      body: a.string().required(),
      kind: a.string().required(),
      destinationTab: a.string().required(),
      isRead: a.boolean(),
      createdAtLabel: a.string().required(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.group('company'),
      allow.group('customer'),
    ]),

  LoyaltyProgram: a
    .model({
      scope: a.string().required(),
      companyId: a.id(),
      title: a.string().required(),
      description: a.string(),
      pointsPerBooking: a.integer().required(),
      rewardText: a.string(),
      tierRules: a.string(),
      isActive: a.boolean(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.group('company'),
      allow.guest().to(['read']),
    ]),

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
      customerEmail: a.string().required(),
      customerName: a.string().required(),
      companyId: a.id().required(),
      companyName: a.string().required(),
      itemId: a.id().required(),
      itemTitle: a.string().required(),
      kind: a.string().required(),
      scheduleDate: a.string().required(),
      scheduleTime: a.string().required(),
      addressLabel: a.string().required(),
      addressLine: a.string().required(),
      paymentMethod: a.string().required(),
      notes: a.string(),
      subtotal: a.float().required(),
      serviceFee: a.float().required(),
      discount: a.float().required(),
      total: a.float().required(),
      status: a.string().required(),
      loyaltyPointsEarned: a.integer(),
      ratingSubmitted: a.boolean(),
      timeline: a.string(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.group('company').to(['read', 'update']),
      allow.owner(),
      allow.guest().to(['read']),
    ]),

  Rating: a
    .model({
      bookingId: a.id().required(),
      companyId: a.id().required(),
      itemId: a.id().required(),
      customerEmail: a.string().required(),
      score: a.integer().required(),
      review: a.string(),
      createdAtLabel: a.string(),
    })
    .authorization((allow) => [
      allow.group('admin').to(['read']),
      allow.group('company').to(['read']),
      allow.owner(),
      allow.guest().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
