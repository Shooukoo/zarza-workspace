import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { STORAGE_PORT } from './ports';


@Module({
  providers: [
    StorageService,
    // Bind del puerto a la implementación concreta de R2.
    // Para cambiar a otra nube: reemplazar useClass sin tocar IngestionService.
    {
      provide: STORAGE_PORT,
      useClass: StorageService,
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
