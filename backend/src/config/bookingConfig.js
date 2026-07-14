const bookingPolicy = {
    freeCancellationHours: 24,
    pendingExpirationMinutes: 720,
    rescheduleExpirationMinutes: 360,
    reminderHours: [48, 24, 2],
    defaultSlotIntervalMinutes: 30,
    defaultMinAdvanceHours: 12,
    defaultMaxFutureDays: 45,
    defaultPreparationMinutes: 0,
    defaultConcurrentCapacity: 3
};

const PLATFORM_BOOKING_FEE_CENTS = 200;
const PLATFORM_FEE_TRIGGER_STATUS = "COMPLETED";
const PLATFORM_CURRENCY = "EUR";

module.exports = {
    bookingPolicy,
    PLATFORM_BOOKING_FEE_CENTS,
    PLATFORM_FEE_TRIGGER_STATUS,
    PLATFORM_CURRENCY
};
