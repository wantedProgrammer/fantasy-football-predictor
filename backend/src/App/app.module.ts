import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UserModule } from '../User/user.module';
import { AuthModule } from '../Auth/auth.module';
import { PlayersModule } from '../Players/players.module';
import { PredictorModule } from '../Predictor/predictor.module';

import { User } from '../User/user.entity';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,

      // Makes the HTTP request available to GraphQL guards
      context: ({ req }) => ({ req }),
    }),

    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'db.sqlite',
      entities: [User],
      synchronize: true,
    }),

    UserModule,
    AuthModule,
    PlayersModule,
    PredictorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}