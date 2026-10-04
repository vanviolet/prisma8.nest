import { PaginationMetaDto } from "../../../common/dto/dto.pagination.meta";
import { NestedField } from "../../../common/decorators/decorator.field";
import { UploadResponseDto } from "./dto.upload.response";

export class UploadsResponseDto {
  @NestedField(() => UploadResponseDto, { each: true })
  data!: UploadResponseDto[];

  @NestedField(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}
