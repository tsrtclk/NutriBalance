import { IsString, MaxLength, MinLength } from "class-validator";

/** É12 RGPD — deleting the account re-confirms the password (D14). */
export class DeleteAccountDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
