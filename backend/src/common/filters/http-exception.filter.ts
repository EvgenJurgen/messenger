import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { ERROR_KEYS } from '../constants/error-messages.js';
import { getErrorMessage } from '../constants/error-messages.js';
import type { ErrorResponseBody } from '../interfaces/error-response.interface.js';

/**
 * Global exception filter. Ensures every error response has { errorKey, errorMessage }
 * for i18n (key) and fallback display (message) on the frontend.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorKey: string = ERROR_KEYS.ERROR_GENERIC;
    let errorMessage: string = getErrorMessage(ERROR_KEYS.ERROR_GENERIC);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (this.isErrorResponseBody(response)) {
        errorKey = response.errorKey;
        errorMessage = response.errorMessage;
      } else if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = (response as { message: string | string[] }).message;
        if (Array.isArray(msg) && msg.length > 0) {
          const first = msg[0];
          errorKey = typeof first === 'string' ? first : ERROR_KEYS.ERROR_GENERIC;
          errorMessage = getErrorMessage(errorKey);
        } else if (typeof msg === 'string') {
          errorKey = msg;
          errorMessage = getErrorMessage(msg);
        }
      } else if (typeof response === 'string') {
        errorMessage = response;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const body: ErrorResponseBody = { errorKey, errorMessage };
    res.status(status).json(body);
  }

  private isErrorResponseBody(value: unknown): value is ErrorResponseBody {
    return (
      typeof value === 'object' &&
      value !== null &&
      'errorKey' in value &&
      'errorMessage' in value
    );
  }
}
