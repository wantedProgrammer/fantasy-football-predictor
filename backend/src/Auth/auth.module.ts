import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UserModule } from '../User/user.module';

import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GqlAuthGuard } from './gql-auth.guard';
import { JWT_SECRET } from './jwt.constants';

@Module({
  imports: [
    PassportModule,
    UserModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    JwtAuthGuard,
    GqlAuthGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    GqlAuthGuard,
  ],
})
export class AuthModule {}