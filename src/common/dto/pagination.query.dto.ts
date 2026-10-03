import { EnumField, IntField, StringField } from "../decorators/field.decorator";
import { UserRole } from "../enums/user-role.enum";
import { SortOrder } from "../enums/sort-order.enum";

export const USER_SORT_FIELDS = ["createdAt", "email", "name", "username", "role"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class PaginationQueryDto {
  @IntField({ required: false, min: 1, default: 1 })
  page: number = 1;

  @IntField({ required: false, min: 1, max: 100, default: 20 })
  limit: number = 20;

  @StringField({ required: false, maxLength: 100 })
  search?: string;

  @EnumField(USER_SORT_FIELDS, {
    enumName: "UserSortField",
    required: false,
    default: "createdAt",
  })
  sortBy: UserSortField = "createdAt";

  @EnumField(SortOrder, {
    enumName: "SortOrder",
    required: false,
    default: SortOrder.DESC,
  })
  sortOrder: SortOrder = SortOrder.DESC;

  @EnumField(UserRole, { enumName: "UserRole", required: false })
  role?: UserRole;
}
