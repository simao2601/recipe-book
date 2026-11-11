import { IsOptional, IsString } from 'class-validator';

export class QueryRecipesDto {
  // separated list by commas: "cheese,eggs"
  @IsOptional()
  @IsString()
  ingredients?: string;
}