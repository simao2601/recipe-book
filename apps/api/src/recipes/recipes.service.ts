import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto, IngredientInputDto } from './dto/create-recipe.dto';
import { QueryRecipesDto } from './dto/query-recipes.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

// O que devolvemos junto com cada receita
const recipeInclude = {
  author: { select: { id: true, username: true } },
  category: true,
  ingredients: { include: { ingredient: true } },
} satisfies Prisma.RecipeInclude;

// Normaliza os nomes (minúsculas, sem espaços), remove repetidos
// e liga cada um ao ingrediente existente ou cria-o se for novo
function toIngredientLinks(items: IngredientInputDto[]) {
  const unique = new Map<string, IngredientInputDto>();
  for (const item of items) {
    unique.set(item.name.trim().toLowerCase(), item);
  }
  return [...unique.entries()].map(([name, item]) => ({
    quantity: item.quantity,
    ingredient: {
      connectOrCreate: { where: { name }, create: { name } },
    },
  }));
}

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRecipeDto, authorId: number) {
    const { ingredients, ...data } = dto;
    return this.prisma.recipe.create({
      data: {
        ...data,
        authorId,
        ingredients: { create: toIngredientLinks(ingredients) },
      },
      include: recipeInclude,
    });
  }

  findAll(query: QueryRecipesDto) {
    const names = (query.ingredients ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);

    return this.prisma.recipe.findMany({
      // Uma condição por ingrediente: a receita tem de cumprir todas
      where: {
        AND: names.map((name) => ({
          ingredients: {
            some: {
              ingredient: { name: { contains: name, mode: 'insensitive' } },
            },
          },
        })),
      },
      include: recipeInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: recipeInclude,
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  async update(id: number, dto: UpdateRecipeDto, user: AuthUser) {
    const recipe = await this.findOne(id);
    this.assertCanModify(recipe.authorId, user);

    const { ingredients, ...data } = dto;
    return this.prisma.recipe.update({
      where: { id },
      data: {
        ...data,
        // Se vierem ingredientes, a lista antiga é substituída pela nova
        ...(ingredients && {
          ingredients: {
            deleteMany: {},
            create: toIngredientLinks(ingredients),
          },
        }),
      },
      include: recipeInclude,
    });
  }

  async remove(id: number, user: AuthUser) {
    const recipe = await this.findOne(id);
    this.assertCanModify(recipe.authorId, user);
    return this.prisma.recipe.delete({ where: { id } });
  }

  private assertCanModify(authorId: number, user: AuthUser) {
    if (user.role !== 'ADMIN' && user.id !== authorId) {
      throw new ForbiddenException('You can only modify your own recipes');
    }
  }
}