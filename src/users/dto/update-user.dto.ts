import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../generated/prisma/client.js';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alex Morgan', maxLength: 100 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'alex@studio.co', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: 'Product Designer', maxLength: 100 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example:
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined && value !== null && value !== '')
  @IsUrl(
    { require_protocol: true },
    { message: 'sheetUrl must be a valid URL with protocol (e.g. https://...)' },
  )
  sheetUrl?: string | null;
}
