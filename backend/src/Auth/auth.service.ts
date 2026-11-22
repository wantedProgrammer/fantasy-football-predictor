import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../User/user.entity';
import { UserService } from '../User/user.service';

import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { LoginResponse } from './models/login-response.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(userId: number): Promise<User | null> {
    const user = await this.userService.findOne(userId);
    return user ?? null;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePasswords(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(input: RegisterInput): Promise<User> {
    const existingEmail = await this.userService.findByEmail(input.email);

    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    const existingMobile = await this.userService.findByMobile(input.mobile);

    if (existingMobile) {
      throw new BadRequestException('Mobile number already exists');
    }

    const passwordHash = await this.hashPassword(input.password);

    return this.userService.create({
      name: input.name,
      surname: input.surname,
      email: input.email,
      mobile: input.mobile,
      passwordHash,
      auditLogs: [
        {
          action: 'REGISTER',
          timestamp: new Date().toISOString(),
          details: 'User registered successfully',
        },
      ],
    });
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await this.userService.findByMobile(input.mobile);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.comparePasswords(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      mobile: user.mobile,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async me(userId: number): Promise<User> {
    return this.userService.findOne(userId);
  }

  async setFavouritePlayer(
    userId: number,
    player: string,
  ): Promise<User> {
    return this.userService.setFavouritePlayer(userId, player);
  }
}