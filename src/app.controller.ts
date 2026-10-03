import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "./common/decorators/api.endpoint.decorator";
import { ApiDataResponse } from "./common/decorators/api.response.decorator";
import { Public } from "./common/decorators/public.decorator";
import { RootResponseDto } from "./common/dto/root.response.dto";

@ApiTags("Application")
@Controller()
export class AppController {
  @Get()
  @ApiEndpoint({ summary: "Get application status" })
  @Public()
  @ApiDataResponse(RootResponseDto)
  getRoot(): RootResponseDto {
    return { status: "ok" };
  }
}
