export class NotificationResponseDto {
  id!: string;
  user_id!: string;
  type!: string;
  title!: string;
  body!: string;
  sent_at!: Date;
  read_at!: Date | null;
}
