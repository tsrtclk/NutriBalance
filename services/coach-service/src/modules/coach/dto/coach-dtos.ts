import { IsOptional, IsString, Length, Matches } from "class-validator";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ChatDto {
  @IsString()
  @Length(1, 2000)
  message!: string;
}

export class DateQueryDto {
  @IsOptional()
  @Matches(ISO_DATE)
  date?: string;
}

export class WeekQueryDto {
  @IsOptional()
  @Matches(ISO_DATE)
  week_start?: string;
}
