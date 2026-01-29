import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for incoming CopilotKit requests
 * Validates the structure of requests from the frontend
 */
export class CopilotKitRequestDto {
    @IsString()
    @IsOptional()
    threadId?: string;

    @IsString()
    @IsOptional()
    message?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    // CopilotKit may send additional fields
    [key: string]: any;
}
