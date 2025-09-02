# Logging and Debugging Guide

This document explains the logging and debugging setup for the Aspire Expenses backend.

## 🚀 Quick Start

### Development Mode (Debug Enabled)

```bash
# Set environment variables
export NODE_ENV=development
export LOG_LEVEL=debug
export DEBUG_MODE=true
export VERBOSE_LOGGING=true

# Start the server
npm run dev
```

### Production Mode (Minimal Logging)

```bash
# Set environment variables
export NODE_ENV=production
export LOG_LEVEL=warn
export DEBUG_MODE=false
export VERBOSE_LOGGING=false

# Start the server
npm start
```

## 📊 Logging Configuration

### Environment Variables

| Variable          | Default                       | Description            |
| ----------------- | ----------------------------- | ---------------------- |
| `NODE_ENV`        | `development`                 | Environment mode       |
| `LOG_LEVEL`       | `debug` (dev) / `warn` (prod) | Logging level          |
| `LOG_TO_FILE`     | `true`                        | Enable file logging    |
| `DEBUG_MODE`      | `true` (dev) / `false` (prod) | Enable debug features  |
| `VERBOSE_LOGGING` | `true` (dev) / `false` (prod) | Enable verbose logging |

### Log Levels

- **error**: Error messages only
- **warn**: Warning and error messages
- **info**: Informational messages, warnings, and errors
- **http**: HTTP requests, info, warnings, and errors
- **debug**: All messages (most verbose)

## 📁 Log Files

When `LOG_TO_FILE=true`, logs are written to:

- `logs/error.log` - Error messages only
- `logs/combined.log` - All log messages

## 🔍 Debug Features

### Request/Response Logging

- All HTTP requests are logged with method, URL, and response time
- Request bodies are logged (sensitive data is redacted)
- Response data is logged in development mode

### Error Logging

- Full stack traces for all errors
- Request details included in error logs
- Different error handling for development vs production

### Route Testing

```bash
# Test API routes
npm run test:routes
```

## 🛠️ Troubleshooting

### Common Issues

1. **Routes not found (404)**

   - Check the route definitions in `routes/` files
   - Verify the API endpoints match frontend expectations
   - Check logs for detailed request information

2. **Authentication errors (401)**

   - Verify JWT token is being sent correctly
   - Check token expiration
   - Ensure user is authenticated

3. **Database connection issues**
   - Check MongoDB connection string
   - Verify database is running
   - Check network connectivity

### Debug Commands

```bash
# View real-time logs
tail -f logs/combined.log

# View only errors
tail -f logs/error.log

# Test specific routes
curl -X GET http://localhost:5000/api/health
curl -X GET http://localhost:5000/api/expenses/groups/test-id/expenses
```

## 📋 API Routes Fixed

The following routes have been added/fixed:

### Expense Routes

- `GET /api/expenses/groups/:groupId/expenses` - Get group expenses
- `GET /api/expenses/groups/:groupId/expenses/summary` - Get expense summary
- `GET /api/expenses/group/:groupId` - Alternative group expenses route
- `GET /api/expenses/group/:groupId/summary` - Alternative summary route

### Response Format

The API now returns data in the format expected by the frontend:

```json
{
  "data": [...],
  "totalPages": 5,
  "currentPage": 1,
  "total": 50,
  "limit": 10
}
```

## 🔧 Development Tips

1. **Enable Debug Mode**: Set `DEBUG_MODE=true` for detailed logging
2. **Check Logs**: Always check the console and log files for errors
3. **Test Routes**: Use the test script to verify routes are working
4. **Monitor Performance**: Response times are logged for each request
5. **Error Tracking**: All errors are logged with full context

## 📈 Performance Monitoring

The logging system includes:

- Request/response timing
- Database query performance
- Memory usage tracking
- Error frequency monitoring

## 🚨 Production Considerations

- Set `NODE_ENV=production` for production deployments
- Use `LOG_LEVEL=warn` to reduce log volume
- Enable log rotation for file logs
- Monitor log file sizes
- Set up log aggregation for distributed deployments
