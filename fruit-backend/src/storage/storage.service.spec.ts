import { StorageService } from './storage.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import sharp from 'sharp';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://r2.example.com/raw/test.jpg?signed=1'),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

const mockUploadDone = jest.fn().mockResolvedValue(undefined);
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({ done: mockUploadDone })),
}));

jest.mock('sharp');

jest.mock('../config/envs', () => ({
  envs: {
    r2BucketName: 'test-bucket',
    r2Endpoint: 'https://endpoint.r2.cloudflarestorage.com',
    r2AccessKeyId: 'key',
    r2SecretAccessKey: 'secret',
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  let sharpInstance: {
    metadata: jest.Mock;
    rotate: jest.Mock;
    resize: jest.Mock;
    jpeg: jest.Mock;
    toBuffer: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService();
    sharpInstance = {
      metadata: jest.fn(),
      rotate: jest.fn(),
      resize: jest.fn(),
      jpeg: jest.fn(),
      toBuffer: jest.fn(),
    };
    sharpInstance.rotate.mockReturnValue(sharpInstance);
    sharpInstance.resize.mockReturnValue(sharpInstance);
    sharpInstance.jpeg.mockReturnValue(sharpInstance);
    (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);
  });

  it('getPresignedUrl returns a signed URL string', async () => {
    const url = await service.getPresignedUrl('raw/test.jpg', 900);
    expect(typeof url).toBe('string');
    expect(url).toContain('https://');
  });

  it('getPresignedUrl calls GetObjectCommand with correct bucket and key', async () => {
    await service.getPresignedUrl('raw/test.jpg', 900);
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'raw/test.jpg',
    });
  });

  it('getPresignedUrl passes correct expiresIn to getSignedUrl', async () => {
    await service.getPresignedUrl('raw/test.jpg', 900);
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 900 },
    );
  });

  describe('downloadBuffer', () => {
    it('concatena los chunks del stream de S3 en un Buffer', async () => {
      const chunks = [Buffer.from('hola '), Buffer.from('mundo')];
      const fakeBody = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) yield chunk;
        },
      };
      (service as any).s3Client = {
        send: jest.fn().mockResolvedValue({ Body: fakeBody }),
      };

      const result = await service.downloadBuffer('models/best_v1.pt');

      expect(result).toEqual(Buffer.from('hola mundo'));
    });
  });

  describe('getOrCreateDisplayVariant', () => {
    it('reusa la original sin redimensionar si ya es más chica que maxSide', async () => {
      jest
        .spyOn(service, 'downloadBuffer')
        .mockResolvedValue(Buffer.from('img'));
      sharpInstance.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        orientation: 1,
      });

      const result = await service.getOrCreateDisplayVariant(
        'raw/small.jpg',
        2048,
      );

      expect(result).toEqual({
        key: 'raw/small.jpg',
        originalWidth: 800,
        originalHeight: 600,
      });
      expect(Upload).not.toHaveBeenCalled();
    });

    it('redimensiona y sube una variante bajo display/ si excede maxSide', async () => {
      jest
        .spyOn(service, 'downloadBuffer')
        .mockResolvedValue(Buffer.from('img'));
      sharpInstance.metadata.mockResolvedValue({
        width: 5000,
        height: 4000,
        orientation: 1,
      });
      sharpInstance.toBuffer.mockResolvedValue(Buffer.from('resized'));

      const result = await service.getOrCreateDisplayVariant(
        'raw/123-foo.jpg',
        2048,
      );

      expect(result).toEqual({
        key: 'display/123-foo.jpg',
        originalWidth: 5000,
        originalHeight: 4000,
      });
      expect(sharpInstance.rotate).toHaveBeenCalled();
      expect(sharpInstance.resize).toHaveBeenCalledWith({
        width: 2048,
        height: 2048,
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'display/123-foo.jpg',
            ContentType: 'image/jpeg',
          }),
        }),
      );
    });

    it('invierte ancho/alto cuando la orientación EXIF implica un giro de 90/270', async () => {
      jest
        .spyOn(service, 'downloadBuffer')
        .mockResolvedValue(Buffer.from('img'));
      sharpInstance.metadata.mockResolvedValue({
        width: 3000,
        height: 4000,
        orientation: 6,
      });
      sharpInstance.toBuffer.mockResolvedValue(Buffer.from('resized'));

      const result = await service.getOrCreateDisplayVariant(
        'raw/portrait.jpg',
        2048,
      );

      expect(result.originalWidth).toBe(4000);
      expect(result.originalHeight).toBe(3000);
    });
  });
});
