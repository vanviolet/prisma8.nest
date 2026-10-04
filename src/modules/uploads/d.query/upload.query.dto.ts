import { EnumField, StringField } from "../../../common/decorators/field.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination.query.dto";
import { SortOrder } from "../../../common/enums/sort-order.enum";
import { UPLOAD_SORT_FIELDS, type UploadSortField } from "../uploads.constants";

export class UploadQueryDto extends PaginationQueryDto {
  @StringField({ required: false, maxLength: 100 })
  search?: string;

  @EnumField(UPLOAD_SORT_FIELDS, {
    enumName: "UploadSortField",
    required: false,
    default: "createdAt",
  })
  sortBy: UploadSortField = "createdAt";

  @EnumField(SortOrder, {
    enumName: "SortOrder",
    required: false,
    default: SortOrder.DESC,
  })
  sortOrder: SortOrder = SortOrder.DESC;
}
