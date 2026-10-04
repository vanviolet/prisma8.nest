import { PaginationMetaDto } from "../../../common/dto/pagination.meta.dto";
import { NestedField } from "../../../common/decorators/field.decorator";
import { UploadResponseDto } from "./upload.response.dto";

export class UploadsResponseDto {
  @NestedField(() => UploadResponseDto, { each: true })
  data!: UploadResponseDto[];

  @NestedField(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}
