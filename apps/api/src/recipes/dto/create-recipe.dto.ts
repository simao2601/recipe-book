import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  steps: string[];

  @IsOptional()
  @IsInt()
  categoryId?: number;
}