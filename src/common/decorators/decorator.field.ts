/**
 * field.decorators.ts  →  src/common/decorators/field.decorators.ts
 *
 * Satu decorator = Swagger (@ApiProperty) + validasi (class-validator) + normalisasi (class-transformer).
 *
 * Prasyarat (main.ts dan setup test):
 *   new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
 *   JANGAN aktifkan `transformOptions.enableImplicitConversion`, karena akan menimpa
 *   kontrol coercion di file ini dan membuat validator tipe jadi longgar.
 *
 * Aturan umum (berlaku untuk semua decorator):
 *   - required   : default true. `required: false` hanya mengizinkan `undefined`.
 *   - nullable   : default false. `null` ditolak kecuali `nullable: true`.
 *   - each       : field berupa array. Default `maxItems` = 100 (batasi payload), `minItems` opsional.
 *   - coerce     : default true. Mengubah string → number/boolean/array (berguna untuk query & param).
 *                  Set `false` untuk body yang harus ketat (tipe JSON harus tepat).
 *   - separator  : khusus `each`, memecah string jadi array, mis. `?ids=1,2,3` dengan separator ','.
 *   - Semua transform hanya berjalan satu arah (plain → class), tidak mengubah output serialisasi.
 *
 * Contoh:
 *   export class CreateUserDto {
 *     @StringField({ minLength: 3, maxLength: 50, example: 'Budi' })        name: string;
 *     @EmailField()                                                          email: string;
 *     @PasswordField({ strong: true })                                       password: string;
 *     @EnumField(Role, { enumName: 'Role', required: false })                role?: Role;
 *     @IntField({ min: 1, each: true, separator: ',' })                      groupIds: number[];
 *     @DateField({ dateOnly: true, max: () => new Date() })                  birthDate: Date;
 *     @NestedField(() => AddressDto)                                         address: AddressDto;
 *   }
 */
import { applyDecorators, type Type } from '@nestjs/common';
import { ApiProperty, type ApiPropertyOptions } from '@nestjs/swagger';
import { Transform, Type as TransformType } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsStrongPassword,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxDate,
  MaxLength,
  Min,
  MinDate,
  MinLength,
  ValidateIf,
  ValidateNested,
  type ValidationOptions,
} from 'class-validator';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. HELPER MURNI (tanpa dependensi library, mudah diuji terpisah)
 * ──────────────────────────────────────────────────────────────────────────── */
// <pure-helpers>
export interface BaseFieldOptions {
  description?: string;
  example?: unknown;
  default?: unknown;
  /** default: true. `false` = boleh tidak dikirim (undefined). */
  required?: boolean;
  /** default: false. `true` = boleh bernilai null. */
  nullable?: boolean;
  deprecated?: boolean;
  /** Field berupa array. */
  each?: boolean;
  min_items?: number;
  /** default: 100 */
  max_items?: number;
  /** default: true. Coercion string → number/boolean, dan nilai tunggal → array. */
  coerce?: boolean;
  /** Khusus `each`: pecah string menjadi array, mis. ','. */
  separator?: string;
}

type Fn = (value: unknown) => unknown;
const identity: Fn = (v) => v;

const default_max_items = 100;
const default_max_string = 255;

// Hanya angka desimal biasa. Menolak "0x10", "1e3", "Infinity", "", " ".
const numeric = /^[+-]?\d+(\.\d+)?$/;
const iso_date = /^\d{4}-\d{2}-\d{2}$/;
// Date-time wajib menyertakan zona waktu (Z atau ±hh:mm) supaya tidak ambigu.
const iso_datetime =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

function prune<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

function normalize_array(value: unknown, o: BaseFieldOptions): unknown {
  if (Array.isArray(value) || o.coerce === false) return value;
  if (typeof value === 'string' && o.separator) {
    return value
      .split(o.separator)
      .map((s) => s.trim())
      .filter((s) => s !== '');
  }
  return [value];
}

/** Bungkus fungsi per-nilai menjadi satu transformer yang paham array, null, dan undefined. */
function pipe(o: BaseFieldOptions, fn: Fn) {
  return ({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null) return value;
    if (!o.each) return fn(value);
    const list = normalize_array(value, o);
    return Array.isArray(list) ? list.map(fn) : list;
  };
}

function text_normalizer(o: {
  trim?: boolean;
  case?: 'lower' | 'upper';
}): Fn {
  return (v) => {
    if (typeof v !== 'string') return v;
    let s = o.trim === false ? v : v.trim();
    if (o.case === 'lower') s = s.toLowerCase();
    else if (o.case === 'upper') s = s.toUpperCase();
    return s;
  };
}

const to_number: Fn = (v) =>
  typeof v === 'string' && numeric.test(v.trim()) ? Number(v) : v;

/** Nilai yang tidak dikenali dikembalikan apa adanya, biar validator yang menolak. */
function boolean_parser(
  truthy: readonly string[] = [],
  falsy: readonly string[] = [],
): Fn {
  const yes = new Set(['true', '1', ...truthy.map((s) => s.toLowerCase())]);
  const no = new Set(['false', '0', ...falsy.map((s) => s.toLowerCase())]);
  return (v) => {
    if (v === 1) return true;
    if (v === 0) return false;
    if (typeof v !== 'string') return v;
    const s = v.trim().toLowerCase();
    return yes.has(s) ? true : no.has(s) ? false : v;
  };
}

/** String ISO 8601 → Date. Format lain, atau tanggal yang "meluber" (2026-02-31), dibiarkan agar IsDate menolak. */
function iso_date_parser(date_only: boolean): Fn {
  return (v) => {
    if (typeof v !== 'string') return v;
    const s = v.trim();
    if (!(iso_date.test(s) || (!date_only && iso_datetime.test(s)))) return v;

    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return v;

    const day = s.slice(0, 10);
    const probe = new Date(`${day}T00:00:00.000Z`);
    if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== day) {
      return v;
    }
    return parsed;
  };
}
// </pure-helpers>

/* ────────────────────────────────────────────────────────────────────────────
 * 2. BLOK PEMBANGUN INTERNAL
 * ──────────────────────────────────────────────────────────────────────────── */

const each = (o: BaseFieldOptions): ValidationOptions => ({
  each: o.each === true,
});

/** Metadata Swagger yang sama untuk semua tipe. */
function api(o: BaseFieldOptions, extra: Record<string, unknown>): PropertyDecorator {
  return ApiProperty(
    prune({
      description: o.description,
      example: o.example,
      default: o.default,
      required: o.required !== false,
      nullable: o.nullable,
      deprecated: o.deprecated,
      isArray: o.each,
      ...(o.each
        ? { minItems: o.min_items, maxItems: o.max_items ?? default_max_items }
        : {}),
      ...extra,
    }) as ApiPropertyOptions,
  );
}

/** optional / nullable → lewati semua validator hanya untuk nilai yang diizinkan. */
function presence(o: BaseFieldOptions): PropertyDecorator[] {
  const optional = o.required === false;
  const nullable = o.nullable === true;
  if (!optional && !nullable) return [];
  return [
    ValidateIf(
      (_: unknown, v: unknown) =>
        !((optional && v === undefined) || (nullable && v === null)),
    ),
  ];
}

function array_rules(o: BaseFieldOptions): PropertyDecorator[] {
  if (!o.each) return [];
  return [
    IsArray(),
    ArrayMaxSize(o.max_items ?? default_max_items),
    ...(o.min_items ? [ArrayMinSize(o.min_items)] : []),
  ];
}

const shape = (o: BaseFieldOptions): PropertyDecorator[] => [
  ...presence(o),
  ...array_rules(o),
];

function transformers(o: BaseFieldOptions, fn: Fn = identity): PropertyDecorator[] {
  if (fn === identity && !o.each) return [];
  return [Transform(pipe(o, fn), { toClassOnly: true })];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. STRING, EMAIL, PASSWORD, URL
 * ──────────────────────────────────────────────────────────────────────────── */

export interface StringFieldOptions extends BaseFieldOptions {
  /** default: 1. Isi 0 untuk mengizinkan string kosong. */
  min_length?: number;
  /** default: 255. Untuk teks panjang, set eksplisit. */
  max_length?: number;
  pattern?: RegExp;
  format?: string;
  /** default: true */
  trim?: boolean;
  case?: 'lower' | 'upper';
}

function string_rules(
  o: StringFieldOptions,
  swagger_extra: Record<string, unknown> = {},
): PropertyDecorator[] {
  const min = o.min_length ?? 1;
  const max = o.max_length ?? default_max_string;
  return [
    api(o, {
      type: String,
      minLength: min,
      maxLength: max,
      format: o.format,
      pattern: o.pattern?.source,
      ...swagger_extra,
    }),
    ...shape(o),
    IsString(each(o)),
    ...(min > 0 ? [MinLength(min, each(o))] : []),
    MaxLength(max, each(o)),
    ...(o.pattern ? [Matches(o.pattern, each(o))] : []),
    ...transformers(o, text_normalizer(o)),
  ];
}

export const StringField = (o: StringFieldOptions = {}) =>
  applyDecorators(...string_rules(o));

export type EmailFieldOptions = Omit<StringFieldOptions, 'pattern' | 'case' | 'trim'>;

/** Di-trim, di-lowercase, maksimal 254 karakter (batas praktis RFC 5321). */
export const EmailField = (o: EmailFieldOptions = {}) =>
  applyDecorators(
    ...string_rules(
      { ...o, trim: true, case: 'lower', max_length: o.max_length ?? 254 },
      { format: 'email' },
    ),
    IsEmail(undefined, each(o)),
  );

type StrongPasswordOptions = NonNullable<Parameters<typeof IsStrongPassword>[0]>;

export interface PasswordFieldOptions
  extends Omit<StringFieldOptions, 'trim' | 'case' | 'pattern'> {
  /**
   * `true` = minimal 1 huruf kecil, 1 huruf besar, 1 angka. Atau berikan opsi `IsStrongPassword` sendiri.
   */
  strong?: boolean | StrongPasswordOptions;
}

/**
 * Tidak pernah di-trim (spasi bisa jadi bagian dari password). Default panjang 8–128:
 * batas atas mencegah input raksasa yang membebani hashing. Di Swagger: writeOnly.
 */
export const PasswordField = (o: PasswordFieldOptions = {}) => {
  const min = o.min_length ?? 8;
  const { strong, ...rest } = o;
  return applyDecorators(
    ...string_rules(
      { ...rest, min_length: min, max_length: o.max_length ?? 128, trim: false },
      { format: 'password', writeOnly: true },
    ),
    ...(strong
      ? [
          IsStrongPassword(
            strong === true
              ? { minLength: min, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 }
              : strong,
            each(o),
          ),
        ]
      : []),
  );
};

export interface UrlFieldOptions extends Omit<StringFieldOptions, 'pattern' | 'case'> {
  /** default: ['http', 'https'] */
  protocols?: string[];
  /** default: true. Set false untuk mengizinkan host seperti `localhost`. */
  require_tld?: boolean;
}

export const url_field = (o: UrlFieldOptions = {}) =>
  applyDecorators(
    ...string_rules(
      { ...o, max_length: o.max_length ?? 2048 },
      { format: 'uri' },
    ),
    IsUrl(
      {
        protocols: o.protocols ?? ['http', 'https'],
        require_protocol: true,
        require_tld: o.require_tld !== false,
      },
      each(o),
    ),
  );

/* ────────────────────────────────────────────────────────────────────────────
 * 4. NUMBER, INT, BOOLEAN
 * ──────────────────────────────────────────────────────────────────────────── */

export interface NumberFieldOptions extends BaseFieldOptions {
  /** Hanya bilangan bulat. */
  int?: boolean;
  min?: number;
  max?: number;
  /** Hanya untuk non-int. */
  max_decimal_places?: number;
}

/** NaN dan Infinity selalu ditolak. String desimal ("5", "-3.2") diubah ke number bila `coerce` aktif. */
export const number_field = (o: NumberFieldOptions = {}) =>
  applyDecorators(
    api(o, {
      type: o.int ? 'integer' : Number,
      minimum: o.min,
      maximum: o.max,
    }),
    ...shape(o),
    o.int
      ? IsInt(each(o))
      : IsNumber(
          {
            allowNaN: false,
            allowInfinity: false,
            maxDecimalPlaces: o.max_decimal_places,
          },
          each(o),
        ),
    ...(o.min !== undefined ? [Min(o.min, each(o))] : []),
    ...(o.max !== undefined ? [Max(o.max, each(o))] : []),
    ...transformers(o, o.coerce === false ? identity : to_number),
  );

export const IntField = (o: Omit<NumberFieldOptions, 'int' | 'maxDecimalPlaces'> = {}) =>
  number_field({ ...o, int: true });

export interface BooleanFieldOptions extends BaseFieldOptions {
  /** Sinonim tambahan untuk true (selain "true" dan "1"), mis. ['on', 'yes']. */
  truthy?: readonly string[];
  /** Sinonim tambahan untuk false (selain "false" dan "0"). */
  falsy?: readonly string[];
}

/** Nilai di luar daftar (mis. "abc", null) tidak diubah menjadi false, tapi ditolak. */
export const boolean_field = (o: BooleanFieldOptions = {}) =>
  applyDecorators(
    api(o, { type: Boolean }),
    ...shape(o),
    IsBoolean(each(o)),
    ...transformers(
      o,
      o.coerce === false ? identity : boolean_parser(o.truthy, o.falsy),
    ),
  );

/* ────────────────────────────────────────────────────────────────────────────
 * 5. UUID, ENUM, DATE
 * ──────────────────────────────────────────────────────────────────────────── */

export interface UuidFieldOptions extends BaseFieldOptions {
  version?: Parameters<typeof IsUUID>[0];
}

export const uuid_field = (o: UuidFieldOptions = {}) =>
  applyDecorators(
    api(o, { type: String, format: 'uuid' }),
    ...shape(o),
    IsUUID(o.version, each(o)),
    ...transformers(o, text_normalizer({ trim: true })),
  );

export type EnumLike = Record<string, string | number> | readonly (string | number)[];

/**
 * `enumName` wajib agar Swagger membuat komponen skema yang bisa dipakai ulang.
 * Bisa langsung memakai enum dari Prisma, mis. `EnumField(Role, { enumName: 'Role' })`.
 */
export const EnumField = (
  enum_obj: EnumLike,
  o: BaseFieldOptions & { enum_name: string },
) =>
  applyDecorators(
    api(o, {
      enum: Array.isArray(enum_obj) ? [...enum_obj] : enum_obj,
      enumName: o.enum_name,
    }),
    ...shape(o),
    IsEnum(enum_obj, each(o)),
    ...transformers(o),
  );

export interface DateFieldOptions extends BaseFieldOptions {
  /** Hanya terima "YYYY-MM-DD". Default: juga terima date-time ISO 8601 dengan zona waktu. */
  date_only?: boolean;
  min?: Date | (() => Date);
  max?: Date | (() => Date);
}

/**
 * Input: string ISO 8601 (angka timestamp, "5", atau "2026-10-04T10:00" tanpa zona waktu ditolak).
 * Output: objek `Date`. Tanggal tak valid seperti 2026-02-31 ditolak.
 */
export const date_field = (o: DateFieldOptions = {}) =>
  applyDecorators(
    api(o, { type: String, format: o.date_only ? 'date' : 'date-time' }),
    ...shape(o),
    IsDate(each(o)),
    ...(o.min ? [MinDate(o.min, each(o))] : []),
    ...(o.max ? [MaxDate(o.max, each(o))] : []),
    ...transformers(o, iso_date_parser(o.date_only === true)),
  );

/* ────────────────────────────────────────────────────────────────────────────
 * 6. NESTED (objek / array objek)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * - Pakai lazy `() => Dto` supaya aman dari circular import.
 * - `IsDefined` memastikan nested wajib benar-benar ada (ValidateNested saja meloloskan undefined).
 * - `type: () => type()` memberi fungsi bernama "type" yang dikenali Swagger sebagai lazy type.
 */
export const NestedField = (type: () => Type<unknown>, o: BaseFieldOptions = {}) =>
  applyDecorators(
    api(o, { type: () => type() }),
    ...shape(o),
    ...(o.required !== false ? [IsDefined()] : []),
    ValidateNested(each(o)),
    TransformType(type),
  );
