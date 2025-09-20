// Import các thư viện cần thiết
import {
  AuditService, // Service để ghi log audit
  ErrorLog, // Class để tạo error log
  HttpResponse, // Interface cho HTTP response
  stringUtils, // Utility để mask dữ liệu nhạy cảm
} from 'mvc-common-toolkit';
import { Observable, catchError, map, of } from 'rxjs'; // RxJS operators

import {
  CallHandler, // Interface để xử lý request tiếp theo
  ExecutionContext, // Context chứa thông tin về request
  HttpException, // Exception class của NestJS
  HttpStatus, // HTTP status codes
  Injectable, // Decorator để đánh dấu class có thể inject
  Logger, // Logger của NestJS
  NestInterceptor, // Interface cho interceptor
} from '@nestjs/common';

import { APP_ACTION, ERR_CODE, HEADER_KEY } from '@shared/constants'; // Constants

/**
 * Interceptor để chuẩn hóa format response và xử lý errors
 * Tự động format tất cả responses thành format chuẩn và log errors
 */
@Injectable()
export class HttpResponseInterceptor implements NestInterceptor {
  // Logger instance
  protected logger = new Logger(HttpResponseInterceptor.name);

  // Inject AuditService để ghi log errors
  constructor(protected auditService: AuditService) {}


  public intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    // Lấy request object và thông tin user
    const httpReq: any = ctx.switchToHttp().getRequest();
    const user = httpReq.activeUser || httpReq.user; // Lấy user từ request (có thể từ guard hoặc middleware)
    const logId = ctx.switchToHttp().getRequest().headers[HEADER_KEY.LOG_ID]; // Lấy log ID để track

    return next.handle().pipe(
      // map() để transform response thành format chuẩn
      map((response: HttpResponse) => {
        // Nếu response đã có httpCode, trả về nguyên vẹn (đã được format)
        if (response?.httpCode) {
          return response;
        }

        // Nếu response có success: false, format thành error response
        if (response?.success === false) {
          return {
            success: false,
            code: response.code, // Error code
            httpCode: response.httpCode || HttpStatus.INTERNAL_SERVER_ERROR, // HTTP status code
            message: response.message, // Error message
          };
        }

        // Nếu response có success: true, xóa field success và chỉ giữ data
        if (response?.success === true) {
          delete response.success;
        }

        // Lấy payload từ response.data hoặc toàn bộ response
        const payload = response?.data ?? response;

        // Format thành success response chuẩn
        return { data: payload, success: true };
      }),
      // catchError() để xử lý errors
      catchError((error) => {
        // Log error với stack trace
        this.logger.error(error.message, error.stack);

        // Nếu không phải HttpException (lỗi không được handle)
        if (!(error instanceof HttpException)) {
          // Ghi log error vào audit service với thông tin chi tiết:
          // - logId để track
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
                user: JSON.stringify(user, stringUtils.maskFn), // Mask dữ liệu nhạy cảm
                payload: httpReq.body
                  ? JSON.stringify(httpReq.body, stringUtils.maskFn) // Mask request body
                  : '',
              },
            }),
          );

          // Trả về generic error response để không expose internal errors
          return of({
            success: false,
            message: 'internal server error',
            code: ERR_CODE.INTERNAL_SERVER_ERROR,
          });
        }

        // Nếu là HttpException, trả về nguyên vẹn (đã được handle properly)
        return of(error);
      }),
    );
  }
}
