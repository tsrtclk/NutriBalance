export class ExerciseResponseDto {
  id!: string;
  owner_id!: string | null;
  name!: string;
  muscle_group!: string;
  equipment!: string;
  instructions!: string | null;
  media_url!: string | null;
}
