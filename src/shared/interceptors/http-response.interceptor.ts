// Import required libraries
import {
  AuditService, // Service for audit logging
  ErrorLog, // Class for creating error logs
  HttpResponse, // Interface for HTTP response
  stringUtils, // Utility for masking sensitive data
} from 'mvc-common-toolkit';
import { Observable, catchError, map, of } from 'rxjs'; // RxJS operators

import {
  CallHandler, // Interface for handling next request
  ExecutionContext, // Context containing request information
  HttpException, // NestJS exception class
  HttpStatus, // HTTP status codes
  Injectable, // Decorator to mark class as injectable
  Logger, // NestJS logger
  NestInterceptor, // Interface cho interceptor
} from '@nestjs/common';

import { APP_ACTION, ERR_CODE, HEADER_KEY } from '@shared/constants'; // Constants

/**
 * Interceptor to standardize response format and handle errors
 * Automatically formats all responses to standard format and logs errors
 */
@Injectable()
export class HttpResponseInterceptor implements NestInterceptor {
  // Logger instance
  protected logger = new Logger(HttpResponseInterceptor.name);

  // Inject AuditService for error logging
  constructor(protected auditService: AuditService) {}

  public intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    // Get request object and user information
    const httpReq: any = ctx.switchToHttp().getRequest();
    const user = httpReq.activeUser || httpReq.user; // Get user from request (may be from guard or middleware)
    const logId = ctx.switchToHttp().getRequest().headers[HEADER_KEY.LOG_ID]; // Get log ID for tracking

    return next.handle().pipe(
      // map() to transform response to standard format
      map((response: HttpResponse) => {
        // If response already has httpCode, return as is (already formatted)
        if (response?.httpCode) {
          return response;
        }

        // If response has success: false, format as error response
        if (response?.success === false) {
          return {
            success: false,
            code: response.code, // Error code
            httpCode: response.httpCode || HttpStatus.INTERNAL_SERVER_ERROR, // HTTP status code
            message: response.message, // Error message
          };
        }

        // If response has success: true, remove success field and keep only data
        if (response?.success === true) {
          delete response.success;
        }

        // Get payload from response.data or entire response
        const payload = response?.data ?? response;

        // Format as standard success response
        return { data: payload, success: true };
      }),
      // catchError() to handle errors
      catchError((error) => {
        // Log error with stack trace
        this.logger.error(error.message, error.stack);

        // If not HttpException (unhandled error)
        if (!(error instanceof HttpException)) {
          // Log error to audit service with detailed information:
          // - logId for tracking
          // - action type
          // - error message
          // - user ID
          // - metadata: URL, user info (masked), request payload (masked)
          this.auditService.emitLog(
            new ErrorLog({
              logId,
              action: APP_ACTION.HANDLE_EXCEPTION,
              message: error.message,
              userId: user?.id || 'unknown',
              metadata: {
                url: httpReq.url,
                user: JSON.stringify(user, stringUtils.maskFn), // Mask sensitive data
                payload: httpReq.body
                  ? JSON.stringify(httpReq.body, stringUtils.maskFn) // Mask request body
                  : '',
              },
            }),
          );

          // Return generic error response to avoid exposing internal errors
          return of({
            success: false,
            message: 'internal server error',
            code: ERR_CODE.INTERNAL_SERVER_ERROR,
          });
        }

        // If HttpException, return as is (already handled properly)
        return of(error);
      }),
    );
  }
}
