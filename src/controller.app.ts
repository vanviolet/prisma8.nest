import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "./common/decorators/decorator.api.endpoint";
import { ApiDataResponse } from "./common/decorators/decorator.api.response";
import { Public } from "./common/decorators/decorator.public";
import { RootResponseDto } from "./common/dto/dto.root.response";

@ApiTags("Application")
@Controller()
export class AppController {
  @Get()
  @ApiEndpoint({ summary: "Get application status" })
  @Public()
  @ApiDataResponse(RootResponseDto)
  get_root(): RootResponseDto {
    return { status: "ok" };
  }
}
