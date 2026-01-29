import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Supabase Service
 * Provides JWT verification and user data retrieval
 */
@Injectable()
export class SupabaseService {
    private supabaseClient: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Verify JWT token and return user data
     * @param token - JWT access token from frontend
     * @returns User object if valid, null if invalid
     */
    async verifyToken(token: string): Promise<User | null> {
        try {
            const {
                data: { user },
                error,
            } = await this.supabaseClient.auth.getUser(token);

            if (error) {
                console.error('[SupabaseService] Token verification failed:', error.message);
                return null;
            }

            return user;
        } catch (error) {
            console.error('[SupabaseService] Unexpected error during verification:', error);
            return null;
        }
    }

    /**
     * Get the Supabase client instance (for advanced usage)
     */
    getClient(): SupabaseClient {
        return this.supabaseClient;
    }
}
