export class TokensDto {
  access_token!: string;
  refresh_token!: string;
  token_type!: "Bearer";
  /** Access-token lifetime in seconds. */
  expires_in!: number;
}

export class UserResponseDto {
  id!: string;
  email!: string;
  full_name!: string;
  locale!: string;
  auth_level!: number;
  created_at!: Date;
}

export class AuthResponseDto {
  user!: UserResponseDto;
  tokens!: TokensDto;
}
