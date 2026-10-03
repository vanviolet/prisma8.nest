import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "../../common/decorators/api.endpoint.decorator";
import { ApiDataResponse, ApiErrorResponses } from "../../common/decorators/api.response.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { HealthResponseDto } from "./d.response/health.response.dto";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiEndpoint({ summary: "Check application health" })
  @Public()
  @ApiDataResponse(HealthResponseDto)
  @ApiErrorResponses()
  getHealth(): HealthResponseDto {
    return { status: "ok" };
  }
}
