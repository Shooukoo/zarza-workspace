import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from '../config/envs';

/**
 * DatabaseModule — establece la conexión con MongoDB.
 * Importar en AppModule para que la conexión esté disponible globalmente.
 */
@Module({
  imports: [
    MongooseModule.forRoot(envs.mongoUri),
  ],
})
export class DatabaseModule {}
