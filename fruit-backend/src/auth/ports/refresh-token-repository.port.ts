export const I_REFRESH_TOKEN_REPOSITORY = Symbol('I_REFRESH_TOKEN_REPOSITORY');

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface IRefreshTokenRepository {
  create(params: {
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void>;

  findByTokenHash(hash: string): Promise<RefreshTokenRecord | null>;

  revokeByTokenHash(hash: string): Promise<boolean>;

  revokeByFamilyId(familyId: string): Promise<void>;

  deleteExpired(): Promise<number>;
}
