import { IsString, IsUrl, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Environment Variables Validation Schema
 * Uses class-validator to ensure all required env vars are present and valid
 */
export class EnvironmentVariables {
    // Server Configuration
    @IsInt()
    @Min(1024)
    @Max(65535)
    @Type(() => Number)
    PORT: number;

    @IsEnum(['development', 'production', 'test'])
    NODE_ENV: 'development' | 'production' | 'test';

    // Supabase Configuration
    @IsUrl({ require_tld: false })
    SUPABASE_URL: string;

    @IsString()
    SUPABASE_ANON_KEY: string;

    @IsString()
    SUPABASE_JWT_SECRET: string;

    // Agent Server Configuration
    @IsUrl({ require_tld: false })
    AGENT_URL: string;

    @IsString()
    AGENT_INTERNAL_KEY: string;

    // Optional: CopilotKit Cloud
    @IsString()
    COPILOT_CLOUD_PUBLIC_API_KEY?: string;
}
