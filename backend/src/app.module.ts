import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENV_DEFAULTS } from './common/config/env-defaults.js';
import { AuthModule } from './auth/auth.module.js';
import { ChatsModule } from './chats/chats.module.js';
import { UsersModule } from './users/users.module.js';
import { Conversation } from './chats/entities/conversation.entity.js';
import { Message } from './chats/entities/message.entity.js';
import { User } from './users/entities/user.entity.js';

const isDev =
  process.env.NODE_ENV !== 'stage' && process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? ENV_DEFAULTS.DB_HOST,
        port: parseInt(process.env.DB_PORT ?? String(ENV_DEFAULTS.DB_PORT), 10),
        username: process.env.DB_USERNAME ?? ENV_DEFAULTS.DB_USERNAME,
        password: process.env.DB_PASSWORD ?? ENV_DEFAULTS.DB_PASSWORD,
        database: process.env.DB_DATABASE ?? ENV_DEFAULTS.DB_DATABASE,
        entities: [User, Conversation, Message],
        synchronize: isDev,
        logging: isDev,
        connectTimeoutMS: 5000,
        extra: { connectionTimeoutMillis: 5000 },
      }),
    }),
    UsersModule,
    AuthModule,
    ChatsModule,
  ],
})
export class AppModule {}
