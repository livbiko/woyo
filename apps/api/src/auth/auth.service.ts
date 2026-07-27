import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private issueToken(user: { id: string; email: string; role: string }) {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
  }

  private toPublicUser(user: { id: string; email: string; name: string; role: string }) {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name, phone: dto.phone },
    });

    return { accessToken: this.issueToken(user), user: this.toPublicUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { accessToken: this.issueToken(user), user: this.toPublicUser(user) };
  }

  async loginOrCreateFromGoogle(profile: { googleId: string; email: string; name: string }) {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      user =
        (await this.prisma.user.findUnique({ where: { email: profile.email } })) ??
        (await this.prisma.user.create({
          data: { email: profile.email, name: profile.name, googleId: profile.googleId },
        }));
      if (!user.googleId) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: profile.googleId } });
      }
    }
    return { accessToken: this.issueToken(user), user: this.toPublicUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }
}
