import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const updateLocation = mutation({
  args: { driverId: v.string(), lat: v.number(), lng: v.number() },
  handler: async (ctx, { driverId, lat, lng }) => {
    const existing = await ctx.db
      .query('driverLocations')
      .withIndex('by_driverId', (q) => q.eq('driverId', driverId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lat, lng, updatedAt: Date.now() });
    } else {
      await ctx.db.insert('driverLocations', { driverId, lat, lng, updatedAt: Date.now() });
    }
  },
});

export const getDriverLocation = query({
  args: { driverId: v.string() },
  handler: async (ctx, { driverId }) => {
    return await ctx.db
      .query('driverLocations')
      .withIndex('by_driverId', (q) => q.eq('driverId', driverId))
      .first();
  },
});
