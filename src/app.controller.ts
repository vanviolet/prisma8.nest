import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiDataResponse } from "./common/decorators/api.response.decorator";
import { Public } from "./common/decorators/public.decorator";
import { RootResponseDto } from "./common/dto/root.response.dto";

@ApiTags("Application")
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ operationId: "getRoot", summary: "Get application status" })
  @ApiDataResponse(RootResponseDto)
  getRoot(): RootResponseDto {
    return { status: "ok" };
  }
}
