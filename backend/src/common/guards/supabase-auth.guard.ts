import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../services/supabase.service';
import { User } from '@supabase/supabase-js';

/**
 * Extend Express Request to include user data
 */
export interface AuthenticatedRequest extends Request {
    user: User;
}

/**
 * Supabase Authentication Guard
 * Validates JWT tokens from Authorization header
 * Attaches user data to request object
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    constructor(private readonly supabaseService: SupabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Missing authorization token');
        }

        const user = await this.supabaseService.verifyToken(token);

        if (!user) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        // Attach user to request for downstream use
        request.user = user;

        return true;
    }

    /**
     * Extract JWT token from Authorization header
     * Supports format: "Bearer <token>" or just "<token>"
     */
    private extractTokenFromHeader(request: Request): string | null {
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            return null;
        }

        // Handle "Bearer <token>" format
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Handle raw token
        return authHeader;
    }
}
