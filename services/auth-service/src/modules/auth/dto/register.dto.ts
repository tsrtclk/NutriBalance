import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  /** bcrypt only reads the first 72 bytes — cap the DTO at the same limit. */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @Length(1, 100)
  full_name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  device_id?: string;
}
