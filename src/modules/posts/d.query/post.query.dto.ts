import { EnumField, StringField } from "../../../common/decorators/field.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination.query.dto";
import { SortOrder } from "../../../common/enums/sort-order.enum";

export const POST_SORT_FIELDS = ["createdAt", "title"] as const;
export type PostSortField = (typeof POST_SORT_FIELDS)[number];

export class PostQueryDto extends PaginationQueryDto {
  @StringField({ required: false, maxLength: 100 })
  search?: string;

  @EnumField(POST_SORT_FIELDS, {
    enumName: "PostSortField",
    required: false,
    default: "createdAt",
  })
  sortBy: PostSortField = "createdAt";

  @EnumField(SortOrder, {
    enumName: "SortOrder",
    required: false,
    default: SortOrder.DESC,
  })
  sortOrder: SortOrder = SortOrder.DESC;
}
