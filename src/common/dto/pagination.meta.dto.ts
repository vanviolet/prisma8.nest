import { IntField } from "../decorators/field.decorator";

export class PaginationMetaDto {
  @IntField({ example: 1, min: 1 })
  page!: number;

  @IntField({ example: 20, min: 1, max: 100 })
  limit!: number;

  @IntField({ example: 100, min: 0 })
  total!: number;

  @IntField({ example: 5, min: 0 })
  totalPages!: number;
}
