import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiDataResponse, ApiErrorResponses } from "../../common/decorators/api.response.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { HealthResponseDto } from "./dto/health.response.dto";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ operationId: "getHealth", summary: "Check application health" })
  @ApiDataResponse(HealthResponseDto)
  @ApiErrorResponses()
  getHealth(): HealthResponseDto {
    return { status: "ok" };
  }
}
