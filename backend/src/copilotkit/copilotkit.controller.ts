import { All, Controller, Req, Res, UseGuards, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../common/guards/supabase-auth.guard';
import { CopilotKitService } from './copilotkit.service';
import {
    CopilotRuntime,
    copilotRuntimeNestEndpoint,
    ExperimentalEmptyAdapter,
} from '@copilotkit/runtime';
import { LangGraphHttpAgent, LangGraphAgent } from "@copilotkit/runtime/langgraph";
/**
 * CopilotKit Controller
 * Handles all /copilotkit requests from the frontend
 * Protected by Supabase authentication
 * 
 * Includes error handling for:
 * - Aborted connections (user stops agent)
 * - Timeouts
 * - Agent service unavailability
 */
@Controller('copilotkit')
@UseGuards(SupabaseAuthGuard)
export class CopilotKitController {
    private readonly logger = new Logger(CopilotKitController.name);
    
    constructor(private readonly copilotKitService: CopilotKitService) { }

    /**
     * Main CopilotKit endpoint
     * Uses @All decorator to handle POST and OPTIONS for CORS
     */
    @All()
    async handleCopilotRequest(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        this.logger.log(`[${requestId}] CopilotKit request started`);

        try {
            const agentConfig = this.copilotKitService.getAgentConfig();

            // Initialize the runtime service adapter
            const serviceAdapter = new ExperimentalEmptyAdapter();

            // Create runtime with LangGraph agent
            const runtime = new CopilotRuntime({
                agents: {
                    // codesurf_agent: new LangGraphHttpAgent({
                    //     url: `${agentConfig.url}`,
                    //     // Note: Timeout is handled at the HTTP client level in LangGraph
                    // }),
                    codesurf_agent: new LangGraphAgent({
                        deploymentUrl:  "http://localhost:2024",
                        graphId: "codesurf_agent",
                        langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
                    }),
                },
            });

            // Use the official NestJS endpoint handler
            const handler = copilotRuntimeNestEndpoint({
                runtime,
                serviceAdapter,
                endpoint: '/copilotkit',
            });

            // Detect client disconnect
            let isAborted = false;
            req.on('close', () => {
                if (!res.writableEnded) {
                    isAborted = true;
                    this.logger.warn(`[${requestId}] Client disconnected before response completed`);
                }
            });

            // Handle the request with error catching
            await handler(req as Request, res);
            
            if (!isAborted) {
                this.logger.log(`[${requestId}] CopilotKit request completed successfully`);
            }
        } catch (error) {
            this.logger.error(
                `[${requestId}] CopilotKit request failed: ${error.message}`,
                error.stack,
            );

            // Only send error response if headers not sent
            if (!res.headersSent) {
                // Determine appropriate status code
                let statusCode = 500;
                let message = 'Internal server error';

                if (error.message?.includes('aborted') || error.name === 'AbortError') {
                    statusCode = 499; // Client Closed Request (nginx convention)
                    message = 'Request aborted by client';
                } else if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
                    statusCode = 504; // Gateway Timeout
                    message = 'Agent request timeout';
                } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ECONNRESET')) {
                    statusCode = 502; // Bad Gateway
                    message = 'Agent service unavailable';
                }

                res.status(statusCode).json({
                    error: error.name || 'Error',
                    message,
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }
}
