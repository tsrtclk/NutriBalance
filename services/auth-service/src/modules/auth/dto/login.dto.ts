import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

export class LoginDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  device_id?: string;
}
