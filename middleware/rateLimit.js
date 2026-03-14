const buckets = new Map();

function cleanupBucket(key, now, windowMs) {
  const state = buckets.get(key);
  if (!state) return null;

  if (now - state.windowStart >= windowMs) {
    buckets.delete(key);
    return null;
  }

  return state;
}

function getClientKey(req, prefix) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : "";
  const ip = forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";

  return `${prefix}:${ip}`;
}

function createRateLimiter({ windowMs, maxRequests, message, prefix }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req, prefix);
    let state = cleanupBucket(key, now, windowMs);

    if (!state) {
      state = { count: 0, windowStart: now };
      buckets.set(key, state);
    }

    state.count += 1;

    const remaining = Math.max(maxRequests - state.count, 0);
    const resetInSeconds = Math.ceil((state.windowStart + windowMs - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetInSeconds);

    if (state.count > maxRequests) {
      return res.status(429).json({
        error: message,
        retryAfterSeconds: resetInSeconds,
      });
    }

    next();
  };
}

const analysisLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many analysis requests. Please try again later.",
  prefix: "analysis",
});

const saveLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: "Too many journal save requests. Please try again later.",
  prefix: "save",
});

module.exports = {
  analysisLimiter,
  saveLimiter,
};
