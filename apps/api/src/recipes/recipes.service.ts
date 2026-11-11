import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user.interface';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRecipeDto, authorId: number) {
    return this.prisma.recipe.create({ data: { ...dto, authorId } });
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

  async update(id: number, dto: UpdateRecipeDto, user: AuthUser) {
    const recipe = await this.findOne(id);
    this.assertCanModify(recipe.authorId, user);
    return this.prisma.recipe.update({ where: { id }, data: dto });
  }

  async remove(id: number, user: AuthUser) {
    const recipe = await this.findOne(id);
    this.assertCanModify(recipe.authorId, user);
    return this.prisma.recipe.delete({ where: { id } });
  }

  // Só o autor (ou um admin) pode alterar ou apagar
  private assertCanModify(authorId: number, user: AuthUser) {
    if (user.role !== 'ADMIN' && user.id !== authorId) {
      throw new ForbiddenException('You can only modify your own recipes');
    }
  }
}