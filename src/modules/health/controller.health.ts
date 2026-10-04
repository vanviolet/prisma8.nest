import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "../../common/decorators/decorator.api.endpoint";
import { ApiDataResponse, ApiErrorResponses } from "../../common/decorators/decorator.api.response";
import { Public } from "../../common/decorators/decorator.public";
import { HealthResponseDto } from "./d.response/dto.health.response";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiEndpoint({ summary: "Check application health" })
  @Public()
  @ApiDataResponse(HealthResponseDto)
  @ApiErrorResponses()
  get_health(): HealthResponseDto {
    return { status: "ok" };
  }
}
