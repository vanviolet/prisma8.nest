import { EnumField, StringField } from "../../../common/decorators/decorator.field";
import { PaginationQueryDto } from "../../../common/dto/dto.pagination.query";
import { SortOrder } from "../../../common/enums/enum.sort.order";
import { upload_sort_fields, type UploadSortField } from "../constants.uploads";

export class UploadQueryDto extends PaginationQueryDto {
  @StringField({ required: false, max_length: 100 })
  search?: string;

  @EnumField(upload_sort_fields, {
    enum_name: "UploadSortField",
    required: false,
    default: "created_at",
  })
  sort_by: UploadSortField = "created_at";

  @EnumField(SortOrder, {
    enum_name: "SortOrder",
    required: false,
    default: SortOrder.desc,
  })
  sort_order: SortOrder = SortOrder.desc;
}
