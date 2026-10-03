import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { UserRole } from "../enums/user-role.enum";
import { SortOrder } from "../enums/sort-order.enum";

export const USER_SORT_FIELDS = ["createdAt", "email", "name", "username", "role"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: USER_SORT_FIELDS, enumName: "UserSortField", default: "createdAt" })
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sortBy: UserSortField = "createdAt";

  @ApiPropertyOptional({ enum: [SortOrder.ASC, SortOrder.DESC], enumName: "SortOrder", default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ enum: UserRole, enumName: "UserRole" })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
