import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint
   * Returns service status and agent connectivity
   */
  @Get('health')
  async healthCheck() {
    const agentUrl = this.configService.get<string>('AGENT_URL');
    
    // Check if agent is reachable
    let agentStatus = 'unknown';
    try {
      const response = await fetch(`${agentUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      agentStatus = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      agentStatus = 'unreachable';
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'healthy',
        agent: agentStatus,
      },
    };
  }
}
