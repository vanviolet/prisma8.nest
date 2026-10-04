import { EnumField, StringField } from "@/common/decorators/decorator.field";
import { PaginationQueryDto } from "@/common/dto/dto.pagination.query";
import { SortOrder } from "@/common/enums/enum.sort.order";

export const user_sort_fields = [
  "created_at",
  "username",
  "nama",
] as const;
export type UserSortField = (typeof user_sort_fields)[number];

export class UserQueryDto extends PaginationQueryDto {
  @StringField({ required: false, max_length: 100 })
  search?: string;

  @EnumField(user_sort_fields, {
    enum_name: "UserSortField",
    required: false,
    default: "created_at",
  })
  sort_by: UserSortField = "created_at";

  @EnumField(SortOrder, {
    enum_name: "SortOrder",
    required: false,
    default: SortOrder.desc,
  })
  sort_order: SortOrder = SortOrder.desc;
}
