// Import required libraries
import { Request } from 'express'; // Type cho Express request object
import { stringUtils } from 'mvc-common-toolkit'; // Utility to mask sensitive data
import { Observable, tap } from 'rxjs'; // RxJS for handling streams and side effects

import {
  CallHandler, // Interface for handling next request
  ExecutionContext, // Context containing current request information
  Injectable, // Decorator to mark class as injectable
  Logger, // NestJS logger
  NestInterceptor, // Interface cho interceptor
} from '@nestjs/common';

import { getLogId } from '@shared/decorators/logging'; // Function to get log ID

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  // Create logger instance with timestamp
  private logger = new Logger(this.constructor.name, { timestamp: true });

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    // Get Express request object from context
    const request: Request = context.switchToHttp().getRequest();
    // Get unique log ID for this request (to track request across services)
    const logId = getLogId(request);

    // Determine user IP with fallback logic:
    // 1. Try to get from request.ip (direct connection)
    // 2. If not available, get from x-forwarded-for header (via proxy/load balancer)
    // 3. If still not available, use 'unknown_ip'
    const userIp =
      request.ip ||
      (request.headers['x-forwarded-for'] as string)?.split(',').shift() ||
      'unknown_ip';

    // Log request information:
    // - Log ID for tracking
    // - User IP
    // - User email (if authenticated)
    // - HTTP method (GET, POST, PUT, DELETE...)
    // - URL path
    // - Request body (if any, mask sensitive data and limit to 100 characters)
    this.logger.debug(
      `[${logId}]: IP:${userIp}: Request: ${(request as any).user?.email || ''} ${
        request.method
      } ${request.url} ${
        request.body
          ? JSON.stringify(request.body, stringUtils.maskFn).slice(0, 100)
          : ''
      }`,
    );

    // Process request and log response
    return next.handle().pipe(
      // tap() allows performing side effect (logging) without changing data stream
      tap((responseBody) => {
        // Log response information:
        // - Same log ID to match with request
        // - Same IP
        // - Response body (mask sensitive data and limit to 100 characters)
        this.logger.debug(
          `[${logId}]: IP:${userIp}: Response: ${JSON.stringify(
            responseBody,
            stringUtils.maskFn,
          ).slice(0, 100)}`,
        );
      }),
    );
  }
}
