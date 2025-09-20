// Import các thư viện cần thiết
import { Request } from 'express'; // Type cho Express request object
import { stringUtils } from 'mvc-common-toolkit'; // Utility để mask dữ liệu nhạy cảm
import { Observable, tap } from 'rxjs'; // RxJS để xử lý stream và side effects

import {
  CallHandler, // Interface để xử lý request tiếp theo
  ExecutionContext, // Context chứa thông tin về request hiện tại
  Injectable, // Decorator để đánh dấu class có thể inject
  Logger, // Logger của NestJS
  NestInterceptor, // Interface cho interceptor
} from '@nestjs/common';

import { getLogId } from '@shared/decorators/logging'; // Function để lấy log ID

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  // Tạo logger instance với timestamp
  private logger = new Logger(this.constructor.name, { timestamp: true });

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    // Lấy Express request object từ context
    const request: Request = context.switchToHttp().getRequest();
    // Lấy unique log ID cho request này (để track request qua các service)
    const logId = getLogId(request);

    // Xác định IP của user với fallback logic:
    // 1. Thử lấy từ request.ip (direct connection)
    // 2. Nếu không có, lấy từ header x-forwarded-for (qua proxy/load balancer)
    // 3. Nếu vẫn không có, dùng 'unknown_ip'
    const userIp =
      request.ip ||
      (request.headers['x-forwarded-for'] as string)?.split(',').shift() ||
      'unknown_ip';

    // Log thông tin request:
    // - Log ID để track
    // - IP của user
    // - Email user (nếu đã authenticate)
    // - HTTP method (GET, POST, PUT, DELETE...)
    // - URL path
    // - Request body (nếu có, mask dữ liệu nhạy cảm và giới hạn 100 ký tự)
    this.logger.debug(
      `[${logId}]: IP:${userIp}: Request: ${(request as any).user?.email || ''} ${
        request.method
      } ${request.url} ${
        request.body
          ? JSON.stringify(request.body, stringUtils.maskFn).slice(0, 100)
          : ''
      }`,
    );

    // Xử lý request và log response
    return next.handle().pipe(
      // tap() cho phép thực hiện side effect (logging) mà không thay đổi data stream
      tap((responseBody) => {
        // Log thông tin response:
        // - Cùng log ID để match với request
        // - Cùng IP
        // - Response body (mask dữ liệu nhạy cảm và giới hạn 100 ký tự)
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
