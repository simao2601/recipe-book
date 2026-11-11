import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // "select" garante que o passwordHash nunca sai na resposta
    return this.prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash },
      select: { id: true, email: true, username: true, role: true },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const valid = user && (await bcrypt.compare(dto.password, user.passwordHash));

    // Mensagem igual nos dois casos, para não revelar se o email existe
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { accessToken };
  }
}