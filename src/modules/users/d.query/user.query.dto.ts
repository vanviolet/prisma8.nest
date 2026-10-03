import { EnumField, StringField } from "../../../common/decorators/field.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination.query.dto";
import { UserRole } from "../../../common/enums/user-role.enum";
import { SortOrder } from "../../../common/enums/sort-order.enum";

export const USER_SORT_FIELDS = ["createdAt", "email", "name", "username", "role"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class UserQueryDto extends PaginationQueryDto {
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
