import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@supabase/supabase-js';

/**
 * CopilotKit Service
 * Manages agent configuration and runtime properties
 */
@Injectable()
export class CopilotKitService {
    private agentUrl: string;
    private internalKey: string;

    constructor(private configService: ConfigService) {
        this.agentUrl = this.configService.get<string>('AGENT_URL')!;
        this.internalKey = this.configService.get<string>('AGENT_INTERNAL_KEY')!;
    }

    /**
     * Get agent configuration
     */
    getAgentConfig() {
        return {
            url: this.agentUrl,
            internalKey: this.internalKey,
        };
    }

    /**
     * Create user-specific properties for agent requests
     * These will be forwarded to the Python agent
     */
    createUserProperties(user: User): Record<string, any> {
        return {
            userId: user.id,
            userEmail: user.email || '',
            authorization: user, // Full user object for context
        };
    }
}
