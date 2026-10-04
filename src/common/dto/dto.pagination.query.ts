import { IntField } from "@/common/decorators/decorator.field";

export class PaginationQueryDto {
  @IntField({ required: false, min: 1, default: 1 })
  page: number = 1;

  @IntField({ required: false, min: 1, max: 100, default: 20 })
  limit: number = 20;
}
