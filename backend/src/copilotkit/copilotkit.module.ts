import { Module } from '@nestjs/common';
import { CopilotKitController } from './copilotkit.controller';
import { CopilotKitService } from './copilotkit.service';
import { SupabaseService } from '../common/services/supabase.service';

/**
 * CopilotKit Module
 * Encapsulates all CopilotKit-related functionality
 */
@Module({
    controllers: [CopilotKitController],
    providers: [CopilotKitService, SupabaseService],
    exports: [CopilotKitService],
})
export class CopilotKitModule { }
