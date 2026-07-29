import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  driverLocations: defineTable({
    driverId: v.string(),
    lat: v.number(),
    lng: v.number(),
    updatedAt: v.number(),
  }).index('by_driverId', ['driverId']),
});
