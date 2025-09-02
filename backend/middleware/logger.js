const logger = require("../config/logger");

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log the request
  logger.http(`${req.method} ${req.originalUrl} - ${req.ip}`);

  // Log request body for POST/PUT requests (excluding sensitive data)
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const sanitizedBody = { ...req.body };

    // Remove sensitive fields
    if (sanitizedBody.password) {
      sanitizedBody.password = "[REDACTED]";
    }
    if (sanitizedBody.token) {
      sanitizedBody.token = "[REDACTED]";
    }

    logger.debug("Request Body:", JSON.stringify(sanitizedBody, null, 2));
  }

  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    logger.debug("Query Parameters:", JSON.stringify(req.query, null, 2));
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;

    // Log response
    logger.http(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );

    // Log response data in debug mode
    if (process.env.NODE_ENV === "development") {
      logger.debug("Response:", JSON.stringify(data, null, 2));
    }

    return originalJson.call(this, data);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`);
  logger.error("Stack:", err.stack);

  // Log request details for debugging
  logger.error("Request Details:", {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
};
