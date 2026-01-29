import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global Exception Filter
 * Catches all unhandled exceptions and prevents server crashes
 * Especially important for streaming responses and aborted connections
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if response is already sent (common with streaming)
    if (response.headersSent) {
      this.logger.warn(
        `Exception occurred after headers sent: ${this.getExceptionMessage(exception)}`,
      );
      // Can't send response, just log and return
      return;
    }

    // Determine status code and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'UnknownError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
      error = exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Handle specific error types
      if (error === 'AbortError' || message.includes('aborted')) {
        status = HttpStatus.REQUEST_TIMEOUT;
        message = 'Request was aborted by client';
        error = 'RequestAborted';
      } else if (error === 'TimeoutError' || message.includes('timeout')) {
        status = HttpStatus.REQUEST_TIMEOUT;
        message = 'Request timeout';
        error = 'RequestTimeout';
      } else if (message.includes('ECONNREFUSED') || message.includes('ECONNRESET')) {
        status = HttpStatus.BAD_GATEWAY;
        message = 'Agent service unavailable';
        error = 'ServiceUnavailable';
      }
    }

    // Log the error with context
    this.logger.error(
      `${request.method} ${request.url} - ${error}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send error response
    try {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        error,
        message,
      });
    } catch (sendError) {
      // If we can't send response, just log
      this.logger.error('Failed to send error response', sendError);
    }
  }

  private getExceptionMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return String(exception);
  }
}
