import { EnumField, StringField } from "../../../common/decorators/decorator.field";
import { PaginationQueryDto } from "../../../common/dto/dto.pagination.query";
import { SortOrder } from "../../../common/enums/enum.sort.order";

export const post_sort_fields = ["created_at", "title"] as const;
export type PostSortField = (typeof post_sort_fields)[number];

export class PostQueryDto extends PaginationQueryDto {
  @StringField({ required: false, max_length: 100 })
  search?: string;

  @EnumField(post_sort_fields, {
    enum_name: "PostSortField",
    required: false,
    default: "created_at",
  })
  sort_by: PostSortField = "created_at";

  @EnumField(SortOrder, {
    enum_name: "SortOrder",
    required: false,
    default: SortOrder.desc,
  })
  sort_order: SortOrder = SortOrder.desc;
}
