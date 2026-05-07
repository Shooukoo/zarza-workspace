import { StorageService } from './storage.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://r2.example.com/raw/test.jpg?signed=1'),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn(),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService();
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
});
