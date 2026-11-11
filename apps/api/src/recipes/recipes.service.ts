import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRecipeDto) {
    return this.prisma.recipe.create({ data: dto });
  }

  findAll() {
    return this.prisma.recipe.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  async update(id: number, dto: UpdateRecipeDto) {
    await this.findOne(id);
    return this.prisma.recipe.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.recipe.delete({ where: { id } });
  }
}